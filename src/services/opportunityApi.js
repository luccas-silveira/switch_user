/**
 * Serviço GHL — Oportunidades
 */

import { getHeaders, BASE_URL } from './http.js';

/**
 * Atualiza o owner de uma oportunidade
 * @param {string} opportunityId
 * @param {string} userId
 * @returns {Promise<{ok, status, data}>}
 */
export async function updateOpportunityOwner(opportunityId, userId) {
  const response = await fetch(`${BASE_URL}/opportunities/${opportunityId}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ assignedTo: userId }),
  });
  const data = await response.json();
  return { ok: response.ok, status: response.status, data };
}

/**
 * Busca uma oportunidade pelo ID
 * @param {string} opportunityId
 * @returns {Promise<{ok, status, data}>}
 */
export async function fetchOpportunityById(opportunityId) {
  if (!opportunityId) {
    return { ok: false, status: 0, data: { message: 'Opportunity ID ausente' } };
  }
  const response = await fetch(`${BASE_URL}/opportunities/${opportunityId}`, {
    method: 'GET',
    headers: getHeaders(),
  });
  const data = await response.json();
  return { ok: response.ok, status: response.status, data };
}

/**
 * Retorna o contactId associado a uma oportunidade
 * @param {string} opportunityId
 * @returns {Promise<string|null>}
 */
export async function getOpportunityContactId(opportunityId) {
  const result = await fetchOpportunityById(opportunityId);
  if (!result.ok) return null;
  const d = result.data;
  const opp = d.opportunity || d.opportunities?.[0] || d;
  return opp?.contactId || opp?.contact?.id || d?.contactId || d?.contact?.id || null;
}

/**
 * Adiciona um seguidor à oportunidade
 * @param {string} opportunityId
 * @param {string} userId
 * @returns {Promise<{ok, status, data}>}
 */
export async function addOpportunityFollower(opportunityId, userId) {
  if (!opportunityId || !userId) {
    return { ok: false, status: 0, data: { message: 'opportunityId ou userId ausente' } };
  }
  const response = await fetch(`${BASE_URL}/opportunities/${opportunityId}/followers`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ followers: [userId] }),
  });
  let data = null;
  try { data = await response.json(); } catch (_) {}
  return { ok: response.ok, status: response.status, data };
}

export default {
  updateOpportunityOwner,
  fetchOpportunityById,
  getOpportunityContactId,
  addOpportunityFollower,
};
