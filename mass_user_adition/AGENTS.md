# Repository Guidelines

## Project Structure & Module Organization
- `team-weaver/` is the active app (React + Vite frontend, Python backend).
  - `team-weaver/src/` holds React UI and feature modules.
  - `team-weaver/backend/` holds the API server and persisted data in `backend/data/`.
  - `team-weaver/backend/templates/` stores payload templates used by bulk actions.
- `legacy/` contains the previous CLI and static web UI; treat it as archived unless a fix is required.

## Build, Test, and Development Commands
- Install frontend deps: `npm install --prefix team-weaver`
- Run frontend dev server: `npm run dev --prefix team-weaver` (Vite, default 8080)
- Build frontend: `npm run build --prefix team-weaver`
- Lint frontend: `npm run lint --prefix team-weaver`
- Run backend API: `python3 team-weaver/backend/server.py` (default 8000)
- Legacy CLI (if needed): `python3 legacy/create_users.py --csv legacy/usuarios_exemplo.csv`

## Coding Style & Naming Conventions
- Frontend uses TypeScript + React; keep `PascalCase` components and `camelCase` hooks/vars.
- Styling is Tailwind-first; reuse existing utility patterns and shared helpers in `team-weaver/src/lib/`.
- Backend uses 4-space indentation, `snake_case`, and constants in `UPPER_SNAKE_CASE`.

## Testing Guidelines
There is no automated test suite. Validate changes manually:
- Run both servers and verify multi-instance routing (`/:locationId`).
- Create/update/delete teams and confirm custom values sync behavior.
- Create users and confirm API responses and UI toasts.

## Commit & Pull Request Guidelines
Recent commits use short, imperative subjects (e.g., "Add backend sync"). In PRs, include:
- A short description of the change and impacted paths (e.g., `team-weaver/src`, `team-weaver/backend`).
- Steps to verify (commands or UI flow).
- Screenshots when UI layout or styling changes.

## Security & Configuration Tips
- Do not commit tokens or customer data. Tokens are stored per location in localStorage.
- Avoid committing generated files like `team-weaver/backend/data/teams.json` or legacy CSV exports.
