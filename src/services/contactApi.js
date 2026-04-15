/**
 * Serviço GHL — Contatos
 */

import { getHeaders, BASE_URL } from './http.js';

/**
 * Adiciona um seguidor ao contato
 * @param {string} contactId
 * @param {string} userId
 * @returns {Promise<{ok, status, data}>}
 */
export async function addContactFollower(contactId, userId) {
  if (!contactId || !userId) {
    return { ok: false, status: 0, data: { message: 'contactId ou userId ausente' } };
  }
  const response = await fetch(`${BASE_URL}/contacts/${contactId}/followers`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ followers: [userId] }),
  });
  let data = null;
  try { data = await response.json(); } catch (_) {}
  return { ok: response.ok, status: response.status, data };
}

/**
 * Busca um contato pelo ID
 * @param {string} contactId
 * @returns {Promise<{ok, status, data}>}
 */
export async function fetchContactById(contactId) {
  if (!contactId) {
    return { ok: false, status: 0, data: { message: 'contactId ausente' } };
  }
  const response = await fetch(`${BASE_URL}/contacts/${contactId}`, {
    method: 'GET',
    headers: getHeaders(),
  });
  let data = null;
  try { data = await response.json(); } catch (_) {}
  return { ok: response.ok, status: response.status, data };
}

/**
 * Atualiza o owner de um contato (assignedTo)
 * @param {string} contactId
 * @param {string} userId
 * @returns {Promise<{ok, status, data}>}
 */
export async function updateContactOwner(contactId, userId) {
  if (!contactId || !userId) {
    return { ok: false, status: 0, data: { message: 'contactId ou userId ausente' } };
  }
  const response = await fetch(`${BASE_URL}/contacts/${contactId}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ assignedTo: userId }),
  });
  let data = null;
  try { data = await response.json(); } catch (_) {}
  return { ok: response.ok, status: response.status, data };
}

export default { addContactFollower, fetchContactById, updateContactOwner };
