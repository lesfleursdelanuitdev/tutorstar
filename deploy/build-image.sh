#!/bin/bash
# Build localhost/tutorstar:prod. Run as momolig from anywhere.
#
# Mirrors gonsalves build-prod-images.sh: mounts the repo .env as an ephemeral
# "dotenv" build secret and builds with --network host so any DB-touching prerender
# reaches host Postgres (127.0.0.1:5432). No secret lands in an image layer.
#
# After a successful build, load the image into svc-tutorstar's rootless store:
#   podman save localhost/tutorstar:prod | sudo -u svc-tutorstar podman load
# (deploy/quadlet/install.sh does this for you on first install.)
set -euo pipefail

REPO="/srv/apps/tutorstar"
DOTENV="${DOTENV:-$REPO/.env}"   # override with DOTENV=/path if you keep a build-only env

if [[ "$(id -un)" != "momolig" ]]; then
  echo "Run as momolig." >&2
  exit 1
fi

if [[ ! -s "$DOTENV" ]]; then
  echo "Missing build env file: $DOTENV" >&2
  exit 1
fi

cd "$REPO"

echo "Building localhost/tutorstar:prod ..."
podman build --no-cache --network host \
  --secret "id=dotenv,src=${DOTENV}" \
  -f deploy/Dockerfile \
  --ignorefile deploy/.dockerignore \
  -t tutorstar:prod .

echo "Done. Next: load into svc-tutorstar (see header) or run deploy/quadlet/install.sh."
