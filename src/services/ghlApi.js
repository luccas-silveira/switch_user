/**
 * Serviço GHL — Usuários
 */

import { getHeaders, BASE_URL } from './http.js';

/**
 * Busca usuários por Location ID
 * @param {string} locationId
 * @returns {Promise<Array>}
 */
export async function fetchUsersByLocation(locationId) {
  const response = await fetch(`${BASE_URL}/users/?locationId=${locationId}`, {
    method: 'GET',
    headers: getHeaders(),
  });
  if (!response.ok) throw new Error(`Erro ao buscar usuários: ${response.status}`);
  const data = await response.json();
  return data.users || [];
}

export default { fetchUsersByLocation };
