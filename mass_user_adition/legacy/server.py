#!/usr/bin/env python3
import csv
import io
import json
import time
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from types import SimpleNamespace

import create_users as cu

BASE_DIR = Path(__file__).resolve().parent
INDEX_PATH = BASE_DIR / "web" / "index.html"


def build_args(payload):
    return SimpleNamespace(
        base_url=payload.get("baseUrl") or cu.BASE_URL_DEFAULT,
        api_version=payload.get("apiVersion") or cu.API_VERSION_DEFAULT,
        user_agent=cu.USER_AGENT_DEFAULT,
        token=cu.TOKEN_DEFAULT,
        location_id=(payload.get("locationId") or "").strip() or None,
        company_id=(payload.get("companyId") or "").strip() or None,
        delay=float(payload.get("delay") or 0),
        timeout=float(payload.get("timeout") or 30.0),
        dry_run=bool(payload.get("dryRun")),
        stop_on_error=False,
        list_limit=int(payload.get("listLimit") or 100),
        users_json=(payload.get("usersJson") or cu.DEFAULT_USERS_JSON),
        users_csv=(payload.get("usersCsv") or cu.DEFAULT_USERS_CSV),
    )


def process_csv(csv_text, args):
    reader = csv.DictReader(io.StringIO(csv_text))
    if not reader.fieldnames:
        return None, "CSV has no headers."

    mapping = cu.resolve_headers(reader.fieldnames)
    if not mapping:
        return None, "No recognized headers found in CSV."

    results = []
    successes = 0
    failures = 0

    for index, row in enumerate(reader, start=2):
        normalized = cu.normalize_row(row, mapping)
        missing = [
            field
            for field in cu.REQUIRED_FIELDS
            if not normalized.get(field, "")
        ]
        if missing:
            failures += 1
            results.append(
                {
                    "row": index,
                    "status": "error",
                    "message": f"missing fields: {', '.join(sorted(missing))}",
                }
            )
            continue

        role = cu.normalize_role(normalized.get("role", ""))
        if not role:
            failures += 1
            results.append(
                {
                    "row": index,
                    "status": "error",
                    "message": f"invalid role '{normalized.get('role', '')}'",
                }
            )
            continue

        try:
            template = cu.load_template(role)
        except FileNotFoundError as exc:
            failures += 1
            results.append({"row": index, "status": "error", "message": str(exc)})
            continue

        location_ids = cu.resolve_location_ids(args, template)
        if not location_ids:
            failures += 1
            results.append(
                {
                    "row": index,
                    "status": "error",
                    "message": "missing locationIds in template or args",
                }
            )
            continue

        company_id = cu.resolve_company_id(args, template, location_ids)
        if not company_id:
            failures += 1
            results.append(
                {
                    "row": index,
                    "status": "error",
                    "message": "unable to resolve companyId",
                }
            )
            continue

        try:
            body = cu.build_body(template, normalized, company_id, location_ids)
        except ValueError as exc:
            failures += 1
            results.append({"row": index, "status": "error", "message": str(exc)})
            continue

        if args.dry_run:
            successes += 1
            results.append(
                {
                    "row": index,
                    "status": "dry-run",
                    "body": json.dumps(body, ensure_ascii=False),
                }
            )
            continue

        location_id = args.location_id or location_ids[0]
        status, response_body = cu.post_user(
            args.base_url,
            args.token,
            args.api_version,
            body,
            args.timeout,
            args.user_agent,
            location_id,
        )

        if cu.should_retry_without_scopes(status, body, response_body):
            body_no_scopes = dict(body)
            body_no_scopes.pop("scopes", None)
            status, response_body = cu.post_user(
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
            results.append({"row": index, "status": "created"})
        else:
            failures += 1
            snippet = (response_body or "").strip()
            if len(snippet) > 500:
                snippet = snippet[:500] + "..."
            results.append(
                {
                    "row": index,
                    "status": f"failed ({status})",
                    "message": snippet,
                }
            )

        if args.delay:
            time.sleep(args.delay)

    summary = {"success": successes, "failed": failures}
    return {"summary": summary, "results": results}, None


def summarize_users(users):
    summarized = []
    for user in users:
        roles = user.get("roles") or {}
        summarized.append(
            {
                "id": user.get("id", ""),
                "name": user.get("name", ""),
                "firstName": user.get("firstName", ""),
                "lastName": user.get("lastName", ""),
                "email": user.get("email", ""),
                "phone": user.get("phone", ""),
                "role": roles.get("role", ""),
                "type": roles.get("type", ""),
                "locationIds": roles.get("locationIds") or [],
                "deleted": user.get("deleted", False),
                "dateAdded": user.get("dateAdded", ""),
                "dateUpdated": user.get("dateUpdated", ""),
            }
        )
    return summarized


def process_list(payload, args):
    # Location ID and Company ID are the same thing
    location_id = args.location_id or args.company_id

    if not location_id:
        return None, "Informe Location ID ou Company ID."

    status, raw, users, total = cu.fetch_all_users(args, location_id)
    if status != 200:
        snippet = (raw or "").strip()
        if len(snippet) > 500:
            snippet = snippet[:500] + "..."
        return None, f"Falha ao listar ({status}) -> {snippet}"

    if payload.get("saveFiles", True):
        cu.write_users_json(args.users_json, users, location_id)
        cu.write_users_csv(args.users_csv, users)

    return (
        {
            "summary": {"count": len(users), "total": total},
            "files": {"json": args.users_json, "csv": args.users_csv},
            "users": summarize_users(users),
        },
        None,
    )


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path in ("/", "/index.html"):
            if not INDEX_PATH.exists():
                self.send_error(404, "index.html not found")
                return
            content = INDEX_PATH.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(content)))
            self.end_headers()
            self.wfile.write(content)
            return
        self.send_error(404, "Not Found")

    def do_POST(self):
        if self.path not in ("/run", "/list"):
            self.send_error(404, "Not Found")
            return

        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length)
        try:
            payload = json.loads(raw.decode("utf-8"))
        except json.JSONDecodeError:
            self.send_error(400, "Invalid JSON")
            return

        args = build_args(payload)

        if self.path == "/run":
            csv_text = payload.get("csv", "")
            if not csv_text.strip():
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": "CSV vazio."}).encode("utf-8"))
                return

            data, error_msg = process_csv(csv_text, args)
        else:
            data, error_msg = process_list(payload, args)

        if error_msg:
            self.send_response(400)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": error_msg}).encode("utf-8"))
            return

        response = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(response)))
        self.end_headers()
        self.wfile.write(response)

    def log_message(self, fmt, *args):
        return


def main():
    server = HTTPServer(("127.0.0.1", 8080), Handler)
    print("Server running at http://127.0.0.1:8080")
    server.serve_forever()


if __name__ == "__main__":
    main()
