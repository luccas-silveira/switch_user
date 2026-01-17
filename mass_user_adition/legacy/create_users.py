#!/usr/bin/env python3
import argparse
import csv
import json
import os
import re
import time
from pathlib import Path
from urllib import error, parse, request

BASE_URL_DEFAULT = "https://services.leadconnectorhq.com"
API_VERSION_DEFAULT = "2021-07-28"
TOKEN_DEFAULT = "pit-301590c6-a6cb-47d5-a7f4-bc5c4f5c22d4"
USER_AGENT_DEFAULT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)
DEFAULT_LAST_NAME = "Sem Sobrenome"
TEMPLATE_DIR = Path(__file__).resolve().parent / "templates"

HEADER_ALIASES = {
    "cargo": "role",
    "role": "role",
    "funcao": "role",
    "perfil": "role",
    "usuario": "name",
    "nome": "name",
    "name": "name",
    "firstname": "firstName",
    "first": "firstName",
    "primnome": "firstName",
    "primernome": "firstName",
    "primeironome": "firstName",
    "lastname": "lastName",
    "last": "lastName",
    "sobrenome": "lastName",
    "email": "email",
    "fone": "phone",
    "telefone": "phone",
    "celular": "phone",
    "phone": "phone",
}

ROLE_ALIASES = {
    "vendedor": "vendedor",
    "seller": "vendedor",
    "sales": "vendedor",
    "salesperson": "vendedor",
    "admin": "administrador",
    "administrador": "administrador",
    "administrator": "administrador",
    "master": "administrador",
}

REQUIRED_FIELDS = {"role", "firstName", "lastName", "email", "phone"}

TEMPLATE_PATHS = {
    "vendedor": TEMPLATE_DIR / "vendedor.json",
    "administrador": TEMPLATE_DIR / "administrador.json",
}

DEFAULT_USERS_JSON = "users_existing.json"
DEFAULT_USERS_CSV = "users_existing.csv"


def canonicalize(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", value.strip().lower())


def resolve_headers(fieldnames):
    mapping = {}
    for name in fieldnames:
        key = HEADER_ALIASES.get(canonicalize(name))
        if key:
            mapping[name] = key
    return mapping


def normalize_row(row, mapping):
    normalized = {
        key: (row.get(raw_name) or "").strip()
        for raw_name, key in mapping.items()
    }

    if not normalized.get("name"):
        first = normalized.get("firstName", "")
        last = normalized.get("lastName", "")
        combined = f"{first} {last}".strip()
        if combined:
            normalized["name"] = combined

    if normalized.get("name") and (
        not normalized.get("firstName") or not normalized.get("lastName")
    ):
        first, last = split_name(normalized["name"])
        if not normalized.get("firstName") and first:
            normalized["firstName"] = first
        if not normalized.get("lastName") and last:
            normalized["lastName"] = last

    if not normalized.get("lastName"):
        normalized["lastName"] = DEFAULT_LAST_NAME

    for key in ("name", "firstName", "lastName"):
        if normalized.get(key):
            normalized[key] = title_case(normalized[key])

    return normalized


def split_name(full_name: str):
    parts = name_parts(full_name)
    if not parts:
        return "", ""
    if len(parts) == 1:
        return parts[0], ""
    return parts[0], " ".join(parts[1:])


def name_parts(value: str):
    return re.findall(r"\S+", value or "")


def title_case(value: str) -> str:
    def repl(match):
        word = match.group(0)
        return word[:1].upper() + word[1:].lower()

    return re.sub(r"[^\W\d_]+", repl, value, flags=re.UNICODE)


def normalize_role(role_raw):
    if not role_raw:
        return ""
    return ROLE_ALIASES.get(canonicalize(role_raw), "")


def load_template(role):
    path = TEMPLATE_PATHS[role]
    if not path.exists():
        raise FileNotFoundError(f"Template not found: {path}")
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def build_body(template, row, company_id, location_ids):
    roles = template.get("roles", {})
    role_type = template.get("type") or roles.get("type")
    role = template.get("role") or roles.get("role")
    if not role_type or not role:
        raise ValueError("Template missing role/type fields.")

    body = {
        "companyId": company_id,
        "firstName": row["firstName"],
        "lastName": row.get("lastName", ""),
        "email": row["email"],
        "phone": row["phone"],
        "type": role_type,
        "role": role,
        "locationIds": location_ids,
        "permissions": template.get("permissions", {}),
    }

    scopes = template.get("scopes")
    if scopes:
        body["scopes"] = scopes

    return body


def request_api(
    method,
    base_url,
    path,
    token,
    api_version,
    user_agent,
    body=None,
    headers=None,
    timeout=30.0,
):
    url = base_url.rstrip("/") + path
    payload = None
    if body is not None:
        payload = json.dumps(body, ensure_ascii=False).encode("utf-8")

    req = request.Request(url, data=payload, method=method)
    req.add_header("Authorization", f"Bearer {token}")
    req.add_header("Accept", "application/json")
    req.add_header("User-Agent", user_agent)
    if body is not None:
        req.add_header("Content-Type", "application/json")
    if api_version:
        req.add_header("Version", api_version)
    if headers:
        for key, value in headers.items():
            if value:
                req.add_header(key, value)

    try:
        with request.urlopen(req, timeout=timeout) as response:
            raw = response.read().decode("utf-8")
            return response.status, raw
    except error.HTTPError as http_err:
        raw = http_err.read().decode("utf-8")
        return http_err.code, raw


def post_user(base_url, token, api_version, body, timeout, user_agent, location_id):
    headers = {"LocationId": location_id} if location_id else None
    return request_api(
        "POST",
        base_url,
        "/users/",
        token,
        api_version,
        user_agent,
        body=body,
        headers=headers,
        timeout=timeout,
    )




def parse_args():
    parser = argparse.ArgumentParser(
        description="Create GHL users from a CSV using role templates."
    )
    parser.add_argument("--csv", help="Path to CSV file")
    parser.add_argument(
        "--base-url",
        default=os.getenv("GHL_BASE_URL", BASE_URL_DEFAULT),
        help="API base URL (default: services.leadconnectorhq.com)",
    )
    parser.add_argument(
        "--api-version",
        default=os.getenv("GHL_API_VERSION", API_VERSION_DEFAULT),
        help="API Version header value",
    )
    parser.add_argument(
        "--user-agent",
        default=os.getenv("GHL_USER_AGENT", USER_AGENT_DEFAULT),
        help="User-Agent header value",
    )
    parser.add_argument(
        "--token",
        default=os.getenv("GHL_ACCESS_TOKEN")
        or os.getenv("GHL_API_KEY")
        or os.getenv("GHL_TOKEN")
        or TOKEN_DEFAULT,
        help="Bearer token for Authorization header",
    )
    parser.add_argument(
        "--location-id",
        default=os.getenv("GHL_LOCATION_ID"),
        help="Location ID for LocationId header (optional)",
    )
    parser.add_argument(
        "--company-id",
        default=os.getenv("GHL_COMPANY_ID"),
        help="Company ID to override template value (optional)",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=0.0,
        help="Delay in seconds between requests",
    )
    parser.add_argument(
        "--timeout",
        type=float,
        default=30.0,
        help="Timeout per request in seconds",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print payloads without sending requests",
    )
    parser.add_argument(
        "--stop-on-error",
        action="store_true",
        help="Stop on first request error",
    )
    parser.add_argument(
        "--list-users",
        action="store_true",
        help="List existing users and store them locally",
    )
    parser.add_argument(
        "--list-limit",
        type=int,
        default=100,
        help="Page size for listing users",
    )
    parser.add_argument(
        "--users-json",
        default=DEFAULT_USERS_JSON,
        help="Output JSON path for listed users",
    )
    parser.add_argument(
        "--users-csv",
        default=DEFAULT_USERS_CSV,
        help="Output CSV path for listed users",
    )
    return parser.parse_args()


def resolve_location_ids(args, template):
    roles = template.get("roles", {})
    location_ids = roles.get("locationIds") or []
    if args.location_id:
        location_ids = [args.location_id]
    return location_ids


def resolve_company_id(args, template, location_ids):
    # Company ID and Location ID are the same thing
    if args.company_id:
        return args.company_id
    if location_ids:
        return location_ids[0]
    return template.get("companyId")


def should_retry_without_scopes(status, body, response_body):
    return (
        status == 422
        and "scopes" in body
        and "scopes" in response_body
        and "enum" in response_body
    )


def fetch_users(
    base_url,
    token,
    api_version,
    user_agent,
    location_id,
    limit,
    skip,
    timeout,
):
    # Location ID is sent as query parameter, NOT as header
    # Note: GHL API does not accept limit/skip parameters for this endpoint
    if not location_id:
        raise ValueError("location_id is required for fetching users")

    params = {"locationId": location_id}

    query_string = "?" + parse.urlencode(params)
    path = f"/users/{query_string}"

    return request_api(
        "GET",
        base_url,
        path,
        token,
        api_version,
        user_agent,
        headers=None,
        timeout=timeout,
    )


def fetch_all_users(args, location_id):
    # GHL API returns all users in a single request (no pagination needed)
    status, raw = fetch_users(
        args.base_url,
        args.token,
        args.api_version,
        args.user_agent,
        location_id,
        None,  # limit not used
        None,  # skip not used
        args.timeout,
    )

    if status != 200:
        return status, raw, [], None

    try:
        payload = json.loads(raw)
    except json.JSONDecodeError:
        return 500, raw, [], None

    users = payload.get("users", [])
    total = payload.get("count", len(users))

    return 200, "", users, total


def write_users_json(path, users, location_id):
    # Location ID and Company ID are the same thing
    payload = {
        "count": len(users),
        "companyId": location_id,
        "locationId": location_id,
        "users": users,
    }
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)


def write_users_csv(path, users):
    fieldnames = [
        "id",
        "name",
        "firstName",
        "lastName",
        "email",
        "phone",
        "role",
        "type",
        "locationIds",
        "deleted",
        "dateAdded",
        "dateUpdated",
    ]

    with open(path, "w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for user in users:
            roles = user.get("roles") or {}
            location_ids = roles.get("locationIds") or []
            writer.writerow(
                {
                    "id": user.get("id", ""),
                    "name": user.get("name", ""),
                    "firstName": user.get("firstName", ""),
                    "lastName": user.get("lastName", ""),
                    "email": user.get("email", ""),
                    "phone": user.get("phone", ""),
                    "role": roles.get("role", ""),
                    "type": roles.get("type", ""),
                    "locationIds": ",".join(location_ids),
                    "deleted": user.get("deleted", ""),
                    "dateAdded": user.get("dateAdded", ""),
                    "dateUpdated": user.get("dateUpdated", ""),
                }
            )


def row_failure(index, message, args):
    print(f"Row {index}: {message}")
    return args.stop_on_error


def main():
    args = parse_args()

    if not args.token and not args.dry_run:
        print("Missing API token. Set GHL_ACCESS_TOKEN or pass --token.")
        return 2

    if args.list_users:
        # Location ID and Company ID are the same thing
        location_id = args.location_id or args.company_id
        if not location_id:
            print("Provide --location-id or --company-id to list users.")
            return 2

        status, raw, users, total = fetch_all_users(args, location_id)
        if status != 200:
            snippet = (raw or "").strip()
            if len(snippet) > 500:
                snippet = snippet[:500] + "..."
            print(f"List users failed ({status}) -> {snippet}")
            return 1

        write_users_json(args.users_json, users, location_id)
        write_users_csv(args.users_csv, users)

        total_note = f" (total reported: {total})" if total is not None else ""
        print(
            f"Users stored: {len(users)}{total_note} -> "
            f"{args.users_json}, {args.users_csv}"
        )
        return 0

    if not args.csv:
        print("Missing --csv. Use --list-users to export existing users.")
        return 2

    csv_path = Path(args.csv)
    if not csv_path.exists():
        print(f"CSV not found: {csv_path}")
        return 2

    successes = 0
    failures = 0

    with csv_path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        if not reader.fieldnames:
            print("CSV has no headers.")
            return 2

        mapping = resolve_headers(reader.fieldnames)
        if not mapping:
            print("No recognized headers found in CSV.")
            return 2

        for index, row in enumerate(reader, start=2):
            normalized = normalize_row(row, mapping)
            missing = [
                field for field in REQUIRED_FIELDS if not normalized.get(field, "")
            ]
            if missing:
                failures += 1
                if row_failure(
                    index, f"missing fields: {', '.join(sorted(missing))}", args
                ):
                    return 1
                continue

            role = normalize_role(normalized["role"])
            if not role:
                failures += 1
                if row_failure(
                    index,
                    f"invalid role '{normalized['role']}'. Use Vendedor or Administrador.",
                    args,
                ):
                    return 1
                continue

            try:
                template = load_template(role)
            except FileNotFoundError as exc:
                print(str(exc))
                return 2

            location_ids = resolve_location_ids(args, template)
            if not location_ids:
                failures += 1
                if row_failure(
                    index, "missing locationIds in template or args.", args
                ):
                    return 1
                continue

            company_id = resolve_company_id(args, template, location_ids)
            if not company_id:
                failures += 1
                if row_failure(index, "unable to resolve companyId.", args):
                    return 1
                continue

            try:
                body = build_body(template, normalized, company_id, location_ids)
            except ValueError as exc:
                failures += 1
                if row_failure(index, str(exc), args):
                    return 1
                continue

            if args.dry_run:
                print(f"Row {index}: {role} -> {json.dumps(body, ensure_ascii=False)}")
                successes += 1
                continue

            location_id = args.location_id or location_ids[0]

            status, response_body = post_user(
                args.base_url,
                args.token,
                args.api_version,
                body,
                args.timeout,
                args.user_agent,
                location_id,
            )

            if should_retry_without_scopes(status, body, response_body):
                body_no_scopes = dict(body)
                body_no_scopes.pop("scopes", None)
                status, response_body = post_user(
                    args.base_url,
                    args.token,
                    args.api_version,
                    body_no_scopes,
                    args.timeout,
                    args.user_agent,
                    location_id,
                )

            if status in (200, 201):
                successes += 1
                print(f"Row {index}: created ({status})")
            else:
                failures += 1
                snippet = response_body.strip()
                if len(snippet) > 500:
                    snippet = snippet[:500] + "..."
                print(f"Row {index}: failed ({status}) -> {snippet}")
                if args.stop_on_error:
                    return 1

            if args.delay:
                time.sleep(args.delay)

    print(f"Done. Success: {successes}, Failed: {failures}")
    return 0 if failures == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
