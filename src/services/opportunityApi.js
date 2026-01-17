/**
 * Serviço de API de Oportunidades do GoHighLevel
 *
 * Função para atualizar o proprietário (owner) de uma oportunidade.
 * Baseado na documentação: https://marketplace.gohighlevel.com/docs/ghl/opportunities/update-opportunity
 */

// Configuração da API
const API_CONFIG = {
  baseUrl: 'https://services.leadconnectorhq.com',
  token: 'pit-301590c6-a6cb-47d5-a7f4-bc5c4f5c22d4',
  version: '2021-07-28',
};

/**
 * Atualiza o proprietário (owner) de uma oportunidade
 *
 * @param {string} opportunityId - ID da oportunidade (ex: "6K751fruiDXO8xr50IE4")
 * @param {string} userId - ID do usuário que será o novo owner (ex: "jJ9mhTPtUO1zZDeTWpLM")
 * @returns {Promise<Object>} Resposta da API
 *
 * Método HTTP: PUT
 * Endpoint: /opportunities/{opportunityId}
 * Headers:
 *   - Authorization: Bearer {token}
 *   - Version: 2021-07-28
 *   - Content-Type: application/json
 * Payload:
 *   - assignedTo: string (userId do novo owner)
 */
export async function updateOpportunityOwner(opportunityId, userId) {
  const url = `${API_CONFIG.baseUrl}/opportunities/${opportunityId}`;

  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_CONFIG.token}`,
    'Version': API_CONFIG.version,
  };

  const payload = {
    assignedTo: userId,
  };

  const response = await fetch(url, {
    method: 'PUT',
    headers: headers,
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  return {
    ok: response.ok,
    status: response.status,
    data: data,
  };
}

/**
 * Extrai o opportunityId da URL atual
 * Padrão: /opportunities/list/{opportunityId}?tab=...
 *
 * @returns {string|null}
 */
export function getOpportunityIdFromUrl() {
  const url = window.location.pathname;
  const match = url.match(/\/opportunities\/list\/([^\/\?]+)/);
  return match ? match[1] : null;
}

export default {
  updateOpportunityOwner,
  getOpportunityIdFromUrl,
};
