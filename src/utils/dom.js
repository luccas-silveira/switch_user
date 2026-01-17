/**
 * Utilitários de manipulação de DOM
 *
 * Funções auxiliares para interagir com o DOM de forma segura,
 * sem dependência de variáveis globais do host.
 */

import { getConfig, getNamespace } from '../config/index.js';

/**
 * Aguarda um elemento aparecer no DOM
 * @param {string} selector - Seletor CSS do elemento
 * @param {Object} options - Opções de configuração
 * @returns {Promise<Element>}
 */
export function waitForElement(selector, options = {}) {
  const config = getConfig();
  const {
    timeout = config.domTimeout,
    interval = config.retryInterval,
    parent = document,
  } = options;

  return new Promise((resolve, reject) => {
    const element = parent.querySelector(selector);
    if (element) {
      resolve(element);
      return;
    }

    const startTime = Date.now();
    const intervalId = setInterval(() => {
      const el = parent.querySelector(selector);
      if (el) {
        clearInterval(intervalId);
        resolve(el);
        return;
      }

      if (Date.now() - startTime >= timeout) {
        clearInterval(intervalId);
        reject(new Error(`Timeout: elemento "${selector}" não encontrado`));
      }
    }, interval);
  });
}

/**
 * Aguarda o DOM estar pronto
 * @returns {Promise<void>}
 */
export function waitForDOMReady() {
  return new Promise((resolve) => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', resolve, { once: true });
    } else {
      resolve();
    }
  });
}

/**
 * Cria um elemento com atributos e filhos
 * @param {string} tag - Nome da tag
 * @param {Object} attrs - Atributos do elemento
 * @param {Array|string} children - Filhos do elemento
 * @returns {Element}
 */
export function createElement(tag, attrs = {}, children = []) {
  const element = document.createElement(tag);

  Object.entries(attrs).forEach(([key, value]) => {
    if (key === 'className') {
      element.className = value;
    } else if (key === 'style' && typeof value === 'object') {
      Object.assign(element.style, value);
    } else if (key.startsWith('on') && typeof value === 'function') {
      const event = key.slice(2).toLowerCase();
      element.addEventListener(event, value);
    } else if (key === 'dataset' && typeof value === 'object') {
      Object.entries(value).forEach(([dataKey, dataValue]) => {
        element.dataset[dataKey] = dataValue;
      });
    } else {
      element.setAttribute(key, value);
    }
  });

  const childArray = Array.isArray(children) ? children : [children];
  childArray.forEach((child) => {
    if (typeof child === 'string') {
      element.appendChild(document.createTextNode(child));
    } else if (child instanceof Node) {
      element.appendChild(child);
    }
  });

  return element;
}

/**
 * Gera um ID único com namespace
 * @param {string} suffix - Sufixo para o ID
 * @returns {string}
 */
export function generateId(suffix = '') {
  const namespace = getNamespace();
  const random = Math.random().toString(36).substring(2, 9);
  return `${namespace}-${suffix ? suffix + '-' : ''}${random}`;
}

/**
 * Remove um elemento do DOM de forma segura
 * @param {Element} element - Elemento a remover
 */
export function safeRemove(element) {
  if (element && element.parentNode) {
    element.parentNode.removeChild(element);
  }
}

/**
 * Verifica se um elemento está visível
 * @param {Element} element - Elemento a verificar
 * @returns {boolean}
 */
export function isVisible(element) {
  if (!element) return false;
  const style = window.getComputedStyle(element);
  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.opacity !== '0'
  );
}

/**
 * Observa mudanças em um elemento ou seus descendentes
 * @param {Element} target - Elemento a observar
 * @param {Function} callback - Função a chamar quando houver mudanças
 * @param {Object} options - Opções do MutationObserver
 * @returns {MutationObserver}
 */
export function observeDOM(target, callback, options = {}) {
  const config = {
    childList: true,
    subtree: true,
    ...options,
  };

  const observer = new MutationObserver((mutations) => {
    callback(mutations, observer);
  });

  observer.observe(target, config);
  return observer;
}

export default {
  waitForElement,
  waitForDOMReady,
  createElement,
  generateId,
  safeRemove,
  isVisible,
  observeDOM,
};
