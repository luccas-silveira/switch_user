/**
 * Servico de API de Contatos do GoHighLevel
 *
 * Funcoes para gerenciar seguidores de contatos.
 */

const API_CONFIG = {
  baseUrl: 'https://services.leadconnectorhq.com',
  token: 'pit-301590c6-a6cb-47d5-a7f4-bc5c4f5c22d4',
  version: '2021-07-28',
};

function getHeaders() {
  return {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_CONFIG.token}`,
    'Version': API_CONFIG.version,
  };
}

/**
 * Adiciona um seguidor ao contato
 *
 * @param {string} contactId
 * @param {string} userId
 * @returns {Promise<Object>} Resposta da API
 */
export async function addContactFollower(contactId, userId) {
  if (!contactId || !userId) {
    return { ok: false, status: 0, data: { message: 'contactId ou userId ausente' } };
  }

  const url = `${API_CONFIG.baseUrl}/contacts/${contactId}/followers`;
  const payload = { followers: [userId] };

  const response = await fetch(url, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });

  let data = null;
  try {
    data = await response.json();
  } catch (error) {
    data = null;
  }

  return {
    ok: response.ok,
    status: response.status,
    data: data,
  };
}

export default {
  addContactFollower,
};
