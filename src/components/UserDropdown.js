/**
 * Componente UserDropdown
 *
 * Substitui o dropdown OpportunityOwner por um dropdown customizado
 * que exibe a lista de usuários obtida via API.
 * Exibe apenas quando a URL contém o locationId permitido.
 */

import { waitForElement } from '../utils/dom.js';
import logger from '../utils/logger.js';

// Location ID permitido para exibição do dropdown
const ALLOWED_LOCATION_ID = 'citQs4acsN1StzOEDuvj';

export class UserDropdown {
  constructor(props = {}) {
    this.id = 'user-dropdown-' + Math.random().toString(36).substring(2, 9);
    this.targetSelector = props.targetSelector || '#OpportunityOwner';
    this.allowedLocationId = props.allowedLocationId || ALLOWED_LOCATION_ID;
    this.originalElement = null;
    this.element = null;
    this._mounted = false;

    // Estado do dropdown
    this.state = {
      isOpen: false,
      users: props.users || [],
      selectedUser: null,
    };

    // Callbacks
    this._eventListeners = [];

    // Bind de métodos
    this._handleToggle = this._handleToggle.bind(this);
    this._handleSelect = this._handleSelect.bind(this);
    this._handleClickOutside = this._handleClickOutside.bind(this);
    this._handleClear = this._handleClear.bind(this);
  }

  /**
   * Registra listener de evento
   */
  on(event, callback) {
    this._eventListeners.push({ event, callback });
  }

  /**
   * Emite evento
   */
  emit(event, data) {
    this._eventListeners
      .filter(l => l.event === event)
      .forEach(l => l.callback(data));
  }

  /**
   * Atualiza estado e re-renderiza
   */
  setState(newState) {
    this.state = { ...this.state, ...newState };
    if (this._mounted) {
      this._rerender();
    }
  }

  /**
   * Popula a lista de usuários no dropdown
   */
  setUsers(users) {
    this.setState({ users: users || [] });
  }

  /**
   * CSS do componente - estilo GHL
   */
  _getStyles() {
    return `
      <style>
        .ud-container {
          position: relative;
          display: inline-block;
          width: 100%;
          font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 15px;
        }

        .ud-trigger {
          display: flex;
          align-items: center;
          padding: 3px 26px 3px 12px;
          background: rgba(255, 255, 255, 1);
          border: 1px solid rgb(224, 224, 230);
          border-radius: 3px;
          cursor: pointer;
          min-height: 40px;
          transition: all 0.2s cubic-bezier(.4, 0, .2, 1);
          width: 100%;
          box-sizing: border-box;
          position: relative;
        }

        .ud-trigger:hover {
          border-color: #004EEB;
        }

        .ud-trigger.open {
          border-color: #155EEF;
          box-shadow: 0 0 0 2px rgba(21, 94, 239, 0.2);
        }

        .ud-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          flex: 1;
          align-items: center;
        }

        .ud-tag {
          display: inline-flex;
          align-items: center;
          padding: 0 7px;
          height: 28px;
          background: rgb(250, 250, 252);
          border: 1px solid rgb(224, 224, 230);
          border-radius: 2px;
          font-size: 14px;
          color: rgba(52, 64, 84, 1);
          font-weight: 400;
          position: relative;
        }

        .ud-tag-text {
          max-width: 150px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .ud-tag-close {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-left: 4px;
          width: 18px;
          height: 18px;
          cursor: pointer;
          color: rgba(102, 102, 102, 1);
          border-radius: 2px;
          transition: background-color 0.15s;
        }

        .ud-tag-close:hover {
          background-color: rgba(0, 0, 0, 0.09);
        }

        .ud-tag-close:active {
          background-color: rgba(0, 0, 0, 0.13);
        }

        .ud-tag-close svg {
          width: 14px;
          height: 14px;
        }

        .ud-placeholder {
          color: rgba(102, 112, 133, 1);
        }

        .ud-arrow {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          width: 16px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(194, 194, 194, 1);
          transition: transform 0.2s cubic-bezier(.4, 0, .2, 1);
          pointer-events: none;
        }

        .ud-arrow.open {
          transform: translateY(-50%) rotate(180deg);
        }

        .ud-arrow svg {
          width: 16px;
          height: 16px;
        }

        .ud-list {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          right: 0;
          background: #fff;
          border: 1px solid rgb(224, 224, 230);
          border-radius: 3px;
          box-shadow: 0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 9px 28px 8px rgba(0, 0, 0, 0.05);
          max-height: 280px;
          overflow-y: auto;
          z-index: 99999;
          display: none;
        }

        .ud-list.open {
          display: block;
        }

        .ud-item {
          padding: 8px 12px;
          cursor: pointer;
          transition: background-color 0.15s;
          color: rgba(52, 64, 84, 1);
          font-size: 14px;
        }

        .ud-item:hover {
          background-color: rgb(250, 250, 252);
        }

        .ud-item.selected {
          background-color: #eff6ff;
          color: #155EEF;
        }

        .ud-item-name {
          font-weight: 400;
        }

        .ud-empty {
          padding: 16px;
          text-align: center;
          color: rgba(102, 112, 133, 1);
        }
      </style>
    `;
  }

  /**
   * Ícone de seta (estilo GHL)
   */
  _getArrowIcon() {
    return `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3.14645 5.64645C3.34171 5.45118 3.65829 5.45118 3.85355 5.64645L8 9.79289L12.1464 5.64645C12.3417 5.45118 12.6583 5.45118 12.8536 5.64645C13.0488 5.84171 13.0488 6.15829 12.8536 6.35355L8.35355 10.8536C8.15829 11.0488 7.84171 11.0488 7.64645 10.8536L3.14645 6.35355C2.95118 6.15829 2.95118 5.84171 3.14645 5.64645Z" fill="currentColor"></path>
    </svg>`;
  }

  /**
   * Ícone de fechar (X) para tag
   */
  _getCloseIcon() {
    return `<svg viewBox="0 0 12 12" version="1.1" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
        <g fill="currentColor" fill-rule="nonzero">
          <path d="M2.08859116,2.2156945 L2.14644661,2.14644661 C2.32001296,1.97288026 2.58943736,1.95359511 2.7843055,2.08859116 L2.85355339,2.14644661 L6,5.293 L9.14644661,2.14644661 C9.34170876,1.95118446 9.65829124,1.95118446 9.85355339,2.14644661 C10.0488155,2.34170876 10.0488155,2.65829124 9.85355339,2.85355339 L6.707,6 L9.85355339,9.14644661 C10.0271197,9.32001296 10.0464049,9.58943736 9.91140884,9.7843055 L9.85355339,9.85355339 C9.67998704,10.0271197 9.41056264,10.0464049 9.2156945,9.91140884 L9.14644661,9.85355339 L6,6.707 L2.85355339,9.85355339 C2.65829124,10.0488155 2.34170876,10.0488155 2.14644661,9.85355339 C1.95118446,9.65829124 1.95118446,9.34170876 2.14644661,9.14644661 L5.293,6 L2.14644661,2.85355339 C1.97288026,2.67998704 1.95359511,2.41056264 2.08859116,2.2156945 L2.14644661,2.14644661 L2.08859116,2.2156945 Z"></path>
        </g>
      </g>
    </svg>`;
  }

  /**
   * Escape HTML para prevenir XSS
   */
  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }

  /**
   * Renderiza o HTML do componente
   */
  _render() {
    const { isOpen, users, selectedUser } = this.state;

    const displayValue = selectedUser
      ? `<div class="ud-tag">
           <span class="ud-tag-text">${this._escapeHtml(selectedUser.name)}</span>
           <span class="ud-tag-close" data-action="clear">${this._getCloseIcon()}</span>
         </div>`
      : '<span class="ud-placeholder">Selecione um usuário</span>';

    const listItems = users.length > 0
      ? users.map(user => `
          <div class="ud-item${selectedUser?.id === user.id ? ' selected' : ''}" data-user-id="${user.id}">
            <div class="ud-item-name">${this._escapeHtml(user.name)}</div>
          </div>
        `).join('')
      : '<div class="ud-empty">Nenhum usuário disponível</div>';

    return `
      ${this._getStyles()}
      <div class="ud-container" data-component-id="${this.id}">
        <div class="ud-trigger${isOpen ? ' open' : ''}">
          <div class="ud-tags">
            ${displayValue}
          </div>
          <span class="ud-arrow${isOpen ? ' open' : ''}">${this._getArrowIcon()}</span>
        </div>
        <div class="ud-list${isOpen ? ' open' : ''}">
          ${listItems}
        </div>
      </div>
    `;
  }

  /**
   * Cria elemento DOM
   */
  _createElement() {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = this._render();
    return wrapper;
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
   * Extrai o locationId da URL atual
   */
  _getLocationIdFromUrl() {
    const url = window.location.pathname;
    const match = url.match(/\/location\/([^\/]+)/);
    return match ? match[1] : null;
  }

  /**
   * Verifica se a URL atual contém o locationId permitido
   */
  _isAllowedLocation() {
    const currentLocationId = this._getLocationIdFromUrl();
    return currentLocationId === this.allowedLocationId;
  }

  /**
   * Handler de toggle do dropdown
   */
  _handleToggle(event) {
    event.stopPropagation();
    event.preventDefault();
    this.setState({ isOpen: !this.state.isOpen });
  }

  /**
   * Handler de seleção de usuário
   */
  _handleSelect(event) {
    const item = event.target.closest('.ud-item');
    if (!item) return;

    const userId = item.dataset.userId;
    const selectedUser = this.state.users.find(u => u.id === userId);

    if (selectedUser) {
      this.setState({
        selectedUser,
        isOpen: false,
      });
      this.emit('user:selected', selectedUser);
      logger.debug(`Usuário selecionado: ${selectedUser.name}`);
    }
  }

  /**
   * Handler de clique fora do dropdown
   */
  _handleClickOutside(event) {
    if (this.element && !this.element.contains(event.target)) {
      if (this.state.isOpen) {
        this.setState({ isOpen: false });
      }
    }
  }

  /**
   * Handler para limpar seleção (botão X na tag)
   */
  _handleClear(event) {
    event.stopPropagation();
    event.preventDefault();
    this.setState({ selectedUser: null, isOpen: false });
    this.emit('user:cleared', null);
    logger.debug('Seleção limpa');
  }

  /**
   * Vincula eventos ao componente
   */
  _bindEvents() {
    if (!this.element) return;

    const trigger = this.element.querySelector('.ud-trigger');
    const list = this.element.querySelector('.ud-list');
    const closeBtn = this.element.querySelector('.ud-tag-close');

    if (trigger) {
      trigger.addEventListener('click', this._handleToggle);
    }

    if (list) {
      list.addEventListener('click', this._handleSelect);
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', this._handleClear);
    }

    // Remove listener anterior antes de adicionar novo
    document.removeEventListener('click', this._handleClickOutside);
    document.addEventListener('click', this._handleClickOutside);
  }

  /**
   * Remove eventos ao desmontar
   */
  _unbindEvents() {
    document.removeEventListener('click', this._handleClickOutside);
  }

  /**
   * Monta o componente substituindo o dropdown original
   */
  async mountReplacing() {
    try {
      // Verifica se está na location permitida
      if (!this._isAllowedLocation()) {
        const currentLocationId = this._getLocationIdFromUrl();
        logger.debug(
          `UserDropdown não exibido: locationId atual (${currentLocationId}) diferente do permitido (${this.allowedLocationId})`
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

      // Cria e insere o dropdown customizado
      this.element = this._createElement();

      this.originalElement.parentNode.insertBefore(
        this.element,
        this.originalElement.nextSibling
      );

      this._mounted = true;
      this._bindEvents();

      logger.debug(`UserDropdown montado substituindo: ${this.targetSelector}`);
      return this.element;
    } catch (error) {
      logger.error(`Erro ao montar UserDropdown: ${error.message}`);
      return null;
    }
  }

  /**
   * Desmonta o componente
   */
  unmount() {
    this._unbindEvents();
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    if (this.originalElement) {
      this.originalElement.style.display = '';
      logger.debug('Elemento original restaurado');
    }
    this._mounted = false;
  }
}

export default UserDropdown;
