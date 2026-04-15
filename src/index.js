/**
 * Switch User — Entry Point
 *
 * Injeta dropdown customizado de owner em páginas de oportunidades do GHL.
 * Usa as APIs oficiais AppUtils para detecção de rota e validação de location.
 */

import { UserDropdown } from './components/UserDropdown.js';
import { fetchUsersByLocation } from './services/ghlApi.js';
import { updateOpportunityOwner, getOpportunityContactId, addOpportunityFollower } from './services/opportunityApi.js';
import { addContactFollower } from './services/contactApi.js';
import { waitForElement } from './utils/dom.js';
import logger from './utils/logger.js';

// ─── Configuração ──────────────────────────────────────────────────────────────

const CONFIG = {
  allowedLocationId: 'citQs4acsN1StzOEDuvj',
  followerOnOwnerChangeFrom: 'Daiane Bayer', // null desativa a regra
};

const TARGET_SELECTOR = '#OpportunityOwner';
const DROPDOWN_SELECTOR = '[data-component-id^="user-dropdown"]';

// ─── Cache de usuários ─────────────────────────────────────────────────────────

let usersCache = null;
let usersFetchPromise = null;

function startUsersPrefetch() {
  if (usersFetchPromise) return usersFetchPromise;
  usersFetchPromise = fetchUsersByLocation(CONFIG.allowedLocationId)
    .then(users => {
      usersCache = users;
      logger.info(`${users.length} usuários pré-carregados`);
      return users;
    })
    .catch(err => {
      logger.error('Erro no prefetch: ' + err.message);
      usersFetchPromise = null;
      return [];
    });
  return usersFetchPromise;
}

function getUsers() {
  return usersCache ? Promise.resolve(usersCache) : startUsersPrefetch();
}

// ─── Estado de injeção ─────────────────────────────────────────────────────────

let dropdownInstance = null;
let lastOpportunityId = null;
let reinjectInProgress = false;
let reinjectQueued = false;

// ─── Utilitários DOM ───────────────────────────────────────────────────────────

function cleanupDropdowns() {
  document.querySelectorAll(DROPDOWN_SELECTOR).forEach(el => el.remove());
  const original = document.querySelector(TARGET_SELECTOR);
  if (original) original.style.display = '';
  dropdownInstance = null;
}

function hasDropdown() {
  return Boolean(document.querySelector(DROPDOWN_SELECTOR));
}

function getOwnerNameFromElement(el) {
  if (!el) return null;
  const tagContent = el.querySelector('.hr-tag__content, .n-tag__content');
  if (tagContent) return tagContent.textContent?.trim() || null;
  const selectionTag = el.querySelector('.hr-base-selection-tag-wrapper, .n-base-selection-tag-wrapper');
  if (selectionTag) return selectionTag.textContent?.trim() || null;
  const placeholder = el.querySelector('.hr-base-selection-placeholder__inner, .n-base-selection-placeholder__inner');
  if (placeholder) return null;
  return el.textContent?.trim() || null;
}

function getOpportunityIdFromPath(path) {
  if (!path) return null;
  const m1 = path.match(/\/opportunities\/list\/([^\/\?]+)/);
  if (m1) return m1[1];
  const m2 = path.match(/\/opportunities\/([^\/\?]+)/);
  if (m2 && m2[1] !== 'list') return m2[1];
  return null;
}

// ─── Validação de rota via AppUtils ───────────────────────────────────────────

async function validateRoute() {
  if (!window.AppUtils?.Utilities?.getCurrentLocation) {
    logger.debug('AppUtils ainda não disponível');
    return null;
  }

  let location;
  try {
    location = await window.AppUtils.Utilities.getCurrentLocation();
  } catch (err) {
    logger.error('Erro ao obter location: ' + err.message);
    return null;
  }

  if (!location?.id || location.id !== CONFIG.allowedLocationId) {
    return null;
  }

  const route = window.AppUtils.RouteHelper.getCurrentRoute();
  const opportunityId = getOpportunityIdFromPath(route?.path);

  if (!opportunityId) return null;

  return { locationId: location.id, opportunityId };
}

// ─── Regra da seguidora ────────────────────────────────────────────────────────

async function applyFollowerRule(opportunityId, users) {
  const followerUser = users.find(u => u.name === CONFIG.followerOnOwnerChangeFrom);
  if (!followerUser) {
    logger.warn(`Usuário "${CONFIG.followerOnOwnerChangeFrom}" não encontrado na lista`);
    return;
  }

  logger.info('Aguardando 1.5s antes de adicionar seguidora...');
  await new Promise(resolve => setTimeout(resolve, 1500));

  const oppResult = await addOpportunityFollower(opportunityId, followerUser.id);
  if (oppResult.ok) {
    logger.info(`${CONFIG.followerOnOwnerChangeFrom} adicionada como seguidora da oportunidade`);
  } else {
    logger.error('Falha ao adicionar seguidora na oportunidade. Status: ' + oppResult.status);
  }

  const contactId = await getOpportunityContactId(opportunityId);
  if (!contactId) {
    logger.warn('Contact ID não encontrado; seguidora não adicionada ao contato');
    return;
  }

  const contactResult = await addContactFollower(contactId, followerUser.id);
  if (contactResult.ok) {
    logger.info(`${CONFIG.followerOnOwnerChangeFrom} adicionada como seguidora do contato`);
  } else {
    logger.error('Falha ao adicionar seguidora no contato. Status: ' + contactResult.status);
  }
}

// ─── Injeção do dropdown ───────────────────────────────────────────────────────

async function inject(opportunityId, users) {
  const el = await waitForElement(TARGET_SELECTOR, { timeout: 5000 });
  if (!el) {
    logger.error(`${TARGET_SELECTOR} não encontrado após 5s`);
    return;
  }

  // Lê owner atual ANTES de fazer cleanup (o cleanup não altera o conteúdo do elemento)
  let currentOwnerName = getOwnerNameFromElement(el);
  const currentOwner = currentOwnerName
    ? (users.find(u => u.name === currentOwnerName) || { id: null, name: currentOwnerName })
    : null;

  cleanupDropdowns();

  dropdownInstance = new UserDropdown({
    users,
    targetSelector: TARGET_SELECTOR,
    allowedLocationId: CONFIG.allowedLocationId,
  });

  if (currentOwner) {
    dropdownInstance.setState({ selectedUser: currentOwner });
  }

  dropdownInstance.on('user:selected', async (selectedUser) => {
    const previousOwnerName = currentOwnerName;

    try {
      const result = await updateOpportunityOwner(opportunityId, selectedUser.id);
      if (!result.ok) {
        logger.error('Falha ao atualizar owner. Status: ' + result.status);
        return;
      }
      logger.info('Owner atualizado: ' + selectedUser.name);
      currentOwnerName = selectedUser.name;

      if (
        CONFIG.followerOnOwnerChangeFrom &&
        previousOwnerName === CONFIG.followerOnOwnerChangeFrom &&
        selectedUser.name !== CONFIG.followerOnOwnerChangeFrom
      ) {
        await applyFollowerRule(opportunityId, users);
      }
    } catch (err) {
      logger.error('Erro ao atualizar owner: ' + err.message);
    }
  });

  await dropdownInstance.mountReplacing();
  logger.info(`Dropdown montado com ${users.length} usuários`);
}

// ─── Controle de reinjeção ─────────────────────────────────────────────────────

async function runReinject(opportunityId) {
  reinjectInProgress = true;
  try {
    const users = await getUsers();
    await inject(opportunityId, users);
  } catch (err) {
    logger.error('Erro ao reinjetar: ' + err.message);
  } finally {
    reinjectInProgress = false;
    if (reinjectQueued) {
      reinjectQueued = false;
      handleRoute();
    }
  }
}

function scheduleReinject(opportunityId) {
  if (reinjectInProgress) {
    reinjectQueued = true;
    return;
  }
  runReinject(opportunityId);
}

// ─── Save interceptor ──────────────────────────────────────────────────────────
//
// O GHL reverte a alteração de owner ao clicar em Save/Atualizar. Esse handler
// captura o clique no botão e re-aplica o owner via API após 1.5s.

let saveInterceptorActive = false;

function startSaveInterceptor() {
  if (saveInterceptorActive) return;
  saveInterceptorActive = true;

  document.addEventListener('click', (event) => {
    const btn = event.target.closest('button, [role="button"]');
    if (!btn) return;

    const text = btn.textContent?.trim().toLowerCase() || '';
    const isSaveBtn = text === 'save' || text === 'salvar' ||
      text === 'update' || text === 'atualizar' ||
      btn.id?.toLowerCase().includes('save') ||
      btn.classList.contains('save-btn') ||
      btn.getAttribute('data-testid')?.includes('save');

    if (!isSaveBtn || !dropdownInstance) return;

    const selectedUser = dropdownInstance.state?.selectedUser;
    if (!selectedUser || !selectedUser.id) return;
    if (!lastOpportunityId) return;

    const oppId = lastOpportunityId;
    setTimeout(async () => {
      try {
        const result = await updateOpportunityOwner(oppId, selectedUser.id);
        if (result.ok) {
          logger.info('Owner re-aplicado após save: ' + selectedUser.name);
        }
      } catch (err) {
        logger.error('Erro ao re-aplicar owner após save: ' + err.message);
      }
    }, 1500);
  }, true); // capture phase pra pegar antes do GHL
}

// ─── DOM observer ──────────────────────────────────────────────────────────────
//
// Fallback: casos em que #OpportunityOwner aparece/some sem disparar um evento
// de rota (ex: abrir/fechar painel lateral de oportunidade dentro da mesma URL).

let domObserver = null;

function startDomObserver() {
  if (domObserver) return;
  domObserver = new MutationObserver(() => {
    if (reinjectInProgress) return;
    const ownerEl = document.querySelector(TARGET_SELECTOR);
    const injected = hasDropdown();
    if (ownerEl && !injected) {
      handleRoute();
    } else if (!ownerEl && injected) {
      cleanupDropdowns();
      lastOpportunityId = null;
    }
  });
  domObserver.observe(document.body, { childList: true, subtree: true });
}

// ─── Handler de rota ───────────────────────────────────────────────────────────

async function handleRoute() {
  const routeData = await validateRoute();

  if (!routeData) {
    if (hasDropdown()) cleanupDropdowns();
    lastOpportunityId = null;
    return;
  }

  const { opportunityId } = routeData;

  if (opportunityId === lastOpportunityId && hasDropdown()) return;

  lastOpportunityId = opportunityId;
  scheduleReinject(opportunityId);
}

// ─── Auto-inicialização ────────────────────────────────────────────────────────

if (typeof window !== 'undefined') {
  // Shim: código custom do GHL pode chamar manageGhlUiOverrides — evita crash
  if (typeof window.manageGhlUiOverrides !== 'function') {
    window.manageGhlUiOverrides = () => {};
  }

  window.SwitchUser = {
    start: handleRoute,
    getDropdown: () => dropdownInstance,
    setConfig: (cfg) => Object.assign(CONFIG, cfg),
  };

  // Prefetch imediato — usuários carregam enquanto o DOM ainda está renderizando
  startUsersPrefetch();

  // Escuta eventos nativos de navegação SPA do GHL
  window.addEventListener('routeLoaded', handleRoute);
  window.addEventListener('routeChangeEvent', handleRoute);

  // Fallbacks e interceptadores de UI
  startDomObserver();
  startSaveInterceptor();

  // Verificação inicial — caso routeLoaded já tenha disparado antes do registro
  handleRoute();
}

export { handleRoute as start, handleRoute as init };
export default { start: handleRoute, init: handleRoute };
