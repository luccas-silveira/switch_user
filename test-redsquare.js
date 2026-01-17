/**
 * Teste da lógica de verificação de URL do RedSquare
 */

const ALLOWED_LOCATION_ID = 'citQs4acsN1StzOEDuvj';

// Simula a função _getLocationIdFromUrl
function getLocationIdFromUrl(pathname) {
  const match = pathname.match(/\/location\/([^\/]+)/);
  return match ? match[1] : null;
}

// Simula a função _isAllowedLocation
function isAllowedLocation(pathname, allowedId = ALLOWED_LOCATION_ID) {
  const currentLocationId = getLocationIdFromUrl(pathname);
  return currentLocationId === allowedId;
}

// Casos de teste
const testCases = [
  {
    url: '/v2/location/citQs4acsN1StzOEDuvj/opportunities/list',
    expected: true,
    description: 'URL com locationId permitido'
  },
  {
    url: '/v2/location/citQs4acsN1StzOEDuvj/opportunities',
    expected: true,
    description: 'URL com locationId permitido (sem subpath)'
  },
  {
    url: '/v2/location/outroLocationId/opportunities/list',
    expected: false,
    description: 'URL com locationId diferente'
  },
  {
    url: '/v2/location/abc123/opportunities',
    expected: false,
    description: 'URL com locationId aleatório'
  },
  {
    url: '/v2/dashboard',
    expected: false,
    description: 'URL sem location'
  },
  {
    url: '/location/citQs4acsN1StzOEDuvj',
    expected: true,
    description: 'URL com location sem prefixo v2'
  },
  {
    url: '/v2/location/citQs4acsN1StzOEDuvj/',
    expected: true,
    description: 'URL com trailing slash'
  }
];

console.log('=== Teste do RedSquare - Verificação de URL ===\n');
console.log(`LocationId permitido: ${ALLOWED_LOCATION_ID}\n`);

let passed = 0;
let failed = 0;

testCases.forEach((test, index) => {
  const result = isAllowedLocation(test.url);
  const status = result === test.expected ? 'PASS' : 'FAIL';

  if (result === test.expected) {
    passed++;
  } else {
    failed++;
  }

  const locationId = getLocationIdFromUrl(test.url);

  console.log(`${index + 1}. [${status}] ${test.description}`);
  console.log(`   URL: ${test.url}`);
  console.log(`   LocationId extraído: ${locationId || '(nenhum)'}`);
  console.log(`   Esperado: ${test.expected}, Resultado: ${result}\n`);
});

console.log('=== Resultado ===');
console.log(`Total: ${testCases.length} testes`);
console.log(`Passou: ${passed}`);
console.log(`Falhou: ${failed}`);
console.log(failed === 0 ? '\n✓ Todos os testes passaram!' : '\n✗ Alguns testes falharam!');
