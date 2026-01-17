/**
 * App - Módulo de inicialização integrado
 *
 * Inicializa o sistema completo:
 * 1. Inicializa o UI Injector
 * 2. Busca usuários da API
 * 3. Monta o UserDropdown com os dados
 */

import { init } from './core/index.js';
import { UserDropdown } from './components/index.js';
import { fetchUsersByLocation, getLocationIdFromUrl } from './services/ghlApi.js';
import logger from './utils/logger.js';

// Location ID permitido
const ALLOWED_LOCATION_ID = 'citQs4acsN1StzOEDuvj';

// Instância do dropdown (para acesso externo)
let dropdownInstance = null;

/**
 * Inicializa a aplicação completa
 * @param {Object} options - Opções de configuração
 * @returns {Promise<Object>} API da aplicação
 */
export async function startApp(options = {}) {
  try {
    const config = {
      debug: true,
      namespace: 'ui-injector',
      ...options,
    };

    logger.info('Iniciando aplicação Switch User...');

    // 1. Verifica se está na location correta
    const currentLocationId = getLocationIdFromUrl();
    if (currentLocationId !== ALLOWED_LOCATION_ID) {
      logger.debug(`Location não permitida: ${currentLocationId}`);
      return null;
    }

    logger.debug(`Location permitida: ${currentLocationId}`);

    // 2. Inicializa o UI Injector
    await init(config);

    // 3. Busca usuários da API
    logger.debug('Buscando usuários da API...');
    const users = await fetchUsersByLocation(ALLOWED_LOCATION_ID);
    logger.info(`${users.length} usuários carregados`);

    // 4. Cria e monta o dropdown com os usuários
    dropdownInstance = new UserDropdown({
      users,
      targetSelector: '#OpportunityOwner',
      allowedLocationId: ALLOWED_LOCATION_ID,
    });

    // 5. Escuta evento de seleção
    dropdownInstance.on('user:selected', (user) => {
      logger.info(`Usuário selecionado: ${user.name}`);
    });

    // 6. Monta o dropdown
    await dropdownInstance.mountReplacing();

    logger.info('Aplicação iniciada com sucesso!');

    return {
      dropdown: dropdownInstance,
      users,
      getSelectedUser: () => dropdownInstance?.state?.selectedUser,
    };
  } catch (error) {
    logger.error(`Erro ao iniciar aplicação: ${error.message}`);
    throw error;
  }
}

/**
 * Obtém a instância do dropdown
 * @returns {UserDropdown|null}
 */
export function getDropdown() {
  return dropdownInstance;
}

// Auto-inicialização quando o DOM estiver pronto
if (typeof window !== 'undefined') {
  // Expõe função globalmente
  window.SwitchUser = {
    start: startApp,
    getDropdown,
  };

  // Auto-inicia quando o DOM carregar
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => startApp());
  } else {
    startApp();
  }
}

export default { startApp, getDropdown };
