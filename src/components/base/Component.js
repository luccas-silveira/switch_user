/**
 * Classe base para componentes
 *
 * Fornece estrutura comum para todos os componentes da UI injetada,
 * incluindo ciclo de vida, gerenciamento de estado e renderização.
 */

import { createElement, generateId, safeRemove } from '../../utils/dom.js';
import { eventBus } from '../../utils/events.js';
import logger from '../../utils/logger.js';
import { styleManager } from '../../styles/index.js';

export class Component {
  /**
   * @param {Object} props - Propriedades do componente
   */
  constructor(props = {}) {
    this.id = generateId(this.constructor.name.toLowerCase());
    this.props = props;
    this.state = {};
    this.element = null;
    this.children = new Map();
    this._mounted = false;
    this._eventCleanups = [];
  }

  /**
   * Retorna os estilos CSS do componente (override nas subclasses)
   * @returns {string}
   */
  static styles() {
    return '';
  }

  /**
   * Template do componente (override nas subclasses)
   * @returns {Element|string}
   */
  render() {
    throw new Error('Método render() deve ser implementado nas subclasses');
  }

  /**
   * Chamado após o componente ser montado no DOM
   * Override para lógica pós-mount
   */
  onMount() {}

  /**
   * Chamado antes do componente ser desmontado
   * Override para cleanup
   */
  onUnmount() {}

  /**
   * Chamado quando o estado é atualizado
   * @param {Object} prevState - Estado anterior
   */
  onUpdate(prevState) {}

  /**
   * Atualiza o estado do componente
   * @param {Object|Function} newState - Novo estado ou função que retorna novo estado
   */
  setState(newState) {
    const prevState = { ...this.state };

    if (typeof newState === 'function') {
      this.state = { ...this.state, ...newState(this.state) };
    } else {
      this.state = { ...this.state, ...newState };
    }

    if (this._mounted) {
      this._rerender();
      this.onUpdate(prevState);
    }
  }

  /**
   * Injeta os estilos do componente
   */
  _injectStyles() {
    const styles = this.constructor.styles();
    if (styles) {
      const styleName = `component-${this.constructor.name.toLowerCase()}`;
      if (!styleManager.has(styleName)) {
        styleManager.inject(styleName, styles);
      }
    }
  }

  /**
   * Re-renderiza o componente
   */
  _rerender() {
    if (!this.element || !this.element.parentNode) return;

    const parent = this.element.parentNode;
    const newElement = this._createElement();
    parent.replaceChild(newElement, this.element);
    this.element = newElement;
    this._bindEvents();

    logger.debug(`Componente re-renderizado: ${this.id}`);
  }

  /**
   * Cria o elemento DOM do componente
   * @returns {Element}
   */
  _createElement() {
    const rendered = this.render();

    if (typeof rendered === 'string') {
      const wrapper = document.createElement('div');
      wrapper.innerHTML = rendered.trim();
      return wrapper.firstChild || wrapper;
    }

    return rendered;
  }

  /**
   * Vincula eventos ao componente (override para eventos customizados)
   */
  _bindEvents() {}

  /**
   * Registra listener no event bus com cleanup automático
   * @param {string} event
   * @param {Function} callback
   */
  on(event, callback) {
    const cleanup = eventBus.on(event, callback);
    this._eventCleanups.push(cleanup);
  }

  /**
   * Emite evento no event bus
   * @param {string} event
   * @param {any} data
   */
  emit(event, data) {
    eventBus.emit(event, data);
  }

  /**
   * Monta o componente em um elemento pai
   * @param {Element} parent - Elemento pai
   * @returns {Element}
   */
  mount(parent) {
    if (this._mounted) {
      logger.warn(`Componente já montado: ${this.id}`);
      return this.element;
    }

    this._injectStyles();
    this.element = this._createElement();
    this.element.dataset.componentId = this.id;

    parent.appendChild(this.element);
    this._mounted = true;
    this._bindEvents();
    this.onMount();

    logger.debug(`Componente montado: ${this.id}`);
    return this.element;
  }

  /**
   * Desmonta o componente e seus filhos
   */
  unmount() {
    if (!this._mounted) return;

    // Desmonta filhos primeiro
    this.children.forEach((child) => child.unmount());
    this.children.clear();

    // Cleanup de eventos
    this._eventCleanups.forEach((cleanup) => cleanup());
    this._eventCleanups = [];

    // Callback de unmount
    this.onUnmount();

    // Remove do DOM
    safeRemove(this.element);
    this._mounted = false;

    logger.debug(`Componente desmontado: ${this.id}`);
  }

  /**
   * Adiciona um componente filho
   * @param {string} name - Nome identificador
   * @param {Component} child - Componente filho
   * @param {Element} container - Container onde montar (opcional)
   * @returns {Component}
   */
  addChild(name, child, container = null) {
    this.children.set(name, child);
    if (container || this.element) {
      child.mount(container || this.element);
    }
    return child;
  }

  /**
   * Remove um componente filho
   * @param {string} name
   */
  removeChild(name) {
    const child = this.children.get(name);
    if (child) {
      child.unmount();
      this.children.delete(name);
    }
  }

  /**
   * Obtém um componente filho pelo nome
   * @param {string} name
   * @returns {Component|undefined}
   */
  getChild(name) {
    return this.children.get(name);
  }
}

export default Component;
