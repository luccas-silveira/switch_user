/**
 * Switch User — Entry Point
 *
 * Injeta dropdown de owner do contato no header de conversas do GHL.
 * Usa PUT /contacts/{id} (assignedTo) — sem resets server-side.
 */

import { UserDropdown } from './components/UserDropdown.js';
import { fetchUsersByLocation } from './services/ghlApi.js';
import { fetchConversationById } from './services/conversationApi.js';
import { fetchContactById, updateContactOwner } from './services/contactApi.js';
import { waitForElement } from './utils/dom.js';
import logger from './utils/logger.js';

// ─── Configuração ──────────────────────────────────────────────────────────────

const CONFIG = {
  allowedLocationId: 'citQs4acsN1StzOEDuvj',
};

const WRAPPER_ID = 'zoi-owner-wrapper';

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

// ─── Estado ───────────────────────────────────────────────────────────────────

let lastConversationId = null;
let dropdownInstance = null;
let isHandlingRoute = false;
let pendingHandleRoute = false;

// ─── Utilitários ──────────────────────────────────────────────────────────────

function cleanupDropdown() {
  const existing = document.getElementById(WRAPPER_ID);
  if (existing) existing.remove();
  if (dropdownInstance) {
    dropdownInstance._unbindEvents();
    dropdownInstance = null;
  }
}

async function getAllowedLocationId() {
  if (!window.AppUtils?.Utilities?.getCurrentLocation) return null;
  try {
    const loc = await window.AppUtils.Utilities.getCurrentLocation();
    return loc?.id || null;
  } catch (err) {
    logger.error('Erro ao obter location: ' + err.message);
    return null;
  }
}

function getConversationId() {
  try {
    const route = window.AppUtils?.RouteHelper?.getCurrentRoute?.();
    return route?.params?.conversation_id || null;
  } catch (_) {
    return null;
  }
}

function getDirectContactId() {
  try {
    // Tenta via route helper (página de detalhe de contato)
    const route = window.AppUtils?.RouteHelper?.getCurrentRoute?.();
    const params = route?.params || {};
    if (params.id && typeof params.id === 'string' && params.id.length > 10) return params.id;
    if (params.contactId) return params.contactId;
  } catch (_) {}
  // Fallback: extrai do path da URL — /contacts/detail/{id}
  const m = window.location.pathname.match(/\/contacts\/detail\/([a-zA-Z0-9_-]{10,})/);
  return m ? m[1] : null;
}

// ─── Injeção ──────────────────────────────────────────────────────────────────

async function inject(conversationId, contactId, currentAssignedTo, users) {
  // Aguarda o elemento âncora do header
  let nameEl;
  try {
    nameEl = await waitForElement('[data-testid="CENTRALPANEL_NAME"]', { timeout: 5000 });
  } catch (_) {
    logger.error('Header de conversa não encontrado em 5s');
    return;
  }

  // Encontra o cabeçalho flex e seu lado direito
  const header = nameEl.closest('.flex.justify-between');
  if (!header) {
    logger.error('Container do header não encontrado');
    return;
  }
  const rightSide = header.children[header.children.length - 1];
  if (!rightSide) {
    logger.error('Lado direito do header não encontrado');
    return;
  }

  // Remove wrapper anterior se existir
  cleanupDropdown();

  // Cria wrapper e injeta no início do lado direito
  const wrapper = document.createElement('div');
  wrapper.id = WRAPPER_ID;
  wrapper.style.cssText = 'display:flex;align-items:center;';
  rightSide.prepend(wrapper);

  // Cria e monta o dropdown
  dropdownInstance = new UserDropdown({ users, allowedLocationId: CONFIG.allowedLocationId });

  // Pré-seleciona o owner atual
  if (currentAssignedTo) {
    const currentUser = users.find(u => u.id === currentAssignedTo);
    if (currentUser) {
      dropdownInstance.setState({ selectedUser: currentUser });
    }
  }

  dropdownInstance.on('user:selected', async (selectedUser) => {
    try {
      const result = await updateContactOwner(contactId, selectedUser.id);
      if (!result.ok) {
        logger.error('Falha ao atualizar owner do contato. Status: ' + result.status);
        return;
      }
      logger.info('Owner do contato atualizado: ' + selectedUser.name);
    } catch (err) {
      logger.error('Erro ao atualizar owner do contato: ' + err.message);
    }
  });

  dropdownInstance.mountInto(wrapper);
  logger.info(`Dropdown injetado no header (contexto: ${conversationId}, contato: ${contactId})`);
}

// ─── Handler de rota ──────────────────────────────────────────────────────────

async function handleRoute() {
  if (isHandlingRoute) {
    pendingHandleRoute = true;
    return;
  }
  isHandlingRoute = true;
  pendingHandleRoute = false;
  try {
    // 1. Valida location
    const locationId = await getAllowedLocationId();
    if (!locationId || locationId !== CONFIG.allowedLocationId) {
      cleanupDropdown();
      lastConversationId = null;
      return;
    }

    // 2. Determina contexto: conversa ou detalhe de contato
    const conversationId = getConversationId();
    const directContactId = conversationId ? null : getDirectContactId();

    if (!conversationId && !directContactId) {
      cleanupDropdown();
      lastConversationId = null;
      return;
    }

    // 3. Evita reinjeção desnecessária
    const contextKey = conversationId || ('contact:' + directContactId);
    if (contextKey === lastConversationId && document.getElementById(WRAPPER_ID)) return;
    lastConversationId = contextKey;

    try {
      // 4. Resolve o contactId
      let contactId;
      if (conversationId) {
        const convResult = await fetchConversationById(conversationId);
        if (!convResult.ok) {
          logger.error(`GET /conversations/${conversationId} falhou: ${convResult.status}`);
          return;
        }
        contactId = convResult.data?.conversation?.contactId
          || convResult.data?.contactId
          || null;
        if (!contactId) {
          logger.error('contactId não encontrado na resposta da conversa');
          return;
        }
      } else {
        contactId = directContactId;
      }

      // 5. Busca owner atual do contato
      const contactResult = await fetchContactById(contactId);
      const currentAssignedTo = contactResult.ok
        ? (contactResult.data?.contact?.assignedTo || contactResult.data?.assignedTo || null)
        : null;

      // 6. Busca usuários (cache ou API)
      const users = await getUsers();
      if (users.length === 0) {
        logger.warn('Lista de usuários vazia — dropdown não injetado');
        return;
      }

      // 7. Injeta o dropdown
      await inject(contextKey, contactId, currentAssignedTo, users);
    } catch (err) {
      logger.error('Erro em handleRoute: ' + err.message);
    }
  } finally {
    isHandlingRoute = false;
    if (pendingHandleRoute) {
      pendingHandleRoute = false;
      setTimeout(handleRoute, 0);
    }
  }
}

// ─── Auto-inicialização ────────────────────────────────────────────────────────

if (typeof window !== 'undefined') {
  window.SwitchUser = {
    start: handleRoute,
    getDropdown: () => dropdownInstance,
    setConfig: (cfg) => Object.assign(CONFIG, cfg),
  };

  startUsersPrefetch();

  // Delay de 100ms para GHL atualizar os params de rota antes de ler
  window.addEventListener('routeLoaded', () => setTimeout(handleRoute, 100));
  window.addEventListener('routeChangeEvent', () => setTimeout(handleRoute, 100));

  // Poller de fallback: reinjecta se o wrapper sumiu (GHL re-renderiza o painel
  // sem disparar eventos de rota em algumas navegações)
  setInterval(() => {
    if (isHandlingRoute || pendingHandleRoute) return;
    if (!document.getElementById(WRAPPER_ID) && document.querySelector('[data-testid="CENTRALPANEL_NAME"]')) {
      handleRoute();
    }
  }, 800);

  handleRoute();
}

export { handleRoute as start, handleRoute as init };
export default { start: handleRoute, init: handleRoute };
