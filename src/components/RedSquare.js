/**
 * Componente RedSquare
 *
 * Substitui o dropdown OpportunityOwner por um quadrado vermelho.
 * Exibe apenas quando a URL contém o locationId permitido.
 */

import { Component } from './base/index.js';
import { waitForElement } from '../utils/dom.js';
import logger from '../utils/logger.js';

// Location ID permitido para exibição do quadrado vermelho
const ALLOWED_LOCATION_ID = 'citQs4acsN1StzOEDuvj';

export class RedSquare extends Component {
  constructor(props = {}) {
    super(props);
    this.targetSelector = props.targetSelector || '#OpportunityOwner';
    this.allowedLocationId = props.allowedLocationId || ALLOWED_LOCATION_ID;
    this.originalElement = null;
  }

  static styles() {
    return `
      .red-square {
        width: 40px;
        height: 40px;
        background-color: red;
        display: inline-block;
      }
    `;
  }

  render() {
    return `<div class="red-square"></div>`;
  }

  /**
   * Extrai o locationId da URL atual
   * Padrão esperado: /v2/location/{locationId}/...
   * @returns {string|null}
   */
  _getLocationIdFromUrl() {
    const url = window.location.pathname;
    const match = url.match(/\/location\/([^\/]+)/);
    return match ? match[1] : null;
  }

  /**
   * Verifica se a URL atual contém o locationId permitido
   * @returns {boolean}
   */
  _isAllowedLocation() {
    const currentLocationId = this._getLocationIdFromUrl();
    return currentLocationId === this.allowedLocationId;
  }

  /**
   * Monta o componente substituindo o dropdown original
   * Só exibe se a URL contiver o locationId permitido
   */
  async mountReplacing() {
    try {
      // Verifica se está na location permitida
      if (!this._isAllowedLocation()) {
        const currentLocationId = this._getLocationIdFromUrl();
        logger.debug(
          `RedSquare não exibido: locationId atual (${currentLocationId}) diferente do permitido (${this.allowedLocationId})`
        );
        return null;
      }

      // Aguarda o elemento alvo aparecer no DOM
      this.originalElement = await waitForElement(this.targetSelector, { timeout: 10000 });

      if (!this.originalElement) {
        logger.error(`Elemento não encontrado: ${this.targetSelector}`);
        return null;
      }

      // Oculta o elemento original
      this.originalElement.style.display = 'none';

      // Insere o quadrado vermelho após o elemento original
      this._injectStyles();
      this.element = this._createElement();
      this.element.dataset.componentId = this.id;

      this.originalElement.parentNode.insertBefore(
        this.element,
        this.originalElement.nextSibling
      );

      this._mounted = true;
      this._bindEvents();
      this.onMount();

      logger.debug(`RedSquare montado substituindo: ${this.targetSelector}`);
      return this.element;
    } catch (error) {
      logger.error(`Erro ao montar RedSquare: ${error.message}`);
      return null;
    }
  }

  /**
   * Restaura o elemento original ao desmontar
   */
  onUnmount() {
    if (this.originalElement) {
      this.originalElement.style.display = '';
      logger.debug('Elemento original restaurado');
    }
  }
}

export default RedSquare;
