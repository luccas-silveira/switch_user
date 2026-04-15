/**
 * Logger com prefixo
 *
 * debug/info/warn só aparecem quando DEBUG = true.
 * error sempre aparece no console.
 */

const NAMESPACE = 'switch-user';
const DEBUG = false;

function fmt(level, message) {
  const time = new Date().toISOString().split('T')[1].split('.')[0];
  return `[${NAMESPACE}][${time}][${level}] ${message}`;
}

export const logger = {
  debug(message, ...args) {
    if (DEBUG) console.log(fmt('DEBUG', message), ...args);
  },
  info(message, ...args) {
    if (DEBUG) console.info(fmt('INFO', message), ...args);
  },
  warn(message, ...args) {
    if (DEBUG) console.warn(fmt('WARN', message), ...args);
  },
  error(message, ...args) {
    console.error(fmt('ERROR', message), ...args);
  },
};

export default logger;
