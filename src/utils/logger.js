/**
 * Sistema de logging isolado
 *
 * Fornece logs prefixados e condicionais baseados no modo debug.
 */

import { getConfig, getNamespace } from '../config/index.js';

const LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

/**
 * Formata mensagem com prefixo e timestamp
 * @param {string} level - Nível do log
 * @param {string} message - Mensagem
 * @returns {string}
 */
function formatMessage(level, message) {
  const namespace = getNamespace();
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  return `[${namespace}][${timestamp}][${level}] ${message}`;
}

/**
 * Logger principal
 *
 * Por padrão, apenas erros são exibidos.
 * Para ver logs de debug/info/warn, habilite config.debug = true
 */
export const logger = {
  /**
   * Log de debug (apenas se debug estiver habilitado)
   * @param {string} message
   * @param {...any} args
   */
  debug(message, ...args) {
    const config = getConfig();
    if (config.debug) {
      console.log(formatMessage('DEBUG', message), ...args);
    }
  },

  /**
   * Log informativo (apenas se debug estiver habilitado)
   * @param {string} message
   * @param {...any} args
   */
  info(message, ...args) {
    const config = getConfig();
    if (config.debug) {
      console.info(formatMessage('INFO', message), ...args);
    }
  },

  /**
   * Log de aviso (apenas se debug estiver habilitado)
   * @param {string} message
   * @param {...any} args
   */
  warn(message, ...args) {
    const config = getConfig();
    if (config.debug) {
      console.warn(formatMessage('WARN', message), ...args);
    }
  },

  /**
   * Log de erro (sempre exibido)
   * @param {string} message
   * @param {...any} args
   */
  error(message, ...args) {
    console.error(formatMessage('ERROR', message), ...args);

    // Dispara hook de erro se configurado
    const config = getConfig();
    if (config.hooks.onError) {
      try {
        config.hooks.onError(new Error(message), args);
      } catch (e) {
        console.error(formatMessage('ERROR', 'Erro no hook onError'), e);
      }
    }
  },

  /**
   * Agrupa logs em um grupo colapsável (apenas se debug estiver habilitado)
   * @param {string} label
   * @param {Function} fn
   */
  group(label, fn) {
    const config = getConfig();
    if (!config.debug) return;

    console.groupCollapsed(formatMessage('GROUP', label));
    try {
      fn();
    } finally {
      console.groupEnd();
    }
  },
};

export default logger;
