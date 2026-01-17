/**
 * Configuração central do projeto de injeção de UI
 *
 * Este módulo centraliza todas as configurações do sistema,
 * permitindo customização sem modificar código fonte.
 */

const defaultConfig = {
  // Identificador único do projeto (usado como prefixo para isolamento)
  namespace: 'ui-injector',

  // Versão do projeto
  version: '1.0.0',

  // Modo de debug (habilita logs detalhados)
  debug: false,

  // Estratégia de isolamento de CSS: 'shadow-dom' | 'scoped' | 'prefixed'
  cssIsolation: 'shadow-dom',

  // Seletores onde a UI será montada (null = cria container próprio)
  mountTarget: null,

  // Posição do container principal no DOM: 'body-start' | 'body-end' | 'custom'
  mountPosition: 'body-end',

  // Z-index base para elementos injetados
  zIndexBase: 999000,

  // Timeout para operações de DOM (ms)
  domTimeout: 5000,

  // Intervalo de retry para encontrar elementos (ms)
  retryInterval: 100,

  // Número máximo de tentativas para encontrar elementos
  maxRetries: 50,

  // Habilitar observação de mutações no DOM
  observeMutations: true,

  // Callbacks de ciclo de vida
  hooks: {
    onBeforeInit: null,
    onAfterInit: null,
    onBeforeMount: null,
    onAfterMount: null,
    onBeforeDestroy: null,
    onAfterDestroy: null,
    onError: null,
  },
};

// Configuração ativa (mesclada com customizações)
let activeConfig = { ...defaultConfig };

/**
 * Obtém a configuração atual
 * @returns {Object} Configuração ativa
 */
export function getConfig() {
  return { ...activeConfig };
}

/**
 * Atualiza a configuração com novos valores
 * @param {Object} newConfig - Objeto com configurações a mesclar
 * @returns {Object} Configuração atualizada
 */
export function setConfig(newConfig) {
  activeConfig = {
    ...activeConfig,
    ...newConfig,
    hooks: {
      ...activeConfig.hooks,
      ...(newConfig.hooks || {}),
    },
  };
  return getConfig();
}

/**
 * Reseta configuração para valores padrão
 * @returns {Object} Configuração padrão
 */
export function resetConfig() {
  activeConfig = { ...defaultConfig };
  return getConfig();
}

/**
 * Obtém o namespace atual (usado para prefixos)
 * @returns {string}
 */
export function getNamespace() {
  return activeConfig.namespace;
}

export default {
  getConfig,
  setConfig,
  resetConfig,
  getNamespace,
};
