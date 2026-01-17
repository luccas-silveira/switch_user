/**
 * UI Injector - Entry Point Principal
 *
 * Auto-inicializa o dropdown de usuários no GoHighLevel
 */

import { UserDropdown } from './components/index.js';
import { fetchUsersByLocation, getLocationIdFromUrl } from './services/ghlApi.js';
import { getOpportunityId, getOpportunityIdFromUrl, updateOpportunityOwner } from './services/opportunityApi.js';
import { init } from './core/index.js';
import { logger, watchSpaRouteChanges } from './utils/index.js';

const ALLOWED_LOCATION_ID = 'citQs4acsN1StzOEDuvj';
const TARGET_SELECTOR = '#OpportunityOwner';
const DROPDOWN_SELECTOR = '[data-component-id^="user-dropdown"]';

let dropdownInstance = null;
let lastOpportunityId = null;
let reinjectInProgress = false;
let reinjectQueued = false;
let initialTimerId = null;
let routeWatcherStarted = false;

function hasInjectedDropdown() {
  return Boolean(document.querySelector(DROPDOWN_SELECTOR));
}

function cleanupInjectedDropdowns() {
  document.querySelectorAll(DROPDOWN_SELECTOR).forEach(el => el.remove());
  const original = document.querySelector(TARGET_SELECTOR);
  if (original) {
    original.style.display = '';
  }
}

function getDropdown() {
  return dropdownInstance;
}

async function startApp() {
  try {
    logger.info('Iniciando Switch User...');

    // Verifica location
    const locationId = getLocationIdFromUrl();
    if (locationId !== ALLOWED_LOCATION_ID) {
      logger.debug('Location não permitida: ' + locationId);
      return;
    }

    // Inicializa core
    await init({ debug: true, namespace: 'ui-injector' });

    // Busca usuários
    logger.debug('Buscando usuários da API...');
    const users = await fetchUsersByLocation(ALLOWED_LOCATION_ID);
    logger.info(users.length + ' usuários carregados');

    // Aguarda elemento
    let el = document.querySelector(TARGET_SELECTOR);
    let tries = 0;
    while (!el && tries < 50) {
      await new Promise(r => setTimeout(r, 200));
      el = document.querySelector(TARGET_SELECTOR);
      tries++;
    }

    if (!el) {
      logger.error(`Elemento ${TARGET_SELECTOR} não encontrado`);
      return;
    }

    // Remove dropdowns anteriores
    document.querySelectorAll(DROPDOWN_SELECTOR).forEach(e => e.remove());
    el.style.display = '';

    // Cria dropdown
    dropdownInstance = new UserDropdown({
      users: users,
      targetSelector: TARGET_SELECTOR,
      allowedLocationId: ALLOWED_LOCATION_ID,
    });

    dropdownInstance.on('user:selected', async (user) => {
      const opportunityId = getOpportunityId();
      if (!opportunityId) {
        logger.error('Opportunity ID não encontrado');
        return;
      }

      logger.info('Atualizando owner para: ' + user.name);

      try {
        const result = await updateOpportunityOwner(opportunityId, user.id);
        if (result.ok) {
          logger.info('Owner atualizado com sucesso');
        } else {
          logger.error('Falha ao atualizar: ' + JSON.stringify(result.data));
        }
      } catch (err) {
        logger.error('Erro ao atualizar owner: ' + err.message);
      }
    });

    await dropdownInstance.mountReplacing();
    logger.info('Dropdown montado com ' + users.length + ' usuários');

  } catch (err) {
    logger.error('Erro: ' + err.message);
    console.error(err);
  }
}

async function runReinject() {
  reinjectInProgress = true;
  try {
    await startApp();
  } finally {
    reinjectInProgress = false;
    if (reinjectQueued) {
      reinjectQueued = false;
      handleRouteChange();
    }
  }
}

function scheduleReinject() {
  if (initialTimerId) {
    clearTimeout(initialTimerId);
    initialTimerId = null;
  }

  if (reinjectInProgress) {
    reinjectQueued = true;
    return;
  }

  runReinject();
}

function handleRouteChange() {
  const locationId = getLocationIdFromUrl();
  const opportunityId = getOpportunityIdFromUrl();

  if (locationId !== ALLOWED_LOCATION_ID || !opportunityId) {
    cleanupInjectedDropdowns();
    lastOpportunityId = opportunityId;
    return;
  }

  const opportunityChanged = opportunityId !== lastOpportunityId;
  if (opportunityChanged) {
    lastOpportunityId = opportunityId;
  }

  if (opportunityChanged || !hasInjectedDropdown()) {
    scheduleReinject();
  }
}

function scheduleInitialInjection() {
  if (initialTimerId) return;
  initialTimerId = setTimeout(() => {
    initialTimerId = null;
    handleRouteChange();
  }, 1000);
}

function startRouteWatcher() {
  if (routeWatcherStarted) return;
  routeWatcherStarted = true;
  watchSpaRouteChanges(() => {
    handleRouteChange();
  }, { pollInterval: 1000 });
}

// Auto-inicia
if (typeof window !== 'undefined') {
  window.UIInjector = {
    start: startApp,
    init: startApp,
    getDropdown,
  };
  startRouteWatcher();
  scheduleInitialInjection();
}

export { startApp as start, startApp as init, getDropdown };

export default {
  start: startApp,
  init: startApp,
  getDropdown,
};
