# Switch User — GHL API Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite o Switch User para usar as APIs oficiais do GHL (`AppUtils`), consolidar dois entry points em um, e eliminar todo código morto.

**Architecture:** Único entry point `src/index.js` que escuta os eventos nativos `routeLoaded`/`routeChangeEvent` do GHL. Validação de rota via `AppUtils.Utilities.getCurrentLocation()` e `AppUtils.RouteHelper.getCurrentRoute()`. Todos os serviços de API compartilham um único `http.js`. Utilitários `dom.js` e `logger.js` reescritos para eliminar dependência do sistema de config do `src/core/`.

**Tech Stack:** Vanilla JS (ES Modules), esbuild (bundler), GHL AppUtils API

---

## Mapa de Arquivos

| Arquivo | Ação | Motivo |
|---|---|---|
| `src/app.js` | **Deletar** | Substituído pelo novo `src/index.js` |
| `src/core/` | **Deletar** | bootstrap, Container — nunca usados pelo UserDropdown |
| `src/config/` | **Deletar** | Sistema de config substituído por constantes inline |
| `src/styles/` | **Deletar** | Nunca usado pelo UserDropdown |
| `src/utils/spa.js` | **Deletar** | Substituído por `routeChangeEvent` |
| `src/utils/events.js` | **Deletar** | EventBus sem uso no novo design |
| `src/services/actions.js` | **Deletar** | Nunca importado |
| `src/components/RedSquare.js` | **Deletar** | Componente de debug |
| `src/components/base/` | **Deletar** | Base class sem uso |
| `src/components/index.js` | **Deletar** | Barrel não necessário |
| `src/utils/index.js` | **Deletar** | Barrel não necessário |
| `src/services/index.js` | **Deletar** | Barrel não necessário |
| `dist/ui-injector.min.js` | **Deletar** | Bundle descontinuado |
| `src/utils/dom.js` | **Reescrever** | Remover dependência de `src/config/` |
| `src/utils/logger.js` | **Reescrever** | Remover dependência de `src/config/` |
| `src/services/http.js` | **Reescrever** | Virar única fonte de `API_CONFIG` e `getHeaders()` |
| `src/services/ghlApi.js` | **Reescrever** | Remover API_CONFIG próprio e `getLocationIdFromUrl()` |
| `src/services/opportunityApi.js` | **Reescrever** | Remover API_CONFIG próprio e funções de URL parsing |
| `src/services/contactApi.js` | **Reescrever** | Remover API_CONFIG próprio |
| `src/index.js` | **Reescrever** | Entry point único com AppUtils |
| `src/components/UserDropdown.js` | **Não alterar** | Funciona como está |

---

## Task 1: Deletar arquivos mortos

**Files:**
- Delete: `src/app.js`, `src/core/`, `src/config/`, `src/styles/`, `src/utils/spa.js`, `src/utils/events.js`, `src/services/actions.js`, `src/components/RedSquare.js`, `src/components/base/`, `src/components/index.js`, `src/utils/index.js`, `src/services/index.js`, `dist/ui-injector.min.js`

- [ ] **Step 1: Remover diretórios e arquivos**

```bash
cd /Users/luccassilveira/Desktop/Projetos_ZOI/switch_user
git rm -r src/app.js src/core src/config src/styles src/utils/spa.js src/utils/events.js src/services/actions.js src/components/RedSquare.js src/components/base src/components/index.js src/utils/index.js src/services/index.js dist/ui-injector.min.js
```

Se algum arquivo não existir, o `git rm` falhará nele individualmente. Remova o(s) que faltam do comando e reexecute. Arquivos que nunca foram rastreados pelo git use `rm -f` diretamente.

- [ ] **Step 2: Commit**

```bash
git commit -m "chore: remove dead code — consolidate to single entry point"
```

---

## Task 2: Reescrever `src/utils/dom.js`

**Motivo:** O arquivo atual importa `getConfig()` e `getNamespace()` de `src/config/index.js`, que será deletado. A reescrita remove essa dependência mantendo a mesma API pública.

**Files:**
- Modify: `src/utils/dom.js`

- [ ] **Step 1: Substituir conteúdo do arquivo**

Substitua TODO o conteúdo de `src/utils/dom.js` por:

```javascript
/**
 * Utilitários de DOM
 */

/**
 * Aguarda um elemento aparecer no DOM
 * @param {string} selector
 * @param {Object} options
 * @returns {Promise<Element>}
 */
export function waitForElement(selector, options = {}) {
  const { timeout = 10000, interval = 100, parent = document } = options;

  return new Promise((resolve, reject) => {
    const element = parent.querySelector(selector);
    if (element) {
      resolve(element);
      return;
    }

    const startTime = Date.now();
    const intervalId = setInterval(() => {
      const el = parent.querySelector(selector);
      if (el) {
        clearInterval(intervalId);
        resolve(el);
        return;
      }
      if (Date.now() - startTime >= timeout) {
        clearInterval(intervalId);
        reject(new Error(`Timeout: elemento "${selector}" não encontrado`));
      }
    }, interval);
  });
}

export default { waitForElement };
```

- [ ] **Step 2: Commit**

```bash
git add src/utils/dom.js
git commit -m "refactor: remove config dependency from dom.js"
```

---

## Task 3: Reescrever `src/utils/logger.js`

**Motivo:** O arquivo atual importa `getConfig()` e `getNamespace()` de `src/config/index.js`. A reescrita usa constantes inline mantendo a mesma API pública (`logger.debug/info/warn/error`).

**Files:**
- Modify: `src/utils/logger.js`

- [ ] **Step 1: Substituir conteúdo do arquivo**

Substitua TODO o conteúdo de `src/utils/logger.js` por:

```javascript
/**
 * Logger com prefixo
 *
 * debug/info/warn só aparecem quando DEBUG = true.
 * error sempre aparece no console.
 */

const NAMESPACE = 'switch-user';
const DEBUG = false;

function fmt(level, message) {
  const time = new Date().toISOString().split('T')[1].split('.')[0];
  return `[${NAMESPACE}][${time}][${level}] ${message}`;
}

export const logger = {
  debug(message, ...args) {
    if (DEBUG) console.log(fmt('DEBUG', message), ...args);
  },
  info(message, ...args) {
    if (DEBUG) console.info(fmt('INFO', message), ...args);
  },
  warn(message, ...args) {
    if (DEBUG) console.warn(fmt('WARN', message), ...args);
  },
  error(message, ...args) {
    console.error(fmt('ERROR', message), ...args);
  },
};

export default logger;
```

- [ ] **Step 2: Commit**

```bash
git add src/utils/logger.js
git commit -m "refactor: remove config dependency from logger.js"
```

---

## Task 4: Reescrever `src/services/http.js`

**Motivo:** Atualmente é um executor genérico de requests não utilizado pelos serviços. Passa a ser a única fonte de `API_CONFIG` e `getHeaders()` compartilhada por todos os serviços.

**Files:**
- Modify: `src/services/http.js`

- [ ] **Step 1: Substituir conteúdo do arquivo**

Substitua TODO o conteúdo de `src/services/http.js` por:

```javascript
/**
 * Configuração central da API GHL
 *
 * Única fonte de API_CONFIG e getHeaders para todos os serviços.
 */

const API_CONFIG = {
  baseUrl: 'https://services.leadconnectorhq.com',
  token: 'pit-301590c6-a6cb-47d5-a7f4-bc5c4f5c22d4',
  version: '2021-07-28',
};

export const BASE_URL = API_CONFIG.baseUrl;

export function setApiToken(token) {
  API_CONFIG.token = token;
}

export function getHeaders() {
  return {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_CONFIG.token}`,
    'Version': API_CONFIG.version,
  };
}

export default { setApiToken, getHeaders };
```

- [ ] **Step 2: Commit**

```bash
git add src/services/http.js
git commit -m "refactor: consolidate API config into single http.js"
```

---

## Task 5: Reescrever `src/services/ghlApi.js`

**Files:**
- Modify: `src/services/ghlApi.js`

- [ ] **Step 1: Substituir conteúdo do arquivo**

Substitua TODO o conteúdo de `src/services/ghlApi.js` por:

```javascript
/**
 * Serviço GHL — Usuários
 */

import { getHeaders, BASE_URL } from './http.js';

/**
 * Busca usuários por Location ID
 * @param {string} locationId
 * @returns {Promise<Array>}
 */
export async function fetchUsersByLocation(locationId) {
  const response = await fetch(`${BASE_URL}/users/?locationId=${locationId}`, {
    method: 'GET',
    headers: getHeaders(),
  });
  if (!response.ok) throw new Error(`Erro ao buscar usuários: ${response.status}`);
  const data = await response.json();
  return data.users || [];
}

export default { fetchUsersByLocation };
```

- [ ] **Step 2: Commit**

```bash
git add src/services/ghlApi.js
git commit -m "refactor: remove duplicate API config and URL utils from ghlApi.js"
```

---

## Task 6: Reescrever `src/services/opportunityApi.js`

**Files:**
- Modify: `src/services/opportunityApi.js`

- [ ] **Step 1: Substituir conteúdo do arquivo**

Substitua TODO o conteúdo de `src/services/opportunityApi.js` por:

```javascript
/**
 * Serviço GHL — Oportunidades
 */

import { getHeaders, BASE_URL } from './http.js';

/**
 * Atualiza o owner de uma oportunidade
 * @param {string} opportunityId
 * @param {string} userId
 * @returns {Promise<{ok, status, data}>}
 */
export async function updateOpportunityOwner(opportunityId, userId) {
  const response = await fetch(`${BASE_URL}/opportunities/${opportunityId}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ assignedTo: userId }),
  });
  const data = await response.json();
  return { ok: response.ok, status: response.status, data };
}

/**
 * Busca uma oportunidade pelo ID
 * @param {string} opportunityId
 * @returns {Promise<{ok, status, data}>}
 */
export async function fetchOpportunityById(opportunityId) {
  if (!opportunityId) {
    return { ok: false, status: 0, data: { message: 'Opportunity ID ausente' } };
  }
  const response = await fetch(`${BASE_URL}/opportunities/${opportunityId}`, {
    method: 'GET',
    headers: getHeaders(),
  });
  const data = await response.json();
  return { ok: response.ok, status: response.status, data };
}

/**
 * Retorna o contactId associado a uma oportunidade
 * @param {string} opportunityId
 * @returns {Promise<string|null>}
 */
export async function getOpportunityContactId(opportunityId) {
  const result = await fetchOpportunityById(opportunityId);
  if (!result.ok) return null;
  const d = result.data;
  const opp = d.opportunity || d.opportunities?.[0] || d;
  return opp?.contactId || opp?.contact?.id || d?.contactId || d?.contact?.id || null;
}

/**
 * Adiciona um seguidor à oportunidade
 * @param {string} opportunityId
 * @param {string} userId
 * @returns {Promise<{ok, status, data}>}
 */
export async function addOpportunityFollower(opportunityId, userId) {
  if (!opportunityId || !userId) {
    return { ok: false, status: 0, data: { message: 'opportunityId ou userId ausente' } };
  }
  const response = await fetch(`${BASE_URL}/opportunities/${opportunityId}/followers`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ followers: [userId] }),
  });
  let data = null;
  try { data = await response.json(); } catch (_) {}
  return { ok: response.ok, status: response.status, data };
}

export default {
  updateOpportunityOwner,
  fetchOpportunityById,
  getOpportunityContactId,
  addOpportunityFollower,
};
```

- [ ] **Step 2: Commit**

```bash
git add src/services/opportunityApi.js
git commit -m "refactor: remove duplicate API config and URL parsing from opportunityApi.js"
```

---

## Task 7: Reescrever `src/services/contactApi.js`

**Files:**
- Modify: `src/services/contactApi.js`

- [ ] **Step 1: Substituir conteúdo do arquivo**

Substitua TODO o conteúdo de `src/services/contactApi.js` por:

```javascript
/**
 * Serviço GHL — Contatos
 */

import { getHeaders, BASE_URL } from './http.js';

/**
 * Adiciona um seguidor ao contato
 * @param {string} contactId
 * @param {string} userId
 * @returns {Promise<{ok, status, data}>}
 */
export async function addContactFollower(contactId, userId) {
  if (!contactId || !userId) {
    return { ok: false, status: 0, data: { message: 'contactId ou userId ausente' } };
  }
  const response = await fetch(`${BASE_URL}/contacts/${contactId}/followers`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ followers: [userId] }),
  });
  let data = null;
  try { data = await response.json(); } catch (_) {}
  return { ok: response.ok, status: response.status, data };
}

export default { addContactFollower };
```

- [ ] **Step 2: Commit**

```bash
git add src/services/contactApi.js
git commit -m "refactor: remove duplicate API config from contactApi.js"
```

---

## Task 8: Reescrever `src/index.js`

**Files:**
- Modify: `src/index.js`

- [ ] **Step 1: Substituir conteúdo do arquivo**

Substitua TODO o conteúdo de `src/index.js` por:

```javascript
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
  const match = (path || '').match(/\/opportunities\/list\/([^\/\?]+)/);
  return match ? match[1] : null;
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

  // Verificação inicial — caso routeLoaded já tenha disparado antes do registro
  handleRoute();
}

export { handleRoute as start, handleRoute as init };
export default { start: handleRoute, init: handleRoute };
```

- [ ] **Step 2: Commit**

```bash
git add src/index.js
git commit -m "feat: rewrite index.js using GHL AppUtils official APIs

- Replace SPA polling/history-patching with routeLoaded + routeChangeEvent
- Replace URL parsing with getCurrentLocation() + getCurrentRoute()
- Single CONFIG object with configurable followerOnOwnerChangeFrom
- Prefetch de usuários imediato na carga do script
- Remove dependência de src/core e src/utils/spa"
```

---

## Task 9: Build e Verificação

**Files:**
- Generate: `dist/switch-user.min.js`

- [ ] **Step 1: Rodar o build**

```bash
cd /Users/luccassilveira/Desktop/Projetos_ZOI/switch_user
npx esbuild src/index.js --bundle --minify --format=iife --global-name=SwitchUser --outfile=dist/switch-user.min.js
```

Output esperado (sem erros):
```
dist/switch-user.min.js  XXkb
```

Se houver erro de import não encontrado, verifique que os arquivos abaixo existem:
- `src/components/UserDropdown.js`
- `src/services/ghlApi.js`
- `src/services/opportunityApi.js`
- `src/services/contactApi.js`
- `src/utils/dom.js`
- `src/utils/logger.js`

- [ ] **Step 2: Commitar o bundle**

```bash
git add dist/switch-user.min.js
git commit -m "build: regenerate switch-user.min.js with GHL API rewrite"
```

- [ ] **Step 3: Checklist de verificação no browser**

Carregar `dist/switch-user.min.js` no GHL via userscript manager (ex: Tampermonkey) e verificar:

**1. Dropdown injeta ao abrir oportunidade**
- Abrir uma oportunidade na location `citQs4acsN1StzOEDuvj`
- Verificar que o dropdown customizado aparece no lugar do `#OpportunityOwner` nativo
- Verificar que o owner atual está pré-selecionado no dropdown

**2. Dropdown NÃO injeta fora da location permitida**
- Navegar para outra location ou para uma página sem oportunidade aberta
- Verificar que o dropdown some e o elemento `#OpportunityOwner` original é restaurado

**3. Seleção de owner atualiza via API**
- Selecionar um usuário diferente no dropdown
- Verificar na aba Network (DevTools): chamada `PUT /opportunities/{id}` com status 200
- Verificar que o owner foi atualizado na interface do GHL

**4. Navegação entre oportunidades reinjecta corretamente**
- Com o dropdown visível, navegar para outra oportunidade
- Verificar que o dropdown reinjecta com o owner correto da nova oportunidade

**5. Regra da seguidora executa quando aplicável**
- Abrir uma oportunidade cujo owner atual é "Daiane Bayer"
- Selecionar outro usuário
- Verificar na aba Network (DevTools, após ~1.5s):
  - `PUT /opportunities/{id}` — atualização do owner
  - `POST /opportunities/{id}/followers` — adição de seguidora
  - `GET /opportunities/{id}` — busca do contactId
  - `POST /contacts/{contactId}/followers` — adição de seguidora no contato

**6. Console sem erros em uso normal**
- As operações acima não devem gerar erros no console (mensagens `[switch-user][...][ERROR]`)
