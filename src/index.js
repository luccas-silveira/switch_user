/**
 * Switch User — Entry Point
 *
 * Injeta dropdown customizado de owner em páginas de oportunidades do GHL.
 * Usa as APIs oficiais AppUtils para detecção de rota e validação de location.
 */

import { UserDropdown } from './components/UserDropdown.js';
import { fetchUsersByLocation } from './services/ghlApi.js';
import { updateOpportunityOwner, fetchOpportunityById, getOpportunityContactId, addOpportunityFollower } from './services/opportunityApi.js';
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
  // Multi-select view (painel lateral de oportunidade)
  const tagContent = el.querySelector('.hr-tag__content, .n-tag__content');
  if (tagContent) return tagContent.textContent?.trim() || null;
  const selectionTag = el.querySelector('.hr-base-selection-tag-wrapper, .n-base-selection-tag-wrapper');
  if (selectionTag) return selectionTag.textContent?.trim() || null;
  // Single-select view (modal de oportunidade a partir de conversas/contatos)
  const labelRender = el.querySelector('.hr-base-selection-label__render-label, .n-base-selection-label__render-label');
  if (labelRender) {
    const overlay = labelRender.querySelector('.hr-base-selection-overlay__wrapper, .n-base-selection-overlay__wrapper');
    const text = (overlay || labelRender).textContent?.trim();
    if (text) return text;
  }
  // Placeholder = sem seleção
  const placeholder = el.querySelector('.hr-base-selection-placeholder__inner, .n-base-selection-placeholder__inner');
  if (placeholder) return null;
  return el.textContent?.trim() || null;
}

// ─── Captura de opportunityId ──────────────────────────────────────────────────
//
// O opportunityId nem sempre está no path da URL do GHL. Em views como o modal
// de oportunidade aberto dentro de uma conversa, o path referencia o conversationId.
// Para contornar isso, interceptamos requisições HTTP do GHL que carregam os dados
// da oportunidade — a URL delas contém o ID.

let capturedOpportunityId = null;
let suppressInterceptor = false;
// Rotas /opportunities/{algo} que NÃO são IDs de oportunidade
const OPP_RESERVED_SEGMENTS = new Set(['list', 'search', 'bulk', 'import', 'export', 'pipelines']);

function extractOpportunityIdFromUrl(url) {
  if (typeof url !== 'string' || !url) return null;
  const match = url.match(/\/opportunities\/([a-zA-Z0-9_-]+)(?=\/|$|\?|#)/);
  if (!match) return null;
  const segment = match[1];
  if (OPP_RESERVED_SEGMENTS.has(segment)) return null;
  // IDs reais do GHL têm 20+ caracteres alfanuméricos — rejeita segmentos curtos/ruído
  if (segment.length < 15) return null;
  return segment;
}

/**
 * Marca as chamadas feitas dentro do callback como "nossas" para que o
 * interceptor não as trate como saves do GHL (evita loop).
 */
async function withSuppressedInterceptor(fn) {
  suppressInterceptor = true;
  try {
    return await fn();
  } finally {
    // Pequeno delay para garantir que a requisição foi enfileirada
    await new Promise(r => setTimeout(r, 50));
    suppressInterceptor = false;
  }
}

// ─── Garantia de persistência do owner ────────────────────────────────────────
//
// Algum processo server-side do GHL (não identificado — garantidamente não é
// workflow) reverte o assignedTo ~3s após o update. A estratégia é fazer polling:
// após o PUT inicial, aguardar, fazer GET para confirmar, re-aplicar se revertido,
// repetir até N tentativas. Usa um job-id monotônico para cancelar jobs obsoletos
// quando o usuário muda de opportunity ou seleciona outro owner.

let ownerEnsureJobId = 0;
const ENSURE_DELAY_MS = 2000;
const ENSURE_MAX_ATTEMPTS = 6;

async function ensureOwnerSticks(oppId, targetUserId, sourceLabel = 'user:selected') {
  const myJobId = ++ownerEnsureJobId;
  if (!oppId || !targetUserId) return;

  for (let attempt = 1; attempt <= ENSURE_MAX_ATTEMPTS; attempt++) {
    await new Promise(r => setTimeout(r, ENSURE_DELAY_MS));

    // Cancela se um job mais novo assumiu, ou o contexto saiu debaixo dos pés
    if (myJobId !== ownerEnsureJobId) {
      logger.debug(`ensureOwnerSticks[${sourceLabel}]: superseded, aborting`);
      return;
    }
    if (oppId !== lastOpportunityId) {
      logger.debug(`ensureOwnerSticks[${sourceLabel}]: opportunity changed, aborting`);
      return;
    }
    if (dropdownInstance?.state?.selectedUser?.id &&
        dropdownInstance.state.selectedUser.id !== targetUserId) {
      logger.debug(`ensureOwnerSticks[${sourceLabel}]: user selected another owner, aborting`);
      return;
    }

    try {
      // GET para saber o estado atual do backend
      let current;
      await withSuppressedInterceptor(async () => {
        current = await fetchOpportunityById(oppId);
      });
      if (!current?.ok) {
        logger.error(`ensureOwnerSticks[${sourceLabel}]: GET falhou status=${current?.status}`);
        continue;
      }
      const actual = current.data?.opportunity?.assignedTo
        ?? current.data?.opportunity?.assigned_to
        ?? null;
      if (actual === targetUserId) {
        logger.info(`Owner confirmado persistente após ${attempt} verificação(ões) [${sourceLabel}]`);
        return;
      }
      logger.warn(`Owner revertido (esperado=${targetUserId}, atual=${actual}). Reaplicando [${sourceLabel}] tentativa ${attempt}/${ENSURE_MAX_ATTEMPTS}`);
      await withSuppressedInterceptor(async () => {
        const result = await updateOpportunityOwner(oppId, targetUserId);
        if (!result.ok) {
          logger.error(`Reapply PUT falhou. Status: ${result.status}`);
        }
      });
    } catch (err) {
      logger.error(`ensureOwnerSticks[${sourceLabel}] erro: ${err.message}`);
    }
  }
  logger.error(`Owner não persistiu após ${ENSURE_MAX_ATTEMPTS} tentativas [${sourceLabel}]`);
}

/**
 * Re-aplica o owner após um save do GHL. Delega para ensureOwnerSticks que
 * faz o trabalho de polling + retry.
 */
function reapplyOwnerAfterSave(oppId, selectedUser, sourceLabel = 'save') {
  if (!oppId || !selectedUser?.id) return;
  ensureOwnerSticks(oppId, selectedUser.id, sourceLabel).catch(err =>
    logger.error(`reapplyOwnerAfterSave erro: ${err.message}`)
  );
}

function startNetworkInterceptor() {
  // fetch
  if (typeof window.fetch === 'function' && !window.fetch.__switchUserPatched) {
    const origFetch = window.fetch.bind(window);
    const patched = function(input, init) {
      // Chamada "nossa" — bypass total
      if (suppressInterceptor) return origFetch(input, init);

      let url = '';
      let method = 'GET';
      try {
        url = typeof input === 'string' ? input : (input?.url || '');
        method = (init?.method || (typeof input === 'object' ? input?.method : null) || 'GET').toUpperCase();
      } catch (_) { /* never break the host page */ }

      const id = extractOpportunityIdFromUrl(url);
      if (id) capturedOpportunityId = id;

      const responsePromise = origFetch(input, init);

      // Detecta save de oportunidade do GHL (PUT/POST no endpoint)
      // e reagenda o owner após a resposta voltar.
      if (id && (method === 'PUT' || method === 'POST') && dropdownInstance?.state?.selectedUser?.id) {
        const capturedUser = { ...dropdownInstance.state.selectedUser };
        const capturedOppId = id;
        responsePromise.then(() => {
          // Pequeno delay para garantir que o GHL terminou de propagar o save
          setTimeout(() => reapplyOwnerAfterSave(capturedOppId, capturedUser, 'GHL save (network)'), 400);
        }).catch(() => {});
      }

      return responsePromise;
    };
    patched.__switchUserPatched = true;
    window.fetch = patched;
  }

  // XHR (só captura de ID — GHL tipicamente usa fetch para saves)
  if (XMLHttpRequest?.prototype?.open && !XMLHttpRequest.prototype.open.__switchUserPatched) {
    const origOpen = XMLHttpRequest.prototype.open;
    const patchedOpen = function(method, url, ...rest) {
      try {
        if (typeof url === 'string') {
          const id = extractOpportunityIdFromUrl(url);
          if (id) capturedOpportunityId = id;
        }
      } catch (_) { /* never break the host page */ }
      return origOpen.call(this, method, url, ...rest);
    };
    patchedOpen.__switchUserPatched = true;
    XMLHttpRequest.prototype.open = patchedOpen;
  }
}

function getOpportunityIdFromPath() {
  const route = window.AppUtils?.RouteHelper?.getCurrentRoute?.();
  const path = route?.path || '';
  const m1 = path.match(/\/opportunities\/list\/([^\/\?]+)/);
  if (m1) return m1[1];
  const m2 = path.match(/\/opportunities\/([^\/\?]+)/);
  if (m2 && m2[1] !== 'list') return m2[1];
  return null;
}

function getCurrentOpportunityId() {
  // Prioridade 1: path URL (views tradicionais de oportunidade)
  const fromPath = getOpportunityIdFromPath();
  if (fromPath) return fromPath;
  // Prioridade 2: capturado via interceptação de rede
  return capturedOpportunityId;
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
      await withSuppressedInterceptor(async () => {
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
      });

      // Fire-and-forget: inicia job de polling que verifica se o owner
      // persistiu no backend e re-aplica se algo reverter. Não bloqueia o
      // handler — roda em background e é cancelado automaticamente se o
      // usuário trocar de owner ou de oportunidade.
      ensureOwnerSticks(opportunityId, selectedUser.id, 'user:selected').catch(err =>
        logger.error('ensureOwnerSticks erro: ' + err.message)
      );
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

    // Detecção permissiva: inclui texto que começa ou contém as variações
    const text = btn.textContent?.trim().toLowerCase() || '';
    const looksLikeSave =
      /^(save|salvar|update|atualizar)(\s|$|\b)/.test(text) ||
      text.includes('save changes') ||
      text.includes('salvar altera') ||
      btn.id?.toLowerCase().includes('save') ||
      btn.classList?.toString().toLowerCase().includes('save') ||
      (btn.getAttribute && btn.getAttribute('data-testid')?.toLowerCase().includes('save'));

    if (!looksLikeSave || !dropdownInstance) return;

    const selectedUser = dropdownInstance.state?.selectedUser;
    if (!selectedUser?.id) return;
    if (!lastOpportunityId) return;

    // Captura oppId e selectedUser via closure — dropdown pode ser desmontado
    // antes do setTimeout disparar (modal fecha logo após o save).
    const oppId = lastOpportunityId;
    const capturedUser = { ...selectedUser };
    setTimeout(() => reapplyOwnerAfterSave(oppId, capturedUser, 'GHL save (click)'), 1500);
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

// ─── Handler de rota (DOM-driven) ──────────────────────────────────────────────
//
// Estratégia: validar a location e verificar a presença de #OpportunityOwner no
// DOM. O opportunityId é extraído em múltiplas fontes (path URL + captura de
// rede). Esse handler é chamado tanto por routeLoaded/routeChangeEvent quanto
// pelo MutationObserver.

async function handleRoute() {
  // 1. Valida location via AppUtils
  const locationId = await getAllowedLocationId();
  if (!locationId || locationId !== CONFIG.allowedLocationId) {
    if (hasDropdown()) cleanupDropdowns();
    lastOpportunityId = null;
    return;
  }

  // 2. Elemento target precisa existir no DOM
  const ownerEl = document.querySelector(TARGET_SELECTOR);
  if (!ownerEl) {
    if (hasDropdown()) cleanupDropdowns();
    lastOpportunityId = null;
    return;
  }

  // 3. Obtém opportunityId (path ou rede capturada)
  const opportunityId = getCurrentOpportunityId();
  if (!opportunityId) {
    logger.debug('#OpportunityOwner presente mas opportunityId ainda não detectado');
    return;
  }

  // 4. Skip se já injetado com o mesmo ID
  if (opportunityId === lastOpportunityId && hasDropdown()) return;

  lastOpportunityId = opportunityId;
  scheduleReinject(opportunityId);
}

// ─── Auto-inicialização ────────────────────────────────────────────────────────

if (typeof window !== 'undefined') {
  // 1. Intercepta fetch/XHR ANTES de qualquer outra coisa — precisa pegar as
  //    requisições que o GHL faz ao carregar oportunidades para extrair o ID
  startNetworkInterceptor();

  // 2. Shim: código custom do GHL pode chamar manageGhlUiOverrides — evita crash
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
