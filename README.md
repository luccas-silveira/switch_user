# UI Injector

Sistema de injeção de UI para adicionar ou modificar interfaces em sistemas existentes (páginas web, apps SaaS ou plataformas de terceiros) sem controle direto do código-fonte original.

## Estrutura do Projeto

```
switch_user/
├── src/
│   ├── index.js              # Entry point principal
│   ├── config/
│   │   └── index.js          # Configuração centralizada
│   ├── core/
│   │   ├── index.js          # Exports do core
│   │   ├── bootstrap.js      # Orquestração da inicialização
│   │   └── Container.js      # Container isolado (Shadow DOM)
│   ├── components/
│   │   ├── index.js          # Exports de componentes
│   │   └── base/
│   │       ├── index.js      # Exports base
│   │       └── Component.js  # Classe base para componentes
│   ├── styles/
│   │   ├── index.js          # Exports de estilos
│   │   ├── base.js           # Variáveis CSS e reset
│   │   └── manager.js        # Gerenciador de estilos
│   └── utils/
│       ├── index.js          # Exports de utilitários
│       ├── dom.js            # Manipulação de DOM
│       ├── events.js         # Event Bus interno
│       └── logger.js         # Sistema de logging
├── dist/                     # Build de produção (gerado)
└── README.md
```

## Descrição dos Módulos

### `/src/config/`
Centraliza todas as configurações do sistema. Permite customização via `setConfig()` sem modificar código fonte.

### `/src/core/`
- **bootstrap.js**: Orquestra inicialização, executa hooks de ciclo de vida
- **Container.js**: Gerencia o container isolado com Shadow DOM

### `/src/components/`
- **base/Component.js**: Classe base com ciclo de vida (mount/unmount), estado, eventos
- Adicione novos componentes em arquivos separados nesta pasta

### `/src/styles/`
- **base.js**: Variáveis CSS (cores, espaçamentos, tipografia) e reset
- **manager.js**: Injeta/remove estilos no escopo isolado

### `/src/utils/`
- **dom.js**: `waitForElement`, `createElement`, `observeDOM`
- **events.js**: Event Bus para comunicação entre componentes
- **logger.js**: Logging prefixado e condicional

## Estratégias de Isolamento

### CSS Isolation (Shadow DOM - Recomendado)
```javascript
UIInjector.init({
  cssIsolation: 'shadow-dom'  // default
});
```
- Isolamento completo de CSS
- Estilos do host não afetam a UI injetada
- Estilos injetados não vazam para o host

### CSS Isolation (Prefixed)
```javascript
UIInjector.init({
  cssIsolation: 'prefixed'
});
```
- Adiciona prefixo de namespace a todos os seletores
- Menor isolamento, mas maior compatibilidade

## Uso Básico

### Inicialização
```javascript
import UIInjector from './src/index.js';

const app = await UIInjector.init({
  namespace: 'minha-app',
  debug: true,
  hooks: {
    onAfterInit: () => console.log('App iniciado!'),
    onError: (err) => console.error('Erro:', err)
  }
});
```
Observação: `UIInjector.init()` e `UIInjector.start()` são equivalentes neste bundle.

### Criando Componentes
```javascript
import { Component } from './src/components/index.js';

class MeuBotao extends Component {
  static styles() {
    return `
      .btn {
        padding: var(--ui-spacing-sm) var(--ui-spacing-md);
        background: var(--ui-color-primary);
        color: white;
        border-radius: var(--ui-radius-md);
      }
      .btn:hover {
        background: var(--ui-color-primary-hover);
      }
    `;
  }

  render() {
    const { label } = this.props;
    return `<button class="btn">${label}</button>`;
  }

  _bindEvents() {
    this.element.addEventListener('click', () => {
      this.emit('botao:click', { id: this.id });
    });
  }
}

// Uso
const container = app.getContainer();
const botao = new MeuBotao({ label: 'Clique aqui' });
botao.mount(container);
```

### Aguardando Elementos do Host
```javascript
import { waitForElement } from './src/utils/index.js';

// Aguarda um elemento aparecer antes de injetar
const header = await waitForElement('.host-header', { timeout: 5000 });
// Agora pode injetar UI próxima ao header
```

### Comunicação via Event Bus
```javascript
import { eventBus } from './src/utils/index.js';

// Componente A emite
eventBus.emit('usuario:logado', { id: 123 });

// Componente B escuta
eventBus.on('usuario:logado', (data) => {
  console.log('Usuário logado:', data.id);
});
```

## Configurações Disponíveis

| Opção | Tipo | Padrão | Descrição |
|-------|------|--------|-----------|
| `namespace` | string | `'ui-injector'` | Prefixo para IDs e classes |
| `debug` | boolean | `false` | Habilita logs detalhados |
| `cssIsolation` | string | `'shadow-dom'` | Estratégia de isolamento CSS |
| `mountPosition` | string | `'body-end'` | Posição do container no DOM |
| `zIndexBase` | number | `999000` | Z-index base para elementos |
| `domTimeout` | number | `5000` | Timeout para operações de DOM (ms) |
| `observeMutations` | boolean | `true` | Observar mudanças no DOM |

## Hooks de Ciclo de Vida

```javascript
UIInjector.init({
  hooks: {
    onBeforeInit: () => {},    // Antes da inicialização
    onAfterInit: () => {},     // Após inicialização
    onBeforeMount: () => {},   // Antes de montar componente
    onAfterMount: () => {},    // Após montar componente
    onBeforeDestroy: () => {}, // Antes de destruir
    onAfterDestroy: () => {},  // Após destruir
    onError: (err) => {}       // Em caso de erro
  }
});
```

## Cenários de Carregamento

### Script Loader (Snippet)
```html
<script>
(function() {
  var script = document.createElement('script');
  script.src = 'https://cdn.example.com/ui-injector.min.js';
  script.onload = function() {
    UIInjector.init({ namespace: 'minha-injecao' });
  };
  document.head.appendChild(script);
})();
</script>
```

### Extensão de Navegador
```javascript
// content-script.js
import UIInjector from './src/index.js';

UIInjector.init({
  namespace: 'extensao-xyz',
  debug: false
}).then(app => {
  // Injeta UI
});
```

### Bookmarklet
```javascript
javascript:(function(){
  if(window.UIInjector){return}
  var s=document.createElement('script');
  s.src='https://cdn.example.com/ui-injector.min.js';
  s.onload=function(){UIInjector.init()};
  document.head.appendChild(s);
})();
```

## Boas Práticas

1. **Sempre use o namespace** para evitar conflitos
2. **Prefira Shadow DOM** para isolamento completo
3. **Use o Event Bus** para comunicação entre componentes
4. **Aguarde elementos** antes de manipular o DOM do host
5. **Limpe recursos** chamando `destroy()` quando necessário
6. **Não dependa de variáveis globais** do host

## Build (sugestão)

Para gerar um bundle de produção, utilize Rollup, esbuild ou Vite:

```bash
# Exemplo com esbuild
npx esbuild src/index.js --bundle --minify --format=iife --global-name=UIInjector --outfile=dist/ui-injector.min.js
```

## Licença

MIT
