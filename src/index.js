/**
 * UI Injector - Entry Point Principal
 *
 * Auto-inicializa o dropdown de usuários no GoHighLevel
 */

import { UserDropdown } from './components/index.js';
import { fetchUsersByLocation, getLocationIdFromUrl } from './services/ghlApi.js';
import { getOpportunityId, updateOpportunityOwner } from './services/opportunityApi.js';
import { init } from './core/index.js';
import { logger } from './utils/index.js';

const ALLOWED_LOCATION_ID = 'citQs4acsN1StzOEDuvj';
const TARGET_SELECTOR = '#OpportunityOwner';
const DROPDOWN_SELECTOR = '[data-component-id^="user-dropdown"]';

let dropdownInstance = null;
let reinjectInProgress = false;
let reinjectQueued = false;
let domObserver = null;

// Cache de usuários e prefetch imediato
let usersCache = null;
let usersFetchPromise = null;

// Inicia prefetch imediatamente se estiver na location correta
function startUsersPrefetch() {
  const locationId = getLocationIdFromUrl();
  if (locationId === ALLOWED_LOCATION_ID && !usersFetchPromise) {
    logger.debug('Prefetch de usuários iniciado...');
    usersFetchPromise = fetchUsersByLocation(ALLOWED_LOCATION_ID)
      .then(users => {
        usersCache = users;
        logger.info(users.length + ' usuários pré-carregados');
        return users;
      })
      .catch(err => {
        logger.error('Erro no prefetch: ' + err.message);
        usersFetchPromise = null;
        return [];
      });
  }
  return usersFetchPromise;
}

function hasInjectedDropdown() {
  return Boolean(document.querySelector(DROPDOWN_SELECTOR));
}

/**
 * Extrai o nome do proprietário atual do elemento #OpportunityOwner
 * O elemento GHL tem uma tag com o nome do owner atual
 */
function getCurrentOwnerFromDOM(el) {
  // Busca o texto da tag de seleção dentro do elemento
  const tagContent = el.querySelector('.hr-tag__content');
  if (tagContent) {
    return tagContent.textContent?.trim() || null;
  }

  // Fallback: busca qualquer texto de seleção
  const selectedText = el.querySelector('.hr-base-selection-tag-wrapper');
  if (selectedText) {
    return selectedText.textContent?.trim() || null;
  }

  return null;
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

    // Inicializa core (não bloqueia)
    init({ debug: true, namespace: 'ui-injector' });

    // Usa cache ou prefetch já em andamento
    const usersPromise = usersCache
      ? Promise.resolve(usersCache)
      : usersFetchPromise || startUsersPrefetch();

    const elementPromise = (async () => {
      let el = document.querySelector(TARGET_SELECTOR);
      let tries = 0;
      while (!el && tries < 100) {
        await new Promise(r => setTimeout(r, 50)); // 50ms ao invés de 200ms
        el = document.querySelector(TARGET_SELECTOR);
        tries++;
      }
      return el;
    })();

    // Aguarda ambos em paralelo
    const [users, el] = await Promise.all([usersPromise, elementPromise]);

    if (!el) {
      logger.error(`Elemento ${TARGET_SELECTOR} não encontrado`);
      return;
    }

    // Extrair owner atual ANTES de esconder o elemento
    const currentOwnerName = getCurrentOwnerFromDOM(el);
    let currentOwner = null;

    if (currentOwnerName && users.length > 0) {
      // Encontra o usuário pelo nome
      currentOwner = users.find(u => u.name === currentOwnerName);
      if (currentOwner) {
        logger.debug('Owner atual detectado: ' + currentOwnerName);
      }
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

    // Define o usuário selecionado se encontrado
    if (currentOwner) {
      dropdownInstance.setState({ selectedUser: currentOwner });
    }

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
      checkAndInject();
    }
  }
}

function scheduleReinject() {
  if (reinjectInProgress) {
    reinjectQueued = true;
    return;
  }

  runReinject();
}

function checkAndInject() {
  const locationId = getLocationIdFromUrl();
  if (locationId !== ALLOWED_LOCATION_ID) {
    return; // Não está na location permitida
  }

  const ownerEl = document.querySelector(TARGET_SELECTOR);
  const hasDropdown = hasInjectedDropdown();

  if (ownerEl && !hasDropdown) {
    // Elemento apareceu, injetar dropdown
    logger.debug('Elemento #OpportunityOwner detectado, injetando dropdown...');
    scheduleReinject();
  } else if (!ownerEl && hasDropdown) {
    // Elemento sumiu, limpar
    logger.debug('Elemento #OpportunityOwner removido, limpando dropdown...');
    cleanupInjectedDropdowns();
  }
}

function startDomObserver() {
  if (domObserver) return; // Já está observando

  const locationId = getLocationIdFromUrl();
  if (locationId !== ALLOWED_LOCATION_ID) {
    logger.debug('Location não permitida, não iniciando observer');
    return;
  }

  logger.debug('Iniciando MutationObserver para detectar #OpportunityOwner...');

  domObserver = new MutationObserver(() => {
    checkAndInject();
  });

  domObserver.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Verifica imediatamente
  checkAndInject();
}

// Auto-inicia
if (typeof window !== 'undefined') {
  window.UIInjector = {
    start: startApp,
    init: startApp,
    getDropdown,
  };

  // Inicia prefetch de usuários IMEDIATAMENTE
  startUsersPrefetch();

  // Inicia observer do DOM
  startDomObserver();
}

export { startApp as start, startApp as init, getDropdown };

export default {
  start: startApp,
  init: startApp,
  getDropdown,
};
