/**
 * Serviços do projeto
 */

export { setRequestConfig, getRequestConfig, executeRequest } from './http.js';
export { setActionHandler, triggerAction } from './actions.js';
export { setApiToken, fetchUsersByLocation, getLocationIdFromUrl } from './ghlApi.js';
export { addContactFollower } from './contactApi.js';
export { updateOpportunityOwner, fetchOpportunityById, getOpportunityContactId, getOpportunityIdFromUrl } from './opportunityApi.js';
