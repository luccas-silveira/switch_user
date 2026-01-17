# Repository Guidelines

## Project Structure & Module Organization
- `src/` holds the UI injector source (ES modules).
- `src/index.js` is the main entry point; `src/app.js` is the integrated start flow.
- `src/core/`, `src/components/`, `src/styles/`, `src/utils/`, `src/config/`, `src/services/` follow the runtime layers.
- `dist/` contains generated bundles (`ui-injector.min.js`, `switch-user.min.js`); do not edit by hand.
- `test-redsquare.js` is a standalone script for URL parsing checks.
- `mass_user_adition/` is a separate tool with its own README and AGENTS guide.

## Build, Test, and Development Commands
- Build bundle (example from README):
  `npx esbuild src/index.js --bundle --minify --format=iife --global-name=UIInjector --outfile=dist/ui-injector.min.js`
- Adjust input/output for other bundles (for example `src/app.js` to `dist/switch-user.min.js`).
- Run the RedSquare URL tests: `node test-redsquare.js`
- Local validation is browser based. Load a built bundle into the target page (snippet/bookmarklet) and verify UI injection.

## Coding Style & Naming Conventions
- Indentation is 2 spaces; use semicolons and single quotes.
- Use ES module imports with explicit `.js` extensions.
- Components/classes use `PascalCase` and matching filenames (for example `UserDropdown.js`).
- Functions/variables use `camelCase`; constants use `UPPER_SNAKE_CASE`.
- Keep API wrappers in `src/services/*Api.js` and central exports in `src/services/index.js`.

## Testing Guidelines
- There is no automated test runner; rely on `node test-redsquare.js` plus manual checks.
- For UI changes, verify the dropdown replaces `#OpportunityOwner`, opens/closes, and emits `user:selected`.
- For API changes, confirm request headers, token usage, and error handling in the host browser.

## Commit & Pull Request Guidelines
- Recent commits follow Conventional Commits (`feat:`, `fix:`). Keep subjects short and imperative.
- PRs should include a brief summary, impacted paths, and verification steps.
- Include screenshots or GIFs for visible UI or style changes.

## Security & Configuration Tips
- API tokens are currently hardcoded in `src/services/ghlApi.js` and `src/services/opportunityApi.js`. Do not add new secrets to git.
- Prefer injecting tokens via `setApiToken()` or configuration overrides.
