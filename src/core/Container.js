/**
 * Container principal da UI injetada
 *
 * Gerencia o container isolado onde todos os componentes são renderizados.
 * Utiliza Shadow DOM para isolamento completo de CSS e eventos.
 */

import { getConfig, getNamespace } from '../config/index.js';
import { createElement, waitForDOMReady } from '../utils/dom.js';
import { styleManager } from '../styles/index.js';
import logger from '../utils/logger.js';

class Container {
  constructor() {
    this.host = null;
    this.shadowRoot = null;
    this.contentWrapper = null;
    this._initialized = false;
  }

  /**
   * Inicializa o container
   * @returns {Promise<Element>}
   */
  async init() {
    if (this._initialized) {
      logger.warn('Container já inicializado');
      return this.contentWrapper;
    }

    await waitForDOMReady();

    const config = getConfig();
    const namespace = getNamespace();

    // Cria o elemento host
    this.host = createElement('div', {
      id: `${namespace}-host`,
      style: {
        all: 'initial',
        position: 'fixed',
        top: '0',
        left: '0',
        width: '0',
        height: '0',
        overflow: 'visible',
        zIndex: config.zIndexBase.toString(),
        pointerEvents: 'none',
      },
    });

    // Cria Shadow DOM para isolamento
    if (config.cssIsolation === 'shadow-dom') {
      this.shadowRoot = this.host.attachShadow({ mode: 'open' });
      styleManager.setShadowRoot(this.shadowRoot);
    }

    // Cria wrapper de conteúdo dentro do Shadow DOM
    this.contentWrapper = createElement('div', {
      id: `${namespace}-content`,
      className: `${namespace}-root`,
      style: {
        all: 'initial',
        display: 'block',
      },
    });

    // Monta estrutura
    const root = this.shadowRoot || this.host;
    root.appendChild(this.contentWrapper);

    // Injeta estilos base
    styleManager.injectBaseStyles();

    // Adiciona ao DOM
    this._mountToDOM(config);

    this._initialized = true;
    logger.debug('Container inicializado');

    return this.contentWrapper;
  }

  /**
   * Monta o host no DOM baseado na configuração
   * @param {Object} config
   */
  _mountToDOM(config) {
    const { mountTarget, mountPosition } = config;

    if (mountTarget) {
      const target = document.querySelector(mountTarget);
      if (target) {
        target.appendChild(this.host);
        return;
      }
      logger.warn(`Target "${mountTarget}" não encontrado, usando body`);
    }

    switch (mountPosition) {
      case 'body-start':
        document.body.insertBefore(this.host, document.body.firstChild);
        break;
      case 'body-end':
      default:
        document.body.appendChild(this.host);
        break;
    }
  }

  /**
   * Obtém o container de conteúdo para montar componentes
   * @returns {Element}
   */
  getContentRoot() {
    if (!this._initialized) {
      throw new Error('Container não inicializado. Chame init() primeiro.');
    }
    return this.contentWrapper;
  }

  /**
   * Obtém o Shadow Root (se disponível)
   * @returns {ShadowRoot|null}
   */
  getShadowRoot() {
    return this.shadowRoot;
  }

  /**
   * Verifica se o container está inicializado
   * @returns {boolean}
   */
  isInitialized() {
    return this._initialized;
  }

  /**
   * Destrói o container e limpa recursos
   */
  destroy() {
    if (!this._initialized) return;

    // Limpa estilos
    styleManager.clear();

    // Remove do DOM
    if (this.host && this.host.parentNode) {
      this.host.parentNode.removeChild(this.host);
    }

    this.host = null;
    this.shadowRoot = null;
    this.contentWrapper = null;
    this._initialized = false;

    logger.debug('Container destruído');
  }
}

// Instância singleton
export const container = new Container();

export default container;
