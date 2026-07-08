#!/bin/bash
# Install the TutorStar Quadlet unit for rootless Podman under svc-tutorstar.
# Run as momolig (uses sudo for the system account + subuid allocation).
#
# Does NOT register secrets and does NOT start the container — see README.md.
# Mirrors gonsalves deploy/quadlet/install.sh, single-app variant.
set -euo pipefail

QUADLET_SRC="/srv/apps/tutorstar/deploy/quadlet"
RUN_USER="svc-tutorstar"
RUN_GROUP="svc-tutorstar"
RUN_HOME="/var/lib/${RUN_USER}"
QUADLET_DST="${RUN_HOME}/.config/containers/systemd"
IMAGE="localhost/tutorstar:prod"

if [[ "$(id -un)" != "momolig" ]]; then
  echo "Run as momolig (uses sudo for system accounts)." >&2
  exit 1
fi

if ! id "$RUN_USER" &>/dev/null; then
  echo "Creating system user ${RUN_USER}..."
  sudo useradd --system --home-dir "$RUN_HOME" --create-home --shell /usr/sbin/nologin "$RUN_USER"
fi

if ! grep -q "^${RUN_USER}:" /etc/subuid 2>/dev/null; then
  echo "Allocating subuid/subgid for ${RUN_USER} (rootless Podman)..."
  # Next free range after svc-ligneous (296608+65536 = 362144). Verified 2026-07-08.
  sudo usermod --add-subuids 362144-427679 --add-subgids 362144-427679 "$RUN_USER"
fi

sudo mkdir -p "$QUADLET_DST" "${RUN_HOME}/.config/systemd/user"
sudo cp "$QUADLET_SRC/tutorstar.container" "$QUADLET_DST/"
sudo chown -R "$RUN_USER:$RUN_GROUP" "$RUN_HOME/.config"
sudo chmod 700 "$QUADLET_DST"

sudo loginctl enable-linger "$RUN_USER"

if ! podman image exists "$IMAGE"; then
  echo "Image ${IMAGE} not found in momolig's store — run deploy/build-image.sh first." >&2
  exit 1
fi
echo "Loading ${IMAGE} into ${RUN_USER}'s rootless store..."
podman save "$IMAGE" | sudo -u "$RUN_USER" podman load

echo ""
echo "Installed Quadlet unit to ${QUADLET_DST}/tutorstar.container"
echo ""
echo "Next steps (manual):"
echo "  1. Register podman secrets:   ${QUADLET_SRC}/register-secrets.sh"
echo "  2. Reload + dry-run:"
echo "       sudo systemctl --user -M ${RUN_USER}@ daemon-reload"
echo "       sudo systemctl --user -M ${RUN_USER}@ list-unit-files 'tutorstar*'"
echo "  3. Start:"
echo "       sudo systemctl --user -M ${RUN_USER}@ start tutorstar.service"
echo "       curl -sS -o /dev/null -w '%{http_code}\\n' http://127.0.0.1:3041/"
echo "  4. Add nginx vhost + TLS (see README.md), then reload nginx."
echo ""
echo "Logs: journalctl --user -M ${RUN_USER}@ -u tutorstar.service -f"
