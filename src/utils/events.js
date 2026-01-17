/**
 * Sistema de eventos interno (Event Bus)
 *
 * Permite comunicação entre componentes sem dependência
 * de variáveis globais ou eventos do host.
 */

import { getNamespace } from '../config/index.js';
import logger from './logger.js';

class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  /**
   * Prefixo o evento com o namespace
   * @param {string} event
   * @returns {string}
   */
  _prefixEvent(event) {
    return `${getNamespace()}:${event}`;
  }

  /**
   * Registra um listener para um evento
   * @param {string} event - Nome do evento
   * @param {Function} callback - Função a chamar
   * @returns {Function} Função para remover o listener
   */
  on(event, callback) {
    const prefixedEvent = this._prefixEvent(event);

    if (!this.listeners.has(prefixedEvent)) {
      this.listeners.set(prefixedEvent, new Set());
    }

    this.listeners.get(prefixedEvent).add(callback);
    logger.debug(`Listener registrado para evento: ${event}`);

    // Retorna função de cleanup
    return () => this.off(event, callback);
  }

  /**
   * Registra um listener que executa apenas uma vez
   * @param {string} event - Nome do evento
   * @param {Function} callback - Função a chamar
   * @returns {Function} Função para remover o listener
   */
  once(event, callback) {
    const wrapper = (...args) => {
      this.off(event, wrapper);
      callback(...args);
    };
    return this.on(event, wrapper);
  }

  /**
   * Remove um listener de um evento
   * @param {string} event - Nome do evento
   * @param {Function} callback - Função a remover
   */
  off(event, callback) {
    const prefixedEvent = this._prefixEvent(event);
    const listeners = this.listeners.get(prefixedEvent);

    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) {
        this.listeners.delete(prefixedEvent);
      }
      logger.debug(`Listener removido do evento: ${event}`);
    }
  }

  /**
   * Emite um evento para todos os listeners
   * @param {string} event - Nome do evento
   * @param {any} data - Dados a passar para os listeners
   */
  emit(event, data) {
    const prefixedEvent = this._prefixEvent(event);
    const listeners = this.listeners.get(prefixedEvent);

    logger.debug(`Evento emitido: ${event}`, data);

    if (listeners) {
      listeners.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          logger.error(`Erro ao executar listener do evento ${event}:`, error);
        }
      });
    }
  }

  /**
   * Remove todos os listeners de um evento ou todos os eventos
   * @param {string} event - Nome do evento (opcional)
   */
  clear(event) {
    if (event) {
      const prefixedEvent = this._prefixEvent(event);
      this.listeners.delete(prefixedEvent);
      logger.debug(`Listeners limpos do evento: ${event}`);
    } else {
      this.listeners.clear();
      logger.debug('Todos os listeners foram limpos');
    }
  }
}

// Instância singleton do event bus
export const eventBus = new EventBus();

export default eventBus;
