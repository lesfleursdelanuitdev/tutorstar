#!/bin/bash
# Register podman secrets for the TutorStar Quadlet unit, under svc-tutorstar.
# Run as momolig AFTER install.sh (the svc-tutorstar user must exist).
#
# Values are read from the repo .env. The DATABASE_URL host is rewritten
# localhost/127.0.0.1 -> 10.0.2.2 so the container reaches host Postgres via slirp.
# Secrets are created in svc-tutorstar's rootless store; nothing is written to disk.
set -euo pipefail

ENV_FILE="${ENV_FILE:-/srv/apps/tutorstar/.env}"
RUN_USER="svc-tutorstar"

if [[ "$(id -un)" != "momolig" ]]; then
  echo "Run as momolig." >&2
  exit 1
fi
if ! id "$RUN_USER" &>/dev/null; then
  echo "User ${RUN_USER} does not exist — run install.sh first." >&2
  exit 1
fi
if [[ ! -s "$ENV_FILE" ]]; then
  echo "Missing ${ENV_FILE}" >&2
  exit 1
fi

# Pull a KEY=value out of the env file (last match wins, strips surrounding quotes).
getval() { grep -E "^$1=" "$ENV_FILE" | tail -n1 | cut -d= -f2- | sed -E 's/^"(.*)"$/\1/; s/^'"'"'(.*)'"'"'$/\1/'; }

DB_URL="$(getval DATABASE_URL)"
AUTH_SECRET="$(getval BETTER_AUTH_SECRET)"
RESEND_KEY="$(getval RESEND_API_KEY)"

# Container reaches host Postgres via 10.0.2.2 (host loopback), not localhost.
DB_URL_CONTAINER="$(echo "$DB_URL" | sed -E 's#@(localhost|127\.0\.0\.1):#@10.0.2.2:#')"

recreate() { # name value
  local name="$1" val="$2"
  sudo -u "$RUN_USER" podman secret rm "$name" >/dev/null 2>&1 || true
  printf '%s' "$val" | sudo -u "$RUN_USER" podman secret create "$name" -
  echo "  registered $name"
}

echo "Registering secrets for ${RUN_USER}..."
[[ -n "$DB_URL_CONTAINER" ]] || { echo "DATABASE_URL empty in $ENV_FILE" >&2; exit 1; }
[[ -n "$AUTH_SECRET" ]]      || { echo "BETTER_AUTH_SECRET empty in $ENV_FILE" >&2; exit 1; }
recreate tutorstar-db-url      "$DB_URL_CONTAINER"
recreate tutorstar-auth-secret "$AUTH_SECRET"

if [[ -n "$RESEND_KEY" ]]; then
  recreate tutorstar-resend-key "$RESEND_KEY"
else
  echo "  RESEND_API_KEY empty — skipping tutorstar-resend-key."
  echo "  NOTE: also remove the RESEND_API_KEY Secret= line from tutorstar.container,"
  echo "        or the unit will fail to start on a missing secret."
fi

echo "Done. Reload: sudo systemctl --user -M ${RUN_USER}@ daemon-reload"
