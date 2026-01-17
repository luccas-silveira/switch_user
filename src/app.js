/**
 * App - Módulo de inicialização integrado
 *
 * Inicializa o sistema completo:
 * 1. Busca usuários da API
 * 2. Monta o UserDropdown com os dados
 */

import { UserDropdown } from './components/index.js';
import { fetchUsersByLocation, getLocationIdFromUrl } from './services/ghlApi.js';

// Location ID permitido
const ALLOWED_LOCATION_ID = 'citQs4acsN1StzOEDuvj';

// Instância do dropdown
let dropdownInstance = null;

/**
 * Log simples
 */
function log(msg, data) {
  console.log(`[SwitchUser] ${msg}`, data || '');
}

/**
 * Remove dropdowns anteriores que possam existir
 */
function cleanupPreviousDropdowns() {
  // Remove qualquer dropdown anterior
  const existingDropdowns = document.querySelectorAll('[data-component-id^="user-dropdown"]');
  existingDropdowns.forEach(el => el.parentNode?.removeChild(el));

  // Restaura o elemento original se estiver escondido
  const original = document.querySelector('#OpportunityOwner');
  if (original) {
    original.style.display = '';
  }
}

/**
 * Inicializa a aplicação completa
 */
export async function startApp() {
  try {
    log('Iniciando...');

    // 1. Verifica se está na location correta
    const currentLocationId = getLocationIdFromUrl();
    if (currentLocationId !== ALLOWED_LOCATION_ID) {
      log('Location não permitida:', currentLocationId);
      return null;
    }

    log('Location OK:', currentLocationId);

    // 2. Limpa dropdowns anteriores
    cleanupPreviousDropdowns();

    // 3. Busca usuários da API
    log('Buscando usuários...');
    const users = await fetchUsersByLocation(ALLOWED_LOCATION_ID);
    log('Usuários carregados:', users.length);

    if (!users || users.length === 0) {
      log('ERRO: Nenhum usuário retornado da API');
      return null;
    }

    // 4. Aguarda o elemento alvo existir
    let attempts = 0;
    let targetElement = document.querySelector('#OpportunityOwner');

    while (!targetElement && attempts < 50) {
      await new Promise(r => setTimeout(r, 200));
      targetElement = document.querySelector('#OpportunityOwner');
      attempts++;
    }

    if (!targetElement) {
      log('ERRO: Elemento #OpportunityOwner não encontrado');
      return null;
    }

    // 5. Cria o dropdown COM os usuários
    log('Criando dropdown com', users.length, 'usuários');

    dropdownInstance = new UserDropdown({
      users: users,
      targetSelector: '#OpportunityOwner',
      allowedLocationId: ALLOWED_LOCATION_ID,
    });

    // 6. Escuta seleção
    dropdownInstance.on('user:selected', (user) => {
      log('Selecionado:', user.name);
    });

    // 7. Monta
    await dropdownInstance.mountReplacing();

    log('Pronto! Dropdown montado com', dropdownInstance.state.users.length, 'usuários');

    return { dropdown: dropdownInstance, users };
  } catch (error) {
    log('ERRO:', error.message);
    console.error(error);
    throw error;
  }
}

/**
 * Obtém a instância do dropdown
 */
export function getDropdown() {
  return dropdownInstance;
}

// Auto-inicialização
if (typeof window !== 'undefined') {
  window.SwitchUser = { start: startApp, getDropdown };

  // Aguarda um pouco para o GHL carregar
  setTimeout(() => {
    startApp();
  }, 1000);
}

export default { startApp, getDropdown };
