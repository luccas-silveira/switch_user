/**
 * Configuração central da API GHL
 *
 * Única fonte de API_CONFIG e getHeaders para todos os serviços.
 */

const API_CONFIG = {
  baseUrl: 'https://services.leadconnectorhq.com',
  token: 'pit-301590c6-a6cb-47d5-a7f4-bc5c4f5c22d4',
  version: '2021-07-28',
};

export const BASE_URL = API_CONFIG.baseUrl;

export function setApiToken(token) {
  API_CONFIG.token = token;
}

export function getHeaders() {
  return {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_CONFIG.token}`,
    'Version': API_CONFIG.version,
  };
}

export default { setApiToken, getHeaders };
