/**
 * Componente UserDropdown
 *
 * Injeta um dropdown de seleção de usuário no header de conversas do GHL.
 * Usa estilos inline próprios para não depender das classes CSS do GHL.
 * O menu é renderizado como portal (position: fixed, appended ao body).
 */

import { waitForElement } from '../utils/dom.js';
import logger from '../utils/logger.js';

const ALLOWED_LOCATION_ID = 'citQs4acsN1StzOEDuvj';

export class UserDropdown {
  constructor(props = {}) {
    this.id = 'user-dropdown-' + Math.random().toString(36).substring(2, 9);
    this.targetSelector = props.targetSelector || '#OpportunityOwner';
    this.allowedLocationId = props.allowedLocationId || ALLOWED_LOCATION_ID;
    this.originalElement = null;
    this.element = null;
    this._menuEl = null;
    this._mounted = false;

    this.state = {
      isOpen: false,
      users: props.users || [],
      selectedUser: null,
    };

    this._eventListeners = [];
    this._justToggled = false;

    this._handleToggle = this._handleToggle.bind(this);
    this._handleSelect = this._handleSelect.bind(this);
    this._handleClickOutside = this._handleClickOutside.bind(this);
    this._handleClear = this._handleClear.bind(this);
  }

  // ─── API pública ──────────────────────────────────────────────────────────────

  on(event, callback) {
    this._eventListeners.push({ event, callback });
  }

  emit(event, data) {
    this._eventListeners
      .filter(l => l.event === event)
      .forEach(l => l.callback(data));
  }

  setState(newState) {
    this.state = { ...this.state, ...newState };
    if (this._mounted) {
      this._rerender();
      if (this.state.isOpen) {
        this._showMenu();
      } else {
        this._hideMenu();
      }
    }
  }

  setUsers(users) {
    this.setState({ users: users || [] });
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }

  // ─── Renderização do trigger ──────────────────────────────────────────────────

  _renderTrigger() {
    const { selectedUser } = this.state;
    const label = selectedUser ? this._escapeHtml(selectedUser.name) : 'Responsável';
    const hasSelection = !!selectedUser;

    return `
      <button type="button" class="zoi-ud-trigger" style="
        display:flex;align-items:center;gap:6px;
        padding:4px 10px;border:1px solid #d0d5dd;border-radius:6px;
        cursor:pointer;background:#fff;font-size:13px;
        color:${hasSelection ? '#101828' : '#667085'};
        height:32px;white-space:nowrap;user-select:none;
        font-family:inherit;line-height:1;flex-shrink:0;
        box-shadow:none;outline:none;
      ">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
        <span>${label}</span>
        ${hasSelection ? `
          <span data-action="clear" style="display:flex;align-items:center;padding:0 2px;color:#98a2b3;" title="Remover">
            <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor">
              <path d="M2.09 2.22C2.32 1.97 2.59 1.95 2.78 2.09L6 5.29L9.15 2.15C9.34 1.95 9.66 1.95 9.85 2.15C10.05 2.34 10.05 2.66 9.85 2.85L6.71 6L9.85 9.15C10.05 9.34 10.05 9.66 9.85 9.85C9.66 10.05 9.34 10.05 9.15 9.85L6 6.71L2.85 9.85C2.66 10.05 2.34 10.05 2.15 9.85C1.95 9.66 1.95 9.34 2.15 9.15L5.29 6L2.15 2.85C1.97 2.68 1.95 2.41 2.09 2.22Z"/>
            </svg>
          </span>
        ` : ''}
        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" style="opacity:0.5;flex-shrink:0;">
          <path d="M3.15 5.65C3.34 5.45 3.66 5.45 3.85 5.65L8 9.79L12.15 5.65C12.34 5.45 12.66 5.45 12.85 5.65C13.05 5.84 13.05 6.16 12.85 6.35L8.35 10.85C8.16 11.05 7.84 11.05 7.65 10.85L3.15 6.35C2.95 6.16 2.95 5.84 3.15 5.65Z"/>
        </svg>
      </button>
    `;
  }

  _render() {
    return `
      <div class="zoi-ud-root" data-component-id="${this.id}" style="position:relative;display:inline-flex;">
        ${this._renderTrigger()}
      </div>
    `;
  }

  // ─── Menu portal (position: fixed, appendado ao body) ─────────────────────────

  _renderMenuItems() {
    const { users, selectedUser } = this.state;
    if (users.length === 0) {
      return '<div style="padding:10px 12px;font-size:13px;color:#667085;">Nenhum usuário disponível</div>';
    }
    return users.map(u => {
      const isSelected = selectedUser?.id === u.id;
      return `
        <div class="zoi-ud-option" data-user-id="${u.id}" style="
          padding:8px 12px;cursor:pointer;font-size:13px;
          color:${isSelected ? '#155EEF' : '#101828'};
          background:${isSelected ? '#EEF4FF' : '#fff'};
          display:flex;align-items:center;gap:8px;
        ">
          <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
            ${this._escapeHtml(u.name)}
          </span>
          ${isSelected ? `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#155EEF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          ` : ''}
        </div>
      `;
    }).join('');
  }

  _showMenu() {
    this._hideMenu();
    if (!this.element) return;
    const trigger = this.element.querySelector('.zoi-ud-trigger');
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();

    this._menuEl = document.createElement('div');
    this._menuEl.className = 'zoi-ud-menu-portal';
    this._menuEl.style.cssText = [
      'position:fixed',
      'top:' + Math.round(rect.bottom + 4) + 'px',
      'left:' + Math.round(rect.left) + 'px',
      'min-width:' + Math.max(Math.round(rect.width), 200) + 'px',
      'max-height:280px',
      'overflow-y:auto',
      'background:#fff',
      'border:1px solid #d0d5dd',
      'border-radius:8px',
      'box-shadow:0 8px 24px rgba(16,24,40,0.12)',
      'z-index:2147483647',
      'font-family:inherit',
    ].join(';');

    // Conteúdo sanitizado: _escapeHtml() garante XSS-safe
    this._menuEl.innerHTML = this._renderMenuItems(); // safe: escapeHtml applied to all user content
    document.body.appendChild(this._menuEl);
    this._menuEl.addEventListener('click', this._handleSelect);

    this._menuEl.addEventListener('mouseover', (e) => {
      const opt = e.target.closest('.zoi-ud-option');
      if (opt && opt.dataset.userId !== this.state.selectedUser?.id) {
        opt.style.background = '#f9fafb';
      }
    });
    this._menuEl.addEventListener('mouseout', (e) => {
      const opt = e.target.closest('.zoi-ud-option');
      if (opt) {
        opt.style.background = opt.dataset.userId === this.state.selectedUser?.id ? '#EEF4FF' : '#fff';
      }
    });
  }

  _hideMenu() {
    if (this._menuEl) {
      this._menuEl.removeEventListener('click', this._handleSelect);
      this._menuEl.remove();
      this._menuEl = null;
    }
  }

  // ─── Criação e atualização do elemento DOM ────────────────────────────────────

  _createElement() {
    const temp = document.createElement('div');
    temp.innerHTML = this._render(); // safe: _escapeHtml() applied to all user-supplied content
    return temp.firstElementChild;
  }

  _rerender() {
    if (!this.element || !this.element.parentNode) return;
    const parent = this.element.parentNode;
    const newElement = this._createElement();
    parent.replaceChild(newElement, this.element);
    this.element = newElement;
    this._bindEvents();
    logger.debug(`Componente re-renderizado: ${this.id}`);
  }

  // ─── Handlers de evento ───────────────────────────────────────────────────────

  _handleToggle(event) {
    if (event.target.closest('[data-action="clear"]')) return;
    event.stopPropagation();
    event.preventDefault();
    this._justToggled = true;
    setTimeout(() => { this._justToggled = false; }, 100);
    this.setState({ isOpen: !this.state.isOpen });
  }

  _handleSelect(event) {
    const item = event.target.closest('.zoi-ud-option');
    if (!item) return;
    const userId = item.dataset.userId;
    if (!userId) return;
    const selectedUser = this.state.users.find(u => u.id === userId);
    if (selectedUser) {
      this.setState({ selectedUser, isOpen: false });
      this.emit('user:selected', selectedUser);
      logger.debug(`Usuário selecionado: ${selectedUser.name}`);
    }
  }

  _handleClickOutside(event) {
    if (this._justToggled) return;
    const clickedInMenu = this._menuEl && this._menuEl.contains(event.target);
    const clickedInTrigger = this.element && this.element.contains(event.target);
    if (!clickedInMenu && !clickedInTrigger && this.state.isOpen) {
      this.setState({ isOpen: false });
    }
  }

  _handleClear(event) {
    event.stopPropagation();
    event.preventDefault();
    this.setState({ selectedUser: null, isOpen: false });
    this.emit('user:cleared', null);
    logger.debug('Seleção limpa');
  }

  // ─── Vinculação de eventos ────────────────────────────────────────────────────

  _bindEvents() {
    if (!this.element) return;
    const trigger = this.element.querySelector('.zoi-ud-trigger');
    if (trigger) {
      trigger.addEventListener('click', this._handleToggle);
    }
    const clearBtn = this.element.querySelector('[data-action="clear"]');
    if (clearBtn) {
      clearBtn.addEventListener('click', this._handleClear);
    }
    document.removeEventListener('click', this._handleClickOutside);
    document.addEventListener('click', this._handleClickOutside);
  }

  _unbindEvents() {
    document.removeEventListener('click', this._handleClickOutside);
    this._hideMenu();
  }

  // ─── Helpers de mountReplacing ────────────────────────────────────────────────

  _getLocationIdFromUrl() {
    const url = window.location.pathname;
    const match = url.match(/\/location\/([^\/]+)/);
    return match ? match[1] : null;
  }

  _isAllowedLocation() {
    return this._getLocationIdFromUrl() === this.allowedLocationId;
  }

  _getOwnerNameFromElement(element) {
    if (!element) return null;
    const tagContent = element.querySelector('.hr-tag__content, .n-tag__content');
    if (tagContent) return tagContent.textContent?.trim() || null;
    const selectionTag = element.querySelector('.hr-base-selection-tag-wrapper, .n-base-selection-tag-wrapper');
    if (selectionTag) return selectionTag.textContent?.trim() || null;
    const placeholder = element.querySelector('.hr-base-selection-placeholder__inner, .n-base-selection-placeholder__inner');
    if (placeholder) return null;
    return element.textContent?.trim() || null;
  }

  _initializeSelectionFromElement(element) {
    if (this.state.selectedUser) return;
    const ownerName = this._getOwnerNameFromElement(element);
    if (!ownerName) return;
    const matchedUser = this.state.users.find(user => user.name === ownerName);
    this.setState({ selectedUser: matchedUser || { id: null, name: ownerName } });
  }

  // ─── Métodos de montagem ──────────────────────────────────────────────────────

  /**
   * Monta o componente substituindo o dropdown original do GHL
   */
  async mountReplacing() {
    try {
      if (!this._isAllowedLocation()) {
        logger.debug('UserDropdown não exibido: location não permitida');
        return null;
      }
      this.originalElement = await waitForElement(this.targetSelector, { timeout: 10000 });
      if (!this.originalElement) {
        logger.error(`Elemento não encontrado: ${this.targetSelector}`);
        return null;
      }
      this._initializeSelectionFromElement(this.originalElement);
      this.originalElement.style.display = 'none';
      this.element = this._createElement();
      this.originalElement.parentNode.insertBefore(this.element, this.originalElement.nextSibling);
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
   * Monta o componente dentro de um container existente (sem substituir elemento nativo)
   * @param {HTMLElement} container - elemento onde o dropdown será appendado
   * @returns {HTMLElement|null}
   */
  mountInto(container) {
    try {
      if (!container) {
        logger.error('UserDropdown.mountInto: container não fornecido');
        return null;
      }
      this.element = this._createElement();
      container.appendChild(this.element);
      this._mounted = true;
      this._bindEvents();
      logger.debug('UserDropdown montado dentro de container');
      return this.element;
    } catch (error) {
      logger.error(`Erro ao montar UserDropdown em container: ${error.message}`);
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
