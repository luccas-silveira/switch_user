# Design: Reescrita com APIs Oficiais do GHL

**Data:** 2026-04-15
**Status:** Aprovado

## Contexto

O script Switch User injeta um dropdown customizado na página de oportunidades do GoHighLevel (GHL) para permitir troca de owner. A implementação atual usa técnicas frágeis para detecção de navegação SPA (patching de `history.pushState`, polling a cada 1000ms) e parsing manual de URL para extrair locationId e opportunityId.

O GHL publicou APIs oficiais (`AppUtils`) que substituem essas abordagens com contratos estáveis:
- `routeLoaded` / `routeChangeEvent` — eventos nativos de navegação SPA
- `AppUtils.RouteHelper.getCurrentRoute()` — rota atual com path/params/query
- `AppUtils.Utilities.getCurrentLocation()` — location ativa com id/name
- `AppUtils.Utilities.getCurrentUser()` — usuário logado

## Objetivo

Reescrever o script adotando as APIs oficiais do GHL, consolidando dois entry points em um, e eliminando código morto.

## Decisões de Escopo

- **Restrição de location:** mantida (só injeta na location `citQs4acsN1StzOEDuvj`), mas validada via `getCurrentLocation()` em vez de regex na URL.
- **Regra da seguidora Daiane Bayer:** mantida e tornada configurável via `CONFIG.followerOnOwnerChangeFrom`.
- **Entry points:** consolidados em um único `src/index.js` → `dist/switch-user.min.js` → `window.SwitchUser`.
- **StoreEvents:** não adotado nesta versão — nenhum dos 43 módulos disponíveis é `opportunities`, portanto não há ganho concreto para o fluxo principal.

## Arquitetura

### Estrutura de Arquivos

**Mantidos / reescritos:**
```
src/
├── index.js                  # Entry point único (reescrito do zero)
├── components/
│   └── UserDropdown.js       # Mantido sem alteração
└── services/
    ├── http.js               # API_CONFIG único + getHeaders() (reescrito)
    ├── ghlApi.js             # fetchUsersByLocation() apenas (simplificado)
    ├── opportunityApi.js     # Operações de oportunidade (sem URL parsing)
    └── contactApi.js         # addContactFollower (sem alteração)
└── utils/
    ├── dom.js                # Mantido sem alteração (waitForElement ainda necessário)
    └── logger.js             # Mantido sem alteração
```

**Deletados (arquivos e diretórios):**
```
src/app.js
src/core/                     # bootstrap.js, Container.js — nunca usados pelo UserDropdown
src/styles/                   # base.js, manager.js — idem
src/utils/spa.js              # substituído por routeChangeEvent
src/utils/events.js           # EventBus — sem uso com callbacks diretos
src/components/RedSquare.js   # componente de debug
src/components/base/          # Component.js — base class sem uso
dist/ui-injector.min.js       # bundle descontinuado
```

### Build

```bash
# Único comando de build
npx esbuild src/index.js --bundle --minify --format=iife --global-name=SwitchUser --outfile=dist/switch-user.min.js
```

O bundle `dist/ui-injector.min.js` é descontinuado.

## Fluxo de Inicialização

```
Script carrega
  │
  ├─ Prefetch de usuários iniciado imediatamente (cache em memória)
  │
  ├─ window.addEventListener('routeLoaded', handleRoute)
  └─ window.addEventListener('routeChangeEvent', handleRoute)
                    │
              handleRoute()
                    │
                    ├─ AppUtils.Utilities.getCurrentLocation()
                    │     └─ id !== CONFIG.allowedLocationId → cleanup() e retorna
                    │
                    ├─ AppUtils.RouteHelper.getCurrentRoute()
                    │     └─ path não bate regex de oportunidade → cleanup() e retorna
                    │
                    ├─ Extrai opportunityId via regex no path
                    │     (não usa route.params — nomes internos do GHL não são documentados)
                    │
                    ├─ opportunityId === anterior E dropdown já existe → retorna (sem reinjetar)
                    │
                    └─ waitForElement('#OpportunityOwner', { timeout: 5000 })
                          └─ Injeta UserDropdown
```

### Proteção contra concorrência

Mantida do código atual: flag `reinjectInProgress` + `reinjectQueued`. Se um segundo evento de rota chegar enquanto a injeção está em andamento, ele é enfileirado e executado ao término.

## Configuração

Único objeto `CONFIG` no topo de `src/index.js`:

```javascript
const CONFIG = {
  allowedLocationId: 'citQs4acsN1StzOEDuvj',
  followerOnOwnerChangeFrom: 'Daiane Bayer', // null desativa a regra
};
```

## Regra da Seguidora (Daiane Bayer)

Ao confirmar a seleção de um novo owner:

1. Se `previousOwnerName === CONFIG.followerOnOwnerChangeFrom` **e** `newOwner.name !== CONFIG.followerOnOwnerChangeFrom`:
2. Atualiza o owner normalmente via `PUT /opportunities/{id}`
3. Aguarda 1500ms (delay intencional — garante que o GHL processou o update)
4. `POST /opportunities/{id}/followers` com o userId da pessoa configurada
5. Busca o `contactId` via `GET /opportunities/{id}`
6. `POST /contacts/{contactId}/followers` com o mesmo userId

A busca do userId da seguidora é feita pelo nome na lista de usuários já carregada em memória.

## Consolidação dos Serviços

### `src/services/http.js`
Única fonte de verdade para configuração da API:

```javascript
const API_CONFIG = {
  baseUrl: 'https://services.leadconnectorhq.com',
  token: 'pit-...',
  version: '2021-07-28',
};

export function getHeaders() { ... }
export function setApiToken(token) { API_CONFIG.token = token; }
```

### `src/services/ghlApi.js`
Importa `getHeaders` de `http.js`. Expõe apenas:
- `fetchUsersByLocation(locationId)`

Remove: `getLocationIdFromUrl()` — substituído por `getCurrentLocation()` no `index.js`.

### `src/services/opportunityApi.js`
Importa `getHeaders` de `http.js`. Expõe:
- `updateOpportunityOwner(opportunityId, userId)`
- `fetchOpportunityById(opportunityId)`
- `getOpportunityContactId(opportunityId)`
- `addOpportunityFollower(opportunityId, userId)`

Remove: `getOpportunityIdFromUrl()`, `getOpportunityIdFromDOM()`, `getOpportunityId()` — substituídos por `getCurrentRoute()` no `index.js`.

### `src/services/contactApi.js`
Sem alteração de lógica. Apenas passa a importar `getHeaders` de `http.js`.

## Resolução do Merge Conflict

`src/index.js` tem markers `<<<<<<< HEAD` não resolvidos. A reescrita resolve isso: toda a lógica da branch HEAD (Daiane Bayer, `getOpportunityId()` via DOM, MutationObserver) é incorporada no novo design com as APIs do GHL. O commit divergente (`4f97ba7`) é descartado.

## Critérios de Sucesso

1. Build sem erros com `npx esbuild src/index.js ...`
2. Dropdown injeta corretamente ao abrir uma oportunidade na location permitida
3. Dropdown não injeta em outras locations ou páginas sem oportunidade
4. Seleção de owner atualiza corretamente via API
5. Regra da seguidora executa quando owner muda de "Daiane Bayer" para outro
6. Navegação entre oportunidades reinjecta o dropdown com o owner correto
7. Nenhuma mensagem de erro no console em uso normal
