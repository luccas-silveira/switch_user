# Repository Overview

This workspace contains the main Team Weaver app and a legacy CLI.

## Folders
- `team-weaver/` is the active app (React + Vite frontend, Python backend).
  - `team-weaver/src/` holds frontend source code.
  - `team-weaver/backend/` holds the API server and data in `backend/data/`.
- `legacy/` is the previous bulk-user CLI and static web UI (archived).

## Run locally
Frontend:
```sh
npm run dev --prefix team-weaver
```

Backend:
```sh
python3 team-weaver/backend/server.py
```

Legacy (if needed):
```sh
python3 legacy/create_users.py --csv legacy/usuarios_exemplo.csv
python3 legacy/server.py
```
