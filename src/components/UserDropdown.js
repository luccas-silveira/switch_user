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
   * CSS mínimo apenas para o menu dropdown (posicionamento)
   */
  _getMenuStyles() {
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
          max-height: 280px;
          overflow-y: auto;
          background: #fff;
          border-radius: 3px;
          box-shadow: 0 3px 6px -4px rgba(0,0,0,.12), 0 6px 16px 0 rgba(0,0,0,.08), 0 9px 28px 8px rgba(0,0,0,.05);
          border: 1px solid rgb(224, 224, 230);
        }
        .ud-menu-portal .hr-base-select-option {
          padding: 8px 12px;
          cursor: pointer;
          font-size: 14px;
          color: rgba(52, 64, 84, 1);
          transition: background-color 0.15s;
        }
        .ud-menu-portal .hr-base-select-option:hover {
          background-color: rgb(250, 250, 252);
        }
        .ud-menu-portal .hr-base-select-option--selected {
          background-color: #eff6ff;
          color: #155EEF;
        }
      </style>
    `;
  }

  /**
   * Renderiza o HTML do componente usando classes GHL
   */
  _render() {
    const { isOpen, selectedUser } = this.state;

    const hasSelection = !!selectedUser;
    const selectionClasses = [
      'hr-base-selection',
      hasSelection ? 'hr-base-selection--selected' : '',
    ].filter(Boolean).join(' ');

    // Tag do usuário selecionado
    const tagHtml = hasSelection ? `
      <div class="hr-base-selection-tag-wrapper">
        <div class="hr-tag hr-tag--closable">
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
      <div class="hr-base-selection__placeholder" style="color: rgba(102, 112, 133, 1);">
        Selecione um usuário
      </div>
    ` : '';

    return `
      <div class="hr-select ui-select" data-component-id="${this.id}" style="position: relative;">
        <div class="${selectionClasses}" style="--n-border: 1px solid rgb(224, 224, 230); --n-border-hover: 1px solid #004EEB; --n-border-focus: 1px solid #155EEF; --n-border-radius: 3px; --n-height: 40px; --n-font-size: 15px; --n-color: rgba(255, 255, 255, 1); --n-text-color: rgba(52, 64, 84, 1); --n-arrow-color: rgba(194, 194, 194, 1); --n-box-shadow-focus: 0 0 0 2px rgba(21, 94, 239, 0.2);">
          <div class="hr-base-selection-tags" tabindex="0">
            ${tagHtml}
            ${placeholderHtml}
            <div class="hr-base-selection-input-tag">
              <input tabindex="-1" class="hr-base-selection-input-tag__input" value="" readonly>
              <span class="hr-base-selection-input-tag__mirror"></span>
            </div>
            <div class="hr-base-loading hr-base-suffix" role="img">
              <div class="hr-base-loading__placeholder">
                <div class="hr-base-clear">
                  <div class="hr-base-clear__placeholder">
                    <i class="hr-base-icon hr-base-suffix__arrow">${this._getArrowIcon()}</i>
                  </div>
                </div>
              </div>
            </div>
          </div>
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
          <div class="hr-base-select-option${selectedUser?.id === user.id ? ' hr-base-select-option--selected' : ''}" data-user-id="${user.id}">
            ${this._escapeHtml(user.name)}
          </div>
        `).join('')
      : '<div class="hr-base-select-option" style="color: rgba(102, 112, 133, 1); cursor: default;">Nenhum usuário disponível</div>';

    return `
      ${this._getMenuStyles()}
      <div class="ud-menu-portal">
        <div class="hr-base-select-menu">
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
    // Não abre se clicou no botão de fechar
    if (event.target.closest('[data-action="clear"]')) {
      return;
    }
    event.stopPropagation();
    event.preventDefault();
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
