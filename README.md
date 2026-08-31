# n8n Admin

Internal, single-purpose administration console for one n8n Docker Swarm service. It is designed for an operator who needs to see the live queue, stop/start n8n safely, cancel queued executions deliberately, and change the production concurrency limit without using an SSH session or `docker service` shell commands.

It is deliberately not a generic Docker administration panel: the only Docker service it can manage is the value of `N8N_SERVICE` configured on the server.

## What it does

- Shows n8n replica state, `N8N_CONCURRENCY_PRODUCTION_LIMIT`, PostgreSQL availability, and `new` / `running` executions.
- Requires its own HTTP Basic Auth for the UI and every `/api/*` endpoint. `/health` is deliberately public for platform health checks.
- Stops and starts the named Swarm service through Docker Engine API using `dockerode` and `/var/run/docker.sock`.
- Clears `NEW`, `RUNNING`, or both only after the operator explicitly selects a scope and confirms it. The exact flow is: inspect → stop n8n → confirm `0/0` → check PostgreSQL → cancel only the selected statuses → verify those statuses are empty → start n8n → confirm `1/1`.
- Changes concurrency using stop → update service environment → start → verify, avoiding a rolling update while a host-mode port is already occupied.
- Allows only one in-process maintenance operation at a time. Concurrent requests receive `409 Conflict`.
- Keeps the latest 20 operation results in memory and exposes their safe summary through `/api/history`.

Queue queries are fixed in code and use the existing n8n table only:

```sql
SELECT status, COUNT(*) AS cantidad
FROM execution_entity
WHERE status IN ('new', 'running')
GROUP BY status;
```

```sql
UPDATE execution_entity
SET status = 'canceled',
    "stoppedAt" = COALESCE("stoppedAt", NOW())
WHERE status::text = ANY($1::text[]);
```

The `$1` parameter is a server-validated array containing `new`, `running`, or both. The client cannot supply another execution status.

## Architecture

```text
Browser (Basic Auth)
        │
        ▼
Express / Node.js 22 ── dockerode ── /var/run/docker.sock ── Docker Swarm service: rp_n8n
        │
        └────────────── pg ───────── POSTGRES_HOST service: rp_n8n_db
```

The application resolves the Docker service by its configured name each time. It does not use a container ID, a fixed IP address, `localhost` for PostgreSQL, or `child_process` Docker commands.

## Requirements

- Node.js 22 for local development.
- A Docker Swarm **manager** socket available to the deployed app. A worker-only Docker socket cannot inspect or update Swarm services.
- Network/DNS access from this app to the PostgreSQL service hostname (for example `rp_n8n_db`).
- A PostgreSQL account that can read and update `execution_entity`.
- A distinct, strong application username and password.

## Environment variables

Copy the template and fill in the secrets outside Git:

```sh
cp .env.example .env
```

| Variable | Purpose |
| --- | --- |
| `PORT` | Listener port; use `3000`. |
| `N8N_SERVICE` | Exact Swarm service name. Defaults in the template to `rp_n8n`. |
| `POSTGRES_HOST` | PostgreSQL service DNS name, never `localhost`; template uses `rp_n8n_db`. |
| `POSTGRES_PORT`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | Existing n8n PostgreSQL connection. |
| `APP_USERNAME`, `APP_PASSWORD` | Mandatory Basic Auth credentials for this app. They are never sent to the frontend or logged. |
| `CLEAN_TIMEOUT_SECONDS` | Maximum time allowed before the queue-clean critical stages (inspect, stop, database check, update, verification) must finish. Recovery startup still uses the start timeout so it is never skipped merely because this deadline elapsed. |
| `SERVICE_START_TIMEOUT_SECONDS` | Maximum time waiting for `1/1`. |
| `SERVICE_STOP_TIMEOUT_SECONDS` | Maximum time waiting for `0/0`. |

The server refuses to start if required non-secret configuration or either app credential is absent. `POSTGRES_PASSWORD` may be empty only if the database is configured to allow that; do not leave it empty unintentionally.

## Run locally

```sh
npm ci
npm start
```

Open `http://127.0.0.1:3000` and authenticate with `APP_USERNAME` / `APP_PASSWORD`.

Local development must still reach the actual Swarm manager socket and the PostgreSQL service name. A laptop normally cannot resolve `rp_n8n_db`; use this mode only from an appropriately connected host or change `POSTGRES_HOST` in your untracked `.env` to a safe development database hostname.

Run a syntax check before committing:

```sh
npm run check
```

## Build and test the Docker image

```sh
docker build -t n8n-admin .
```

Example for a controlled local test. Replace `YOUR_SWARM_NETWORK` only when that is the network where `rp_n8n_db` resolves, and keep the real secrets in `.env` rather than typing them into shell history.

```sh
docker run --rm --name n8n-admin \
  --network YOUR_SWARM_NETWORK \
  --env-file .env \
  -p 3000:3000 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  n8n-admin
```

Then check the container-only health endpoint:

```sh
curl http://127.0.0.1:3000/health
```

Expected response:

```json
{"status":"ok"}
```

Do not use the local `-p 3000:3000` example as the production EasyPanel exposure method.

## Deploy on EasyPanel with Docker Compose

This repository includes `docker-compose.yml` so the Docker socket bind mount is declared in code. Create the Compose service in the **same EasyPanel project** as the existing n8n and PostgreSQL services.

1. In EasyPanel, select **New Service → Compose**.
2. Choose GitHub source, repository `KalciferTolueno/n8n-admin`, branch `main`, build path `/`, and Compose file `docker-compose.yml`.
3. In the Environment editor, copy every variable from `.env.example` and supply the real `POSTGRES_PASSWORD`, `APP_USERNAME`, and `APP_PASSWORD`. Enable EasyPanel's **Create .env file** option so Compose receives those values at runtime. Never commit `.env`.
4. Add an HTTPS domain such as `n8n-admin.midominio.com` and route it to the Compose service `n8n-admin` on port `3000`. Do **not** publish `3000` directly on the host.
5. Configure EasyPanel Basic Auth as a second, distinct authentication layer.
6. Deploy and open `/health`. A `{"status":"ok"}` response proves that the application started; then authenticate in the UI and verify the live service status before performing maintenance.

The Compose file mounts `/var/run/docker.sock` from the host to the same path inside the app. Do not override the Dockerfile entrypoint or container user: the entrypoint grants the unprivileged Node process access to the mounted socket. This host must be a Docker Swarm manager, and `N8N_SERVICE` must match the exact Swarm service name.

The container starts its entrypoint as root briefly only to read the mounted socket's group ID. It then executes Node as the non-root `node` user with that supplemental group. Do not override the container user or entrypoint in EasyPanel; doing so can prevent access to `/var/run/docker.sock`.

## Verify connectivity safely

After authenticating, `GET /api/status` is the primary operational check:

```sh
curl --user "$APP_USERNAME:$APP_PASSWORD" https://n8n-admin.midominio.com/api/status
```

Healthy output contains `postgres.status: "connected"` and the requested service name, without exposing the service's raw Docker configuration or any password.

If PostgreSQL is unavailable, first verify that the n8n Admin app is connected to a Docker/EasyPanel network that can resolve `rp_n8n_db`. From a temporary diagnostic container on the **same network**, resolve the hostname with `getent hosts rp_n8n_db`. If it does not resolve, inspect the service/network name in EasyPanel or Swarm and update only `POSTGRES_HOST`; do not use a container ID or fixed IP.

If Docker access is unavailable, `/api/status` reports that the service status is unavailable. Check that the socket mount exists, that the Docker daemon is a Swarm manager, and that EasyPanel did not override the image entrypoint or user. The service logs are structured JSON and include an operation ID and the failed stage, but never credentials.

## Failure behavior and safety rules

- If n8n fails to reach `0/0`, the queue `UPDATE` is never attempted.
- If PostgreSQL is unavailable after the stop, the queue is not changed and n8n is restarted when it had successfully reached `0/0`.
- If the `UPDATE` or post-clean verification fails, the error is returned to the UI and the server still attempts to restart n8n.
- If the queue was cleaned but n8n cannot be started, the response and UI explicitly say that the cleanup succeeded but service recovery failed.
- Queue cleanup is never automatic, including when the `new` count is high. It requires an explicit modal confirmation each time.
- The cleanup modal requires choosing `Solo NEW`, `Solo RUNNING`, or `NEW y RUNNING`. Unselected statuses are not updated and are not required to reach zero during verification.
- The in-memory lock covers queue clean, start, stop, and concurrency changes. It is scoped to one container; run one app replica for this version.

## Docker socket warning

Mounting `/var/run/docker.sock` grants this app powerful control over the Docker daemon and, indirectly, the host. The application limits its own code path to one named service, but a socket mount is still a privileged trust boundary.

Keep this app on an administrative HTTPS domain, require the app's Basic Auth plus EasyPanel Basic Auth, avoid public discovery, use a strong unique password, and limit EasyPanel/project access. If you need a stricter boundary later, place a tightly allow-listed Docker API proxy in front of the socket; do not expose Docker's TCP API publicly.

## Prepared for a second version

The status API and UI separate service, database, and queue data so a later read-only metrics section can add:

- entries in the last minute;
- completed executions in the last minute;
- average duration;
- current `NEW`, `RUNNING`, and concurrency.

Those metrics should remain observational; they must not trigger automatic queue cancellation.

## Upload to GitHub

From the `n8n-admin` directory:

```sh
git init
git add .
git commit -m "Create n8n Admin"
git branch -M main
git remote add origin https://github.com/YOUR_ORG/n8n-admin.git
git push -u origin main
```

Create the empty GitHub repository first, with no generated README or `.gitignore`, then replace `YOUR_ORG` with the intended account or organization. Confirm `.env` is not listed by `git status` before pushing.
