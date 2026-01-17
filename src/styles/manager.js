/**
 * Gerenciador de estilos
 *
 * Responsável por injetar e gerenciar estilos CSS
 * dentro do escopo isolado (Shadow DOM ou prefixado).
 */

import { getConfig, getNamespace } from '../config/index.js';
import { getBaseStyles } from './base.js';
import logger from '../utils/logger.js';

class StyleManager {
  constructor() {
    this.styleSheets = new Map();
    this.shadowRoot = null;
  }

  /**
   * Define o Shadow Root para injeção de estilos
   * @param {ShadowRoot} shadowRoot
   */
  setShadowRoot(shadowRoot) {
    this.shadowRoot = shadowRoot;
  }

  /**
   * Gera um ID único para o stylesheet
   * @param {string} name
   * @returns {string}
   */
  _getStyleId(name) {
    return `${getNamespace()}-style-${name}`;
  }

  /**
   * Prefixa seletores CSS com o namespace (para modo 'prefixed')
   * @param {string} css
   * @returns {string}
   */
  _prefixSelectors(css) {
    const namespace = getNamespace();
    // Regex simplificado - em produção usar parser CSS
    return css.replace(
      /([^\r\n,{}]+)(,(?=[^}]*{)|\s*{)/g,
      (match, selector, suffix) => {
        const trimmed = selector.trim();
        if (
          trimmed.startsWith('@') ||
          trimmed.startsWith(':root') ||
          trimmed.startsWith(':host')
        ) {
          return match;
        }
        return `.${namespace} ${trimmed}${suffix}`;
      }
    );
  }

  /**
   * Injeta um bloco de estilos
   * @param {string} name - Nome identificador do stylesheet
   * @param {string} css - CSS a injetar
   * @returns {HTMLStyleElement}
   */
  inject(name, css) {
    const config = getConfig();
    const styleId = this._getStyleId(name);

    // Remove estilo existente se houver
    this.remove(name);

    let processedCss = css;

    // Processa CSS baseado na estratégia de isolamento
    if (config.cssIsolation === 'prefixed' && !this.shadowRoot) {
      processedCss = this._prefixSelectors(css);
    }

    const styleElement = document.createElement('style');
    styleElement.id = styleId;
    styleElement.textContent = processedCss;

    // Injeta no Shadow DOM ou no head
    if (this.shadowRoot) {
      this.shadowRoot.appendChild(styleElement);
    } else {
      document.head.appendChild(styleElement);
    }

    this.styleSheets.set(name, styleElement);
    logger.debug(`Estilo injetado: ${name}`);

    return styleElement;
  }

  /**
   * Remove um stylesheet pelo nome
   * @param {string} name
   */
  remove(name) {
    const styleElement = this.styleSheets.get(name);
    if (styleElement && styleElement.parentNode) {
      styleElement.parentNode.removeChild(styleElement);
      this.styleSheets.delete(name);
      logger.debug(`Estilo removido: ${name}`);
    }
  }

  /**
   * Injeta estilos base do sistema
   */
  injectBaseStyles() {
    this.inject('base', getBaseStyles());
  }

  /**
   * Remove todos os estilos injetados
   */
  clear() {
    this.styleSheets.forEach((_, name) => this.remove(name));
    logger.debug('Todos os estilos foram removidos');
  }

  /**
   * Verifica se um stylesheet está injetado
   * @param {string} name
   * @returns {boolean}
   */
  has(name) {
    return this.styleSheets.has(name);
  }
}

// Instância singleton
export const styleManager = new StyleManager();

export default styleManager;
