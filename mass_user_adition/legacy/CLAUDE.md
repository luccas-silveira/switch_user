# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Python utility for bulk-creating GHL (GoHighLevel) users from CSV files using role-based JSON templates.

## Commands

### CLI Usage

```bash
# Standard execution
python3 create_users.py --csv usuarios.csv

# Dry run (preview payloads without sending requests)
python3 create_users.py --csv usuarios.csv --dry-run

# With rate limiting
python3 create_users.py --csv usuarios.csv --delay 0.3

# Stop on first error
python3 create_users.py --csv usuarios.csv --stop-on-error

# List existing users
python3 create_users.py --list-users --location-id {location_id}
```

### Web Interface

```bash
# Start web server
python3 server.py

# Access at http://127.0.0.1:8080
```

The web interface provides:
- CSV file upload
- Dry-run mode toggle
- Rate limiting configuration
- User listing functionality
- Real-time output display

### Environment Variables

```bash
export GHL_ACCESS_TOKEN="your_bearer_token"
export GHL_LOCATION_ID="your_location_id"
export GHL_COMPANY_ID="your_company_id"
```

## Architecture

### Project Structure

- `create_users.py`: Core CLI script with all user creation and listing logic
- `server.py`: HTTP server providing web interface (imports and wraps create_users.py functions)
- `web/index.html`: Frontend interface (single-page app with vanilla JS)
- `templates/`: JSON templates defining permissions and scopes for each role

### Data Flow

1. **CSV Parsing**: `resolve_headers()` maps flexible column names to canonical fields via `HEADER_ALIASES`, then `normalize_row()` extracts and title-cases names, handling full name splitting when firstName/lastName aren't provided
2. **Role Resolution**: `normalize_role()` maps input like "VENDEDOR"/"MASTER" to template names via `ROLE_ALIASES`
3. **Template Loading**: `load_template()` reads JSON from `templates/{role}.json`
4. **Body Construction**: `build_body()` merges CSV data with template structure, including locationIds and companyId
5. **Company ID Resolution**: `resolve_company_id()` uses locationId directly as companyId (they are the same thing)
6. **API Request**: `post_user()` sends POST to `/users/` with Bearer auth and Version header
7. **Retry Logic**: On 422 with scopes error, retries without scopes field

### CSV Header Flexibility

`HEADER_ALIASES` accepts varied column names (case-insensitive, stripped of special chars):
- **cargo/role**: `role`, `funcao`, `perfil`
- **name**: `nome`, `usuario`
- **phone**: `telefone`, `celular`, `fone`
- **firstName/lastName**: `first`, `last`, `sobrenome`

Both `USUARIO,FONE,EMAIL,PERFIL` and `cargo,name,phone,email` work.

### Role System

`ROLE_ALIASES` maps to template files:
- `VENDEDOR`/`seller`/`sales` → `templates/vendedor.json` (role: "user", assignedDataOnly: true, ~100 scopes)
- `MASTER`/`admin`/`administrador` → `templates/administrador.json` (role: "admin", full permissions, 200+ scopes)

Templates define:
- `type`: "account"
- `role`: "admin" or "user"
- `roles.locationIds`: Array of accessible location IDs
- `permissions`: 50+ boolean feature flags
- `scopes`: OAuth-style permission strings (optional, auto-removed on validation error)
- `companyId`: Default company ID

### API Interaction

**Creating Users:**
- Endpoint: `POST https://services.leadconnectorhq.com/users/`
- Headers: `Authorization: Bearer {token}`, `Version: 2021-07-28`, `LocationId: {id}`, `User-Agent`
- Retry: If 422 response body contains "scopes" and "enum", retries without scopes field

**Listing Users:**
- Endpoint: `GET https://services.leadconnectorhq.com/users/?locationId={id}`
- Headers: `Authorization: Bearer {token}`, `Version: 2021-07-28`, `Accept: application/json`, `User-Agent`
- The `locationId` is sent as query parameter (NOT as header)
- Returns all users in a single response (no pagination supported)

**Important:** Location ID and Company ID are the same thing in GHL API

### Name Handling

`split_name()` divides full names:
- Single word → firstName only, lastName = "Sem Sobrenome"
- Multiple words → first word is firstName, rest is lastName
- All names converted to title case via `title_case()` (regex-based proper casing)
