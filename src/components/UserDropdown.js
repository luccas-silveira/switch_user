/**
 * Componente UserDropdown
 *
 * Substitui o dropdown OpportunityOwner por um dropdown customizado
 * que exibe a lista de usuários obtida via API.
 * Exibe apenas quando a URL contém o locationId permitido.
 */

import { Component } from './base/index.js';
import { waitForElement } from '../utils/dom.js';
import logger from '../utils/logger.js';

// Location ID permitido para exibição do dropdown
const ALLOWED_LOCATION_ID = 'citQs4acsN1StzOEDuvj';

/**
 * Shape mínimo esperado do array de usuários:
 *
 * [
 *   {
 *     id: string,
 *     name: string,
 *     firstName: string,
 *     lastName: string,
 *     email: string
 *   },
 *   ...
 * ]
 */

export class UserDropdown extends Component {
  constructor(props = {}) {
    super(props);
    this.targetSelector = props.targetSelector || '#OpportunityOwner';
    this.allowedLocationId = props.allowedLocationId || ALLOWED_LOCATION_ID;
    this.originalElement = null;

    // Estado do dropdown
    this.state = {
      isOpen: false,
      users: props.users || [],
      selectedUser: null,
    };

    // Bind de métodos
    this._handleToggle = this._handleToggle.bind(this);
    this._handleSelect = this._handleSelect.bind(this);
    this._handleClickOutside = this._handleClickOutside.bind(this);
  }

  static styles() {
    return `
      .user-dropdown {
        position: relative;
        display: inline-block;
        min-width: 200px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
      }

      .user-dropdown__trigger {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        background: #fff;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        cursor: pointer;
        min-height: 38px;
        transition: border-color 0.15s ease;
      }

      .user-dropdown__trigger:hover {
        border-color: #d1d5db;
      }

      .user-dropdown__trigger--open {
        border-color: #3b82f6;
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
      }

      .user-dropdown__value {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: #374151;
      }

      .user-dropdown__placeholder {
        color: #9ca3af;
      }

      .user-dropdown__arrow {
        margin-left: 8px;
        width: 0;
        height: 0;
        border-left: 5px solid transparent;
        border-right: 5px solid transparent;
        border-top: 5px solid #6b7280;
        transition: transform 0.15s ease;
      }

      .user-dropdown__arrow--open {
        transform: rotate(180deg);
      }

      .user-dropdown__list {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        margin-top: 4px;
        background: #fff;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
        max-height: 240px;
        overflow-y: auto;
        z-index: 1000;
        display: none;
      }

      .user-dropdown__list--open {
        display: block;
      }

      .user-dropdown__item {
        padding: 10px 12px;
        cursor: pointer;
        transition: background-color 0.1s ease;
        border-bottom: 1px solid #f3f4f6;
      }

      .user-dropdown__item:last-child {
        border-bottom: none;
      }

      .user-dropdown__item:hover {
        background-color: #f9fafb;
      }

      .user-dropdown__item--selected {
        background-color: #eff6ff;
      }

      .user-dropdown__item-name {
        font-weight: 500;
        color: #374151;
      }

      .user-dropdown__item-email {
        font-size: 12px;
        color: #9ca3af;
        margin-top: 2px;
      }

      .user-dropdown__empty {
        padding: 12px;
        text-align: center;
        color: #9ca3af;
      }
    `;
  }

  /**
   * Popula a lista de usuários no dropdown
   * @param {Array} users - Array de objetos de usuário
   */
  setUsers(users) {
    this.setState({ users: users || [] });
  }

  /**
   * Renderiza o componente
   */
  render() {
    const { isOpen, users, selectedUser } = this.state;

    const displayValue = selectedUser
      ? selectedUser.name
      : '<span class="user-dropdown__placeholder">Selecione um usuário</span>';

    const listItems = users.length > 0
      ? users.map(user => `
          <div class="user-dropdown__item${selectedUser?.id === user.id ? ' user-dropdown__item--selected' : ''}"
               data-user-id="${user.id}">
            <div class="user-dropdown__item-name">${this._escapeHtml(user.name)}</div>
            <div class="user-dropdown__item-email">${this._escapeHtml(user.email)}</div>
          </div>
        `).join('')
      : '<div class="user-dropdown__empty">Nenhum usuário disponível</div>';

    return `
      <div class="user-dropdown">
        <div class="user-dropdown__trigger${isOpen ? ' user-dropdown__trigger--open' : ''}">
          <span class="user-dropdown__value">${displayValue}</span>
          <span class="user-dropdown__arrow${isOpen ? ' user-dropdown__arrow--open' : ''}"></span>
        </div>
        <div class="user-dropdown__list${isOpen ? ' user-dropdown__list--open' : ''}">
          ${listItems}
        </div>
      </div>
    `;
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
    this.setState({ isOpen: !this.state.isOpen });
  }

  /**
   * Handler de seleção de usuário
   */
  _handleSelect(event) {
    const item = event.target.closest('.user-dropdown__item');
    if (!item) return;

    const userId = item.dataset.userId;
    const selectedUser = this.state.users.find(u => u.id === userId);

    if (selectedUser) {
      this.setState({
        selectedUser,
        isOpen: false,
      });
      this.emit('user:selected', selectedUser);
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

    const trigger = this.element.querySelector('.user-dropdown__trigger');
    const list = this.element.querySelector('.user-dropdown__list');

    if (trigger) {
      trigger.addEventListener('click', this._handleToggle);
    }

    if (list) {
      list.addEventListener('click', this._handleSelect);
    }

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

      // Insere o dropdown customizado após o elemento original
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

      logger.debug(`UserDropdown montado substituindo: ${this.targetSelector}`);
      return this.element;
    } catch (error) {
      logger.error(`Erro ao montar UserDropdown: ${error.message}`);
      return null;
    }
  }

  /**
   * Restaura o elemento original ao desmontar
   */
  onUnmount() {
    this._unbindEvents();
    if (this.originalElement) {
      this.originalElement.style.display = '';
      logger.debug('Elemento original restaurado');
    }
  }
}

export default UserDropdown;
