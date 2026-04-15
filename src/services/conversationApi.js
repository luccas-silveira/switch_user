/**
 * Serviço GHL — Conversas
 */

import { getHeaders, BASE_URL } from './http.js';

/**
 * Busca uma conversa pelo ID
 * @param {string} conversationId
 * @returns {Promise<{ok, status, data}>}
 */
export async function fetchConversationById(conversationId) {
  if (!conversationId) {
    return { ok: false, status: 0, data: { message: 'conversationId ausente' } };
  }
  const response = await fetch(`${BASE_URL}/conversations/${conversationId}`, {
    method: 'GET',
    headers: getHeaders(),
  });
  let data = null;
  try { data = await response.json(); } catch (_) {}
  return { ok: response.ok, status: response.status, data };
}

export default { fetchConversationById };
