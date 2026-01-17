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
   * CSS do componente
   */
  _getStyles() {
    return `
      <style>
        .ud-container {
          position: relative;
          display: inline-block;
          width: 100%;
          font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 14px;
        }

        .ud-trigger {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 9px 12px;
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          cursor: pointer;
          min-height: 40px;
          transition: all 0.15s ease;
          width: 100%;
          box-sizing: border-box;
        }

        .ud-trigger:hover {
          border-color: #cbd5e1;
        }

        .ud-trigger.open {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .ud-value {
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: #1e293b;
        }

        .ud-placeholder {
          color: #94a3b8;
        }

        .ud-arrow {
          margin-left: 8px;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
          transition: transform 0.2s ease;
        }

        .ud-arrow.open {
          transform: rotate(180deg);
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
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
          max-height: 280px;
          overflow-y: auto;
          z-index: 99999;
          display: none;
        }

        .ud-list.open {
          display: block;
        }

        .ud-item {
          padding: 10px 14px;
          cursor: pointer;
          transition: background-color 0.1s ease;
          border-bottom: 1px solid #f1f5f9;
        }

        .ud-item:last-child {
          border-bottom: none;
        }

        .ud-item:hover {
          background-color: #f8fafc;
        }

        .ud-item.selected {
          background-color: #eff6ff;
        }

        .ud-item-name {
          font-weight: 500;
          color: #1e293b;
          font-size: 14px;
        }

        .ud-empty {
          padding: 16px;
          text-align: center;
          color: #94a3b8;
        }
      </style>
    `;
  }

  /**
   * Ícone de seta
   */
  _getArrowIcon() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
      <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd" />
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
      ? `<span class="ud-value">${this._escapeHtml(selectedUser.name)}</span>`
      : '<span class="ud-value ud-placeholder">Selecione um usuário</span>';

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
          ${displayValue}
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
   * Vincula eventos ao componente
   */
  _bindEvents() {
    if (!this.element) return;

    const trigger = this.element.querySelector('.ud-trigger');
    const list = this.element.querySelector('.ud-list');

    if (trigger) {
      trigger.addEventListener('click', this._handleToggle);
    }

    if (list) {
      list.addEventListener('click', this._handleSelect);
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
