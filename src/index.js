/**
 * UI Injector - Entry Point Principal
 *
 * Ponto de entrada do sistema de injeção de UI.
 * Este arquivo deve ser importado ou carregado como script loader.
 *
 * @example
 * // Uso via import (bundler)
 * import UIInjector from './src/index.js';
 * const app = await UIInjector.init({ debug: true });
 *
 * @example
 * // Uso via script tag (IIFE build)
 * <script src="dist/ui-injector.min.js"></script>
 * <script>
 *   UIInjector.init({ debug: true }).then(app => {
 *     console.log('App iniciado!', app);
 *   });
 * </script>
 */

// Core
import { init, destroy, isInitialized } from './core/index.js';

// Configuração
import { getConfig, setConfig, resetConfig } from './config/index.js';

// Componentes
import { Component, RedSquare } from './components/index.js';

// Utilitários
import {
  waitForElement,
  waitForDOMReady,
  createElement,
  generateId,
  observeDOM,
  logger,
  eventBus,
} from './utils/index.js';

// Estilos
import { styleManager } from './styles/index.js';

/**
 * API pública do UI Injector
 */
const UIInjector = {
  // Versão
  version: '1.0.0',

  // Ciclo de vida
  init,
  destroy,
  isInitialized,

  // Configuração
  getConfig,
  setConfig,
  resetConfig,

  // Componentes
  Component,
  RedSquare,

  // Utilitários
  utils: {
    waitForElement,
    waitForDOMReady,
    createElement,
    generateId,
    observeDOM,
  },

  // Logging
  logger,

  // Eventos
  eventBus,

  // Estilos
  styleManager,
};

// Expõe globalmente para uso sem bundler (opcional)
if (typeof window !== 'undefined') {
  window.UIInjector = UIInjector;
}

export default UIInjector;

// Named exports para tree-shaking
export {
  init,
  destroy,
  isInitialized,
  getConfig,
  setConfig,
  resetConfig,
  Component,
  RedSquare,
  logger,
  eventBus,
  styleManager,
};
