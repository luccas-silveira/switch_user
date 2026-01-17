/**
 * Estilos base do sistema
 *
 * Define variáveis CSS e estilos de reset aplicados
 * dentro do escopo isolado (Shadow DOM).
 */

export const cssVariables = `
  :host {
    /* Cores primárias */
    --ui-color-primary: #3b82f6;
    --ui-color-primary-hover: #2563eb;
    --ui-color-primary-light: #dbeafe;

    /* Cores de texto */
    --ui-color-text: #1f2937;
    --ui-color-text-muted: #6b7280;
    --ui-color-text-light: #9ca3af;

    /* Cores de fundo */
    --ui-color-bg: #ffffff;
    --ui-color-bg-secondary: #f9fafb;
    --ui-color-bg-tertiary: #f3f4f6;

    /* Cores de borda */
    --ui-color-border: #e5e7eb;
    --ui-color-border-dark: #d1d5db;

    /* Cores de status */
    --ui-color-success: #10b981;
    --ui-color-warning: #f59e0b;
    --ui-color-error: #ef4444;
    --ui-color-info: #3b82f6;

    /* Sombras */
    --ui-shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
    --ui-shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
    --ui-shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);

    /* Espaçamento */
    --ui-spacing-xs: 4px;
    --ui-spacing-sm: 8px;
    --ui-spacing-md: 16px;
    --ui-spacing-lg: 24px;
    --ui-spacing-xl: 32px;

    /* Tipografia */
    --ui-font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    --ui-font-size-xs: 12px;
    --ui-font-size-sm: 14px;
    --ui-font-size-md: 16px;
    --ui-font-size-lg: 18px;
    --ui-font-size-xl: 20px;

    /* Bordas */
    --ui-radius-sm: 4px;
    --ui-radius-md: 6px;
    --ui-radius-lg: 8px;
    --ui-radius-full: 9999px;

    /* Transições */
    --ui-transition-fast: 150ms ease;
    --ui-transition-normal: 250ms ease;
    --ui-transition-slow: 350ms ease;

    /* Z-index */
    --ui-z-dropdown: 100;
    --ui-z-modal: 200;
    --ui-z-tooltip: 300;
    --ui-z-toast: 400;
  }
`;

export const cssReset = `
  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  :host {
    font-family: var(--ui-font-family);
    font-size: var(--ui-font-size-md);
    color: var(--ui-color-text);
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  button, input, select, textarea {
    font-family: inherit;
    font-size: inherit;
  }

  button {
    cursor: pointer;
    border: none;
    background: none;
  }

  a {
    color: inherit;
    text-decoration: none;
  }

  img, svg {
    display: block;
    max-width: 100%;
  }

  [hidden] {
    display: none !important;
  }
`;

/**
 * Combina variáveis e reset em um único bloco de estilos
 * @returns {string}
 */
export function getBaseStyles() {
  return `${cssVariables}\n${cssReset}`;
}

export default { cssVariables, cssReset, getBaseStyles };
