/**
 * Sistema de Ações Desacoplado
 *
 * Permite registrar e disparar ações de forma genérica.
 * O ponto de disparo é um placeholder conectável a qualquer evento futuro.
 */

import { executeRequest } from './http.js';

/**
 * Handler da ação de requisição
 * Pode ser substituído ou estendido conforme necessário
 */
let onRequestAction = async () => {
  return await executeRequest();
};

/**
 * Registra um handler customizado para a ação
 * @param {Function} handler - Função a ser executada na ação
 */
export function setActionHandler(handler) {
  onRequestAction = handler;
}

/**
 * Dispara a ação de requisição
 * Este é o ponto de conexão para qualquer evento futuro
 * @returns {Promise<Object>}
 */
export async function triggerAction() {
  return await onRequestAction();
}

// ============================================================
// PONTO DE DISPARO (PLACEHOLDER)
// ============================================================
//
// Conecte qualquer ação futura chamando triggerAction():
//
// Exemplo 1 - Evento de clique:
//   element.addEventListener('click', () => triggerAction());
//
// Exemplo 2 - Submit de formulário:
//   form.addEventListener('submit', (e) => {
//     e.preventDefault();
//     triggerAction();
//   });
//
// Exemplo 3 - Evento customizado:
//   eventBus.on('minha-acao', () => triggerAction());
//
// Exemplo 4 - Mudança de estado:
//   if (condicao) triggerAction();
//
// ============================================================

export default {
  setActionHandler,
  triggerAction,
};
