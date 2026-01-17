/**
 * App - Módulo de inicialização integrado
 *
 * Inicializa o sistema completo:
 * 1. Busca usuários da API
 * 2. Monta o UserDropdown com os dados
 */

import { UserDropdown } from './components/index.js';
import { fetchUsersByLocation, getLocationIdFromUrl } from './services/ghlApi.js';
import { getOpportunityIdFromUrl } from './services/opportunityApi.js';
import { watchSpaRouteChanges } from './utils/spa.js';

// Location ID permitido
const ALLOWED_LOCATION_ID = 'citQs4acsN1StzOEDuvj';
const DROPDOWN_SELECTOR = '[data-component-id^="user-dropdown"]';

// Instância do dropdown
let dropdownInstance = null;
let lastOpportunityId = null;
let reinjectInProgress = false;
let reinjectQueued = false;
let initialTimerId = null;
let routeWatcherStarted = false;

/**
 * Log simples
 */
function log(msg, data) {
  console.log(`[SwitchUser] ${msg}`, data || '');
}

/**
 * Remove dropdowns anteriores que possam existir
 */
function cleanupPreviousDropdowns() {
  // Remove qualquer dropdown anterior
  const existingDropdowns = document.querySelectorAll(DROPDOWN_SELECTOR);
  existingDropdowns.forEach(el => el.parentNode?.removeChild(el));

  // Restaura o elemento original se estiver escondido
  const original = document.querySelector('#OpportunityOwner');
  if (original) {
    original.style.display = '';
  }
}

function hasInjectedDropdown() {
  return Boolean(document.querySelector(DROPDOWN_SELECTOR));
}

/**
 * Inicializa a aplicação completa
 */
export async function startApp() {
  try {
    log('Iniciando...');

    // 1. Verifica se está na location correta
    const currentLocationId = getLocationIdFromUrl();
    if (currentLocationId !== ALLOWED_LOCATION_ID) {
      log('Location não permitida:', currentLocationId);
      return null;
    }

    log('Location OK:', currentLocationId);

    // 2. Limpa dropdowns anteriores
    cleanupPreviousDropdowns();

    // 3. Busca usuários da API
    log('Buscando usuários...');
    const users = await fetchUsersByLocation(ALLOWED_LOCATION_ID);
    log('Usuários carregados:', users.length);

    if (!users || users.length === 0) {
      log('ERRO: Nenhum usuário retornado da API');
      return null;
    }

    // 4. Aguarda o elemento alvo existir
    let attempts = 0;
    let targetElement = document.querySelector('#OpportunityOwner');

    while (!targetElement && attempts < 50) {
      await new Promise(r => setTimeout(r, 200));
      targetElement = document.querySelector('#OpportunityOwner');
      attempts++;
    }

    if (!targetElement) {
      log('ERRO: Elemento #OpportunityOwner não encontrado');
      return null;
    }

    // 5. Cria o dropdown COM os usuários
    log('Criando dropdown com', users.length, 'usuários');

    dropdownInstance = new UserDropdown({
      users: users,
      targetSelector: '#OpportunityOwner',
      allowedLocationId: ALLOWED_LOCATION_ID,
    });

    // 6. Escuta seleção
    dropdownInstance.on('user:selected', (user) => {
      log('Selecionado:', user.name);
    });

    // 7. Monta
    await dropdownInstance.mountReplacing();

    log('Pronto! Dropdown montado com', dropdownInstance.state.users.length, 'usuários');

    return { dropdown: dropdownInstance, users };
  } catch (error) {
    log('ERRO:', error.message);
    console.error(error);
    throw error;
  }
}

export const start = startApp;
export const init = startApp;

async function runReinject() {
  reinjectInProgress = true;
  try {
    await startApp();
  } catch (error) {
    log('ERRO ao reinjetar:', error.message);
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
    cleanupPreviousDropdowns();
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

/**
 * Obtém a instância do dropdown
 */
export function getDropdown() {
  return dropdownInstance;
}

// Auto-inicialização
if (typeof window !== 'undefined') {
  window.SwitchUser = {
    start: startApp,
    init: startApp,
    startApp,
    getDropdown,
  };

  // Aguarda um pouco para o GHL carregar
  startRouteWatcher();
  scheduleInitialInjection();
}

export default {
  startApp,
  start: startApp,
  init: startApp,
  getDropdown,
};
