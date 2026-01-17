/**
 * Bootstrap do sistema de injeção de UI
 *
 * Orquestra a inicialização de todos os módulos,
 * executa hooks de ciclo de vida e prepara o ambiente.
 */

import { getConfig, setConfig } from '../config/index.js';
import { container } from './Container.js';
import { eventBus } from '../utils/events.js';
import logger from '../utils/logger.js';

// Estado global da aplicação
const appState = {
  initialized: false,
  destroyed: false,
};

/**
 * Executa um hook de ciclo de vida de forma segura
 * @param {string} hookName
 * @param {...any} args
 */
async function executeHook(hookName, ...args) {
  const config = getConfig();
  const hook = config.hooks[hookName];

  if (typeof hook === 'function') {
    try {
      await hook(...args);
      logger.debug(`Hook executado: ${hookName}`);
    } catch (error) {
      logger.error(`Erro no hook ${hookName}:`, error);
    }
  }
}

/**
 * Inicializa a aplicação de injeção de UI
 * @param {Object} userConfig - Configuração do usuário
 * @returns {Promise<Object>} API da aplicação
 */
export async function init(userConfig = {}) {
  if (appState.initialized) {
    logger.warn('Aplicação já inicializada');
    return getAppAPI();
  }

  try {
    // Mescla configuração do usuário
    setConfig(userConfig);

    const config = getConfig();
    logger.debug('Iniciando aplicação', config);

    // Hook: antes da inicialização
    await executeHook('onBeforeInit');

    // Inicializa o container isolado
    await container.init();

    // Emite evento de inicialização
    eventBus.emit('app:init', { config });

    // Hook: após inicialização
    await executeHook('onAfterInit');

    appState.initialized = true;
    appState.destroyed = false;

    logger.info('Aplicação inicializada com sucesso');

    return getAppAPI();
  } catch (error) {
    logger.error('Falha na inicialização:', error);
    await executeHook('onError', error);
    throw error;
  }
}

/**
 * Destrói a aplicação e limpa recursos
 */
export async function destroy() {
  if (!appState.initialized || appState.destroyed) {
    return;
  }

  try {
    // Hook: antes de destruir
    await executeHook('onBeforeDestroy');

    // Emite evento de destruição
    eventBus.emit('app:destroy');

    // Limpa event bus
    eventBus.clear();

    // Destrói container
    container.destroy();

    // Hook: após destruir
    await executeHook('onAfterDestroy');

    appState.initialized = false;
    appState.destroyed = true;

    logger.info('Aplicação destruída');
  } catch (error) {
    logger.error('Erro ao destruir aplicação:', error);
  }
}

/**
 * Retorna a API pública da aplicação
 * @returns {Object}
 */
function getAppAPI() {
  return {
    // Estado
    isInitialized: () => appState.initialized,

    // Container
    getContainer: () => container.getContentRoot(),
    getShadowRoot: () => container.getShadowRoot(),

    // Eventos
    on: (event, callback) => eventBus.on(event, callback),
    off: (event, callback) => eventBus.off(event, callback),
    emit: (event, data) => eventBus.emit(event, data),

    // Configuração
    getConfig,
    setConfig,

    // Ciclo de vida
    destroy,
  };
}

/**
 * Verifica se a aplicação está inicializada
 * @returns {boolean}
 */
export function isInitialized() {
  return appState.initialized;
}

export default { init, destroy, isInitialized };
