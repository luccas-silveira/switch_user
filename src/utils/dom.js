/**
 * Utilitários de DOM
 */

/**
 * Aguarda um elemento aparecer no DOM
 * @param {string} selector
 * @param {Object} options
 * @returns {Promise<Element>}
 */
export function waitForElement(selector, options = {}) {
  const { timeout = 10000, interval = 100, parent = document } = options;

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

export default { waitForElement };
