# TutorStar production deploy

Serves **https://tutor.lesfleursdelanuit.com**. Mirrors the gonsalves prod model:
rootless Podman **Quadlet** under a dedicated lingering service user, nginx TLS
proxy to a `127.0.0.1` port, host Postgres reached via `slirp4netns` + `10.0.2.2`.

| Thing | Value |
|-------|-------|
| Service user | `svc-tutorstar` (system, lingering, subuid `362144-427679`) |
| Host port | `127.0.0.1:3041` (3039/3040 belong to gonsalves) |
| Image | `localhost/tutorstar:prod` (`next start`, non-standalone) |
| Container | `tutorstar` |
| DB | `tutorstar` DB + role on host Postgres; container URL host = `10.0.2.2:5432` |
| Secrets | podman secrets `tutorstar-db-url`, `tutorstar-auth-secret`, `tutorstar-resend-key` |

## Preflight facts (verified 2026-07-08)
- DNS `tutor.lesfleursdelanuit.com` → this host. ✅
- DB `tutorstar` + role exist and are **fully migrated** (3/3 drizzle migrations, 21 tables). ✅
- No TLS cert covers `tutor.` yet — certbot step below issues one.
- `svc-tutorstar` and its subuid range do **not** exist yet — `install.sh` creates them.

## Files
| File | Purpose |
|------|---------|
| `Dockerfile` | Single-stage Next.js prod image (no next.config.ts change needed) |
| `.dockerignore` | Build-context excludes |
| `build-image.sh` | Build `localhost/tutorstar:prod` (as momolig) |
| `quadlet/tutorstar.container` | Quadlet unit |
| `quadlet/install.sh` | Create svc-tutorstar, install unit, load image |
| `quadlet/register-secrets.sh` | Register podman secrets from `.env` (rewrites DB host → 10.0.2.2) |
| `nginx/tutorstar` | HTTP vhost; certbot converts it to TLS |

## Runbook (run as momolig)

```bash
cd /srv/apps/tutorstar

# 1. Build the image
./deploy/build-image.sh

# 2. Create service user + install unit + load image (uses sudo)
./deploy/quadlet/install.sh

# 3. Register secrets (reads .env; rewrites DB host to 10.0.2.2)
./deploy/quadlet/register-secrets.sh

# 4. Start the container
U='sudo systemctl --user -M svc-tutorstar@'
$U daemon-reload
$U start tutorstar.service
curl -sS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3041/   # expect 200/3xx

# 5. nginx vhost + TLS
sudo install -m 644 deploy/nginx/tutorstar /etc/nginx/sites-available/tutorstar
sudo ln -sf /etc/nginx/sites-available/tutorstar /etc/nginx/sites-enabled/tutorstar
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d tutor.lesfleursdelanuit.com      # issues cert, adds :443 + redirect

# 6. Verify
curl -sSI https://tutor.lesfleursdelanuit.com/ | head
```

Boot persistence: `loginctl enable-linger svc-tutorstar` (install.sh does this) +
`WantedBy=default.target` in the unit. After reboot:
`sudo systemctl --user -M svc-tutorstar@ is-active tutorstar.service`.

Logs: `journalctl --user -M svc-tutorstar@ -u tutorstar.service -f`

## Notes
- **No application source is modified.** `BETTER_AUTH_URL` becomes the prod origin via
  the unit's `Environment=`, not by editing the repo `.env`. The repo `.env` (localhost)
  stays as-is for local dev.
- The `.next-<user>` per-user `distDir` in `next.config.ts` is self-consistent inside the
  image (build + `next start` both run as root → `.next-root`). Do not add `USER` to the
  Dockerfile without keeping build and runtime on the same user.
- Redeploy after code changes: `./deploy/build-image.sh` → reload image into svc-tutorstar
  (`podman save localhost/tutorstar:prod | sudo -u svc-tutorstar podman load`) →
  `$U restart tutorstar.service`. Schema changes: run `npm run db:migrate` from the repo
  as momolig against `localhost:5432` **before** restarting.
- Without a Resend key, emails are logged to the journal, not sent. See
  `register-secrets.sh` / `tutorstar.container` for how to drop the Resend secret.
