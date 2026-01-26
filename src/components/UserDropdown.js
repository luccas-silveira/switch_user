/**
 * Componente UserDropdown
 *
 * Substitui o dropdown OpportunityOwner por um dropdown customizado
 * que exibe a lista de usuários obtida via API.
 * Usa as classes CSS nativas do GHL para manter consistência visual.
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
    this.menuElement = null;
    this._mounted = false;

    // Estado do dropdown
    this.state = {
      isOpen: false,
      users: props.users || [],
      selectedUser: null,
    };

    // Callbacks
    this._eventListeners = [];
    this._justToggled = false;

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
   * Ícone de seta (GHL)
   */
  _getArrowIcon() {
    return `<svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3.14645 5.64645C3.34171 5.45118 3.65829 5.45118 3.85355 5.64645L8 9.79289L12.1464 5.64645C12.3417 5.45118 12.6583 5.45118 12.8536 5.64645C13.0488 5.84171 13.0488 6.15829 12.8536 6.35355L8.35355 10.8536C8.15829 11.0488 7.84171 11.0488 7.64645 10.8536L3.14645 6.35355C2.95118 6.15829 2.95118 5.84171 3.14645 5.64645Z" fill="currentColor"></path>
    </svg>`;
  }

  /**
   * Ícone de fechar (GHL)
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
   * CSS variables do menu GHL
   */
  _getMenuStyles() {
    return `--n-height: calc(var(--n-option-height) * 7.6); --n-action-divider-color: rgb(239, 239, 245); --n-action-text-color: rgba(52, 64, 84, 1); --n-bezier: cubic-bezier(.4, 0, .2, 1); --n-border-radius: 3px; --n-color: #fff; --n-option-font-size: 14px; --n-group-header-text-color: rgb(118, 124, 130); --n-option-check-color: #155EEF; --n-option-color-pending: rgb(243, 243, 245); --n-option-color-active: rgba(0, 0, 0, 0); --n-option-color-active-pending: rgb(243, 243, 245); --n-option-height: 34px; --n-option-opacity-disabled: 0.5; --n-option-text-color: rgba(52, 64, 84, 1); --n-option-text-color-active: #155EEF; --n-option-text-color-disabled: rgba(194, 194, 194, 1); --n-option-text-color-pressed: #155EEF; --n-option-padding: 0 12px; --n-option-padding-left: 12px; --n-option-padding-right: 12px; --n-loading-color: #155EEF; --n-loading-size: 18px; --n-menu-box-shadow: 0 3px 6px -4px rgba(0, 0, 0, .12), 0 6px 16px 0 rgba(0, 0, 0, .08), 0 9px 28px 8px rgba(0, 0, 0, .05);`;
  }

  /**
   * CSS para posicionamento do menu portal
   */
  _getPortalStyles() {
    return `
      <style>
        .ud-menu-portal {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          z-index: 999999;
          margin-top: 4px;
        }
        .ud-menu-portal .hr-base-select-menu {
          background: #fff !important;
          border-radius: 3px;
          box-shadow: 0 3px 6px -4px rgba(0, 0, 0, .12), 0 6px 16px 0 rgba(0, 0, 0, .08), 0 9px 28px 8px rgba(0, 0, 0, .05);
          max-height: 280px;
          overflow-y: auto;
        }
        .ud-menu-portal .hr-base-select-option {
          background: #fff;
          cursor: pointer;
        }
        .ud-menu-portal .hr-base-select-option:hover {
          background: rgb(243, 243, 245) !important;
        }
        .ud-menu-portal .hr-base-select-option--pending {
          background: rgb(243, 243, 245) !important;
        }
      </style>
    `;
  }

  /**
   * CSS variables do GHL para o selection
   */
  _getSelectionStyles() {
    return `--n-bezier: cubic-bezier(.4, 0, .2, 1); --n-border: 1px solid rgb(224, 224, 230); --n-border-active: 1px solid #155EEF; --n-border-focus: 1px solid #004EEB; --n-border-hover: 1px solid #004EEB; --n-border-radius: 3px; --n-box-shadow-active: 0 0 0 2px rgba(21, 94, 239, 0.2); --n-box-shadow-focus: 0 0 0 2px rgba(21, 94, 239, 0.2); --n-box-shadow-hover: none; --n-caret-color: #155EEF; --n-color: rgba(255, 255, 255, 1); --n-color-active: rgba(255, 255, 255, 1); --n-color-disabled: rgb(250, 250, 252); --n-font-size: 15px; --n-height: 40px; --n-padding-single-top: 0; --n-padding-multiple-top: 3px; --n-padding-single-right: 26px; --n-padding-multiple-right: 26px; --n-padding-single-left: 12px; --n-padding-multiple-left: 12px; --n-padding-single-bottom: 0; --n-padding-multiple-bottom: 0; --n-placeholder-color: rgba(102, 112, 133, 1); --n-placeholder-color-disabled: rgba(209, 209, 209, 1); --n-text-color: rgba(52, 64, 84, 1); --n-text-color-disabled: rgba(194, 194, 194, 1); --n-arrow-color: rgba(194, 194, 194, 1); --n-arrow-color-disabled: rgba(209, 209, 209, 1); --n-loading-color: #155EEF; --n-color-active-warning: rgba(255, 255, 255, 1); --n-box-shadow-focus-warning: 0 0 0 2px rgba(240, 160, 32, 0.2); --n-box-shadow-active-warning: 0 0 0 2px rgba(240, 160, 32, 0.2); --n-box-shadow-hover-warning: none; --n-border-warning: 1px solid #f0a020; --n-border-focus-warning: 1px solid #fcb040; --n-border-hover-warning: 1px solid #fcb040; --n-border-active-warning: 1px solid #f0a020; --n-color-active-error: rgba(255, 255, 255, 1); --n-box-shadow-focus-error: 0 0 0 2px rgba(217, 45, 32, 0.2); --n-box-shadow-active-error: 0 0 0 2px rgba(217, 45, 32, 0.2); --n-box-shadow-hover-error: none; --n-border-error: 1px solid #D92D20; --n-border-focus-error: 1px solid #B42318; --n-border-hover-error: 1px solid #B42318; --n-border-active-error: 1px solid #D92D20; --n-clear-size: 16px; --n-clear-color: rgba(194, 194, 194, 1); --n-clear-color-hover: rgba(146, 146, 146, 1); --n-clear-color-pressed: rgba(175, 175, 175, 1); --n-arrow-size: 16px;`;
  }

  /**
   * Extrai o nome do owner atual do elemento original
   */
  _getOwnerNameFromElement(element) {
    if (!element) return null;

    const tagContent = element.querySelector('.hr-tag__content, .n-tag__content');
    if (tagContent) {
      const text = tagContent.textContent?.trim();
      return text || null;
    }

    const selectionTag = element.querySelector('.hr-base-selection-tag-wrapper, .n-base-selection-tag-wrapper');
    if (selectionTag) {
      const text = selectionTag.textContent?.trim();
      return text || null;
    }

    const placeholder = element.querySelector('.hr-base-selection-placeholder__inner, .n-base-selection-placeholder__inner');
    if (placeholder) {
      return null;
    }

    const fallbackText = element.textContent?.trim();
    return fallbackText || null;
  }

  /**
   * Inicializa a selecao com base no DOM, se ainda nao houver uma selecionada
   */
  _initializeSelectionFromElement(element) {
    if (this.state.selectedUser) return;

    const ownerName = this._getOwnerNameFromElement(element);
    if (!ownerName) return;

    const matchedUser = this.state.users.find(user => user.name === ownerName);
    if (matchedUser) {
      this.setState({ selectedUser: matchedUser });
      return;
    }

    this.setState({ selectedUser: { id: null, name: ownerName } });
  }

  /**
   * Renderiza o HTML do componente usando classes GHL
   */
  _render() {
    const { isOpen, selectedUser } = this.state;

    const hasSelection = !!selectedUser;
    const selectionClasses = hasSelection
      ? 'hr-base-selection hr-base-selection--selected hr-base-selection--multiple'
      : 'hr-base-selection hr-base-selection--multiple';

    // Tag do usuário selecionado
    const tagHtml = hasSelection ? `
      <div class="hr-base-selection-tag-wrapper">
        <div class="hr-tag hr-tag--closable" style="--n-font-weight-strong: 500; --n-avatar-size-override: calc(28px - 8px); --n-bezier: cubic-bezier(.4, 0, .2, 1); --n-border-radius: 2px; --n-border: 1px solid rgb(224, 224, 230); --n-close-icon-size: 14px; --n-close-color-pressed: rgba(0, 0, 0, .13); --n-close-color-hover: rgba(0, 0, 0, .09); --n-close-border-radius: 2px; --n-close-icon-color: rgba(102, 102, 102, 1); --n-close-icon-color-hover: rgba(102, 102, 102, 1); --n-close-icon-color-pressed: rgba(102, 102, 102, 1); --n-close-icon-color-disabled: rgba(102, 102, 102, 1); --n-close-margin-top: 0; --n-close-margin-right: 0; --n-close-margin-bottom: 0; --n-close-margin-left: 4px; --n-close-size: 18px; --n-color: rgb(250, 250, 252); --n-font-size: 14px; --n-height: 28px; --n-padding: 0 7px; --n-text-color: rgba(52, 64, 84, 1);">
          <span class="hr-tag__content">${this._escapeHtml(selectedUser.name)}</span>
          <button type="button" tabindex="0" aria-label="close" class="hr-base-close hr-base-close--absolute hr-tag__close" data-action="clear">
            <i class="hr-base-icon">${this._getCloseIcon()}</i>
          </button>
          <div class="hr-tag__border"></div>
        </div>
      </div>
    ` : '';

    // Placeholder quando não há seleção
    const placeholderHtml = !hasSelection ? `
      <div class="hr-base-selection-placeholder hr-base-selection-overlay">
        <div class="hr-base-selection-placeholder__inner">Selecione um usuário</div>
      </div>
    ` : '';

    return `
      <div class="hr-select ui-select" data-component-id="${this.id}" style="position: relative;">
        <div class="${selectionClasses}" style="${this._getSelectionStyles()}">
          <div class="hr-base-selection-tags" tabindex="0">
            ${tagHtml}
            <div class="hr-base-selection-input-tag">
              <input tabindex="-1" class="hr-base-selection-input-tag__input" value="" readonly>
              <span class="hr-base-selection-input-tag__mirror"></span>
            </div>
            <div class="hr-base-loading hr-base-suffix" role="img" aria-label="loading">
              <div class="hr-base-loading__placeholder">
                <div class="hr-base-clear">
                  <div class="hr-base-clear__placeholder">
                    <i class="hr-base-icon hr-base-suffix__arrow">${this._getArrowIcon()}</i>
                  </div>
                </div>
              </div>
            </div>
          </div>
          ${placeholderHtml}
          <div class="hr-base-selection__border"></div>
          <div class="hr-base-selection__state-border"></div>
        </div>
        ${this._renderMenu()}
      </div>
    `;
  }

  /**
   * Renderiza o menu dropdown
   */
  _renderMenu() {
    const { isOpen, users, selectedUser } = this.state;

    if (!isOpen) return '';

    const listItems = users.length > 0
      ? users.map(user => `
          <div class="hr-base-select-option hr-base-select-option--show-checkmark${selectedUser?.id === user.id ? ' hr-base-select-option--pending' : ''}" data-user-id="${user.id}">
            <div class="hr-base-select-option__content">
              <div style="font-weight: 400; font-size: 14px; line-height: 20px; padding: 8px 0px; width: 100%; box-sizing: border-box; display: flex; align-items: center; flex-direction: column;">
                <p style="margin: 0px; white-space: nowrap; text-overflow: ellipsis; overflow: hidden; width: 100%;">${this._escapeHtml(user.name)}</p>
                <span style="color: var(--gray-500); margin: 0px; white-space: nowrap; text-overflow: ellipsis; overflow: hidden; width: 100%;"></span>
              </div>
            </div>
          </div>
        `).join('')
      : `<div class="hr-base-select-option">
          <div class="hr-base-select-option__content">
            <div style="font-weight: 400; font-size: 14px; line-height: 20px; padding: 8px 0px; width: 100%;">
              <p style="margin: 0px; color: rgba(102, 112, 133, 1);">Nenhum usuário disponível</p>
            </div>
          </div>
        </div>`;

    return `
      ${this._getPortalStyles()}
      <div class="ud-menu-portal">
        <div tabindex="0" class="hr-base-select-menu hr-base-select-menu--multiple hr-select-menu ui-select__menu" style="${this._getMenuStyles()}">
          <div class="hr-scrollbar" style="--n-scrollbar-bezier: cubic-bezier(.4, 0, .2, 1); --n-scrollbar-color: rgba(0, 0, 0, 0.25); --n-scrollbar-color-hover: rgba(0, 0, 0, 0.4); --n-scrollbar-border-radius: 5px; --n-scrollbar-width: 5px; --n-scrollbar-height: 5px;">
            <div class="hr-virtual-list v-vl">
              <div class="v-vl-items" style="box-sizing: content-box; padding-top: 4px; padding-bottom: 4px;">
                <div class="v-vl-visible-items">
                  ${listItems}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Cria elemento DOM
   */
  _createElement() {
    const temp = document.createElement('div');
    temp.innerHTML = this._render();
    // Retorna o elemento .hr-select diretamente, sem wrapper
    return temp.firstElementChild;
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
    // Não abre se clicou no botão de fechar
    if (event.target.closest('[data-action="clear"]')) {
      return;
    }
    event.stopPropagation();
    event.preventDefault();

    // Flag para ignorar click outside imediatamente após toggle
    this._justToggled = true;
    setTimeout(() => { this._justToggled = false; }, 100);

    this.setState({ isOpen: !this.state.isOpen });
  }

  /**
   * Handler de seleção de usuário
   */
  _handleSelect(event) {
    const item = event.target.closest('.hr-base-select-option');
    if (!item) return;

    const userId = item.dataset.userId;
    if (!userId) return; // Item sem ID (ex: "nenhum usuário")

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
    // Ignora se acabou de fazer toggle (evita fechar imediatamente)
    if (this._justToggled) return;

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

    const selection = this.element.querySelector('.hr-base-selection');
    const menu = this.element.querySelector('.hr-base-select-menu');
    const closeBtn = this.element.querySelector('[data-action="clear"]');

    if (selection) {
      selection.addEventListener('click', this._handleToggle);
    }

    if (menu) {
      menu.addEventListener('click', this._handleSelect);
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

      this._initializeSelectionFromElement(this.originalElement);

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
