/**
 * UI Injector - Entry Point Principal
 *
 * Auto-inicializa o dropdown de usuários no GoHighLevel
 */

import { UserDropdown } from './components/index.js';
import { fetchUsersByLocation, getLocationIdFromUrl } from './services/ghlApi.js';
import { init } from './core/index.js';
import { logger } from './utils/index.js';

const ALLOWED_LOCATION_ID = 'citQs4acsN1StzOEDuvj';

let dropdownInstance = null;

async function startApp() {
  try {
    logger.info('Iniciando Switch User...');

    // Verifica location
    const locationId = getLocationIdFromUrl();
    if (locationId !== ALLOWED_LOCATION_ID) {
      logger.debug('Location não permitida: ' + locationId);
      return;
    }

    // Inicializa core
    await init({ debug: true, namespace: 'ui-injector' });

    // Busca usuários
    logger.debug('Buscando usuários da API...');
    const users = await fetchUsersByLocation(ALLOWED_LOCATION_ID);
    logger.info(users.length + ' usuários carregados');

    // Aguarda elemento
    let el = document.querySelector('#OpportunityOwner');
    let tries = 0;
    while (!el && tries < 50) {
      await new Promise(r => setTimeout(r, 200));
      el = document.querySelector('#OpportunityOwner');
      tries++;
    }

    if (!el) {
      logger.error('Elemento #OpportunityOwner não encontrado');
      return;
    }

    // Remove dropdowns anteriores
    document.querySelectorAll('[data-component-id^="user-dropdown"]').forEach(e => e.remove());
    el.style.display = '';

    // Cria dropdown
    dropdownInstance = new UserDropdown({
      users: users,
      targetSelector: '#OpportunityOwner',
      allowedLocationId: ALLOWED_LOCATION_ID,
    });

    dropdownInstance.on('user:selected', (user) => {
      logger.info('Selecionado: ' + user.name);
    });

    await dropdownInstance.mountReplacing();
    logger.info('Dropdown montado com ' + users.length + ' usuários');

  } catch (err) {
    logger.error('Erro: ' + err.message);
    console.error(err);
  }
}

// Auto-inicia
if (typeof window !== 'undefined') {
  window.UIInjector = { start: startApp, getDropdown: () => dropdownInstance };
  setTimeout(startApp, 1000);
}

export default { start: startApp };
