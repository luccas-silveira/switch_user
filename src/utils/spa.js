/**
 * Observador de rotas para SPA
 *
 * Detecta mudancas de URL via History API, popstate e polling.
 */

const ROUTE_EVENT = 'ui-injector:route-change';
const HISTORY_PATCH_KEY = '__uiInjectorHistoryPatched';

const callbacks = new Set();
let watchersStarted = false;
let lastUrl = '';
let pollId = null;

function notify(reason) {
  const currentUrl = window.location.href;
  if (currentUrl === lastUrl) return;
  lastUrl = currentUrl;
  callbacks.forEach((callback) => callback({ url: currentUrl, reason }));
}

function patchHistory() {
  if (window[HISTORY_PATCH_KEY]) return;

  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  history.pushState = function (...args) {
    const result = originalPushState.apply(this, args);
    window.dispatchEvent(new Event(ROUTE_EVENT));
    return result;
  };

  history.replaceState = function (...args) {
    const result = originalReplaceState.apply(this, args);
    window.dispatchEvent(new Event(ROUTE_EVENT));
    return result;
  };

  window[HISTORY_PATCH_KEY] = true;
}

function startWatchers({ pollInterval }) {
  if (watchersStarted) return;
  watchersStarted = true;
  lastUrl = window.location.href;

  patchHistory();

  window.addEventListener(ROUTE_EVENT, () => notify('history'));
  window.addEventListener('popstate', () => notify('popstate'));
  window.addEventListener('hashchange', () => notify('hashchange'));

  if (pollInterval > 0) {
    pollId = window.setInterval(() => notify('poll'), pollInterval);
  }
}

export function watchSpaRouteChanges(callback, options = {}) {
  if (typeof window === 'undefined') return () => {};

  callbacks.add(callback);
  startWatchers({
    pollInterval: typeof options.pollInterval === 'number' ? options.pollInterval : 1000,
  });

  return () => {
    callbacks.delete(callback);
    if (callbacks.size === 0 && pollId) {
      clearInterval(pollId);
      pollId = null;
    }
  };
}

export default { watchSpaRouteChanges };
