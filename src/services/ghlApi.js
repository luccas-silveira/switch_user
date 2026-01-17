/**
 * Serviço de API do GoHighLevel
 *
 * Funções para comunicação com a API do GHL.
 */

// Configuração da API
const API_CONFIG = {
  baseUrl: 'https://services.leadconnectorhq.com',
  token: 'pit-301590c6-a6cb-47d5-a7f4-bc5c4f5c22d4',
  version: '2021-07-28',
};

/**
 * Configura o token de autenticação
 * @param {string} token
 */
export function setApiToken(token) {
  API_CONFIG.token = token;
}

/**
 * Obtém headers padrão para requisições
 * @returns {Object}
 */
function getHeaders() {
  return {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_CONFIG.token}`,
    'Version': API_CONFIG.version,
  };
}

/**
 * Busca usuários por Location ID
 * @param {string} locationId - ID do location
 * @returns {Promise<Array>} Lista de usuários
 */
export async function fetchUsersByLocation(locationId) {
  const url = `${API_CONFIG.baseUrl}/users/?locationId=${locationId}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Erro ao buscar usuários: ${response.status}`);
  }

  const data = await response.json();
  return data.users || [];
}

/**
 * Extrai o locationId da URL atual
 * @returns {string|null}
 */
export function getLocationIdFromUrl() {
  const url = window.location.pathname;
  const match = url.match(/\/location\/([^\/]+)/);
  return match ? match[1] : null;
}

export default {
  setApiToken,
  fetchUsersByLocation,
  getLocationIdFromUrl,
};
