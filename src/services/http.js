/**
 * Serviço HTTP genérico
 *
 * Função reutilizável para executar requisições HTTP.
 * Endpoint, headers e token são injetados via configuração.
 */

/**
 * Configuração da requisição (injetável externamente)
 */
let requestConfig = {
  baseUrl: '',
  endpoint: '',
  method: 'GET',
  headers: {},
  body: null,
};

/**
 * Define a configuração da requisição
 * @param {Object} config - Configuração a ser mesclada
 */
export function setRequestConfig(config) {
  requestConfig = { ...requestConfig, ...config };
}

/**
 * Obtém a configuração atual
 * @returns {Object}
 */
export function getRequestConfig() {
  return { ...requestConfig };
}

/**
 * Executa a requisição HTTP
 * @param {Object} overrides - Sobrescreve configuração para esta chamada específica
 * @returns {Promise<Object>} Resposta da API
 */
export async function executeRequest(overrides = {}) {
  const config = { ...requestConfig, ...overrides };

  const url = config.baseUrl + config.endpoint;

  const options = {
    method: config.method,
    headers: config.headers,
  };

  if (config.body && config.method !== 'GET') {
    options.body = JSON.stringify(config.body);
  }

  const response = await fetch(url, options);
  const data = await response.json();

  return {
    ok: response.ok,
    status: response.status,
    data,
  };
}

export default {
  setRequestConfig,
  getRequestConfig,
  executeRequest,
};
