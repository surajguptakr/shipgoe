# Shipgoe Backend – Next Steps (Auth, DB, Validation, Deployment)

This file is a planning scratchpad. You can replace it with real code or docs later.

## 1. Auth (future)

- Simple API key:
  - Expect header: `x-api-key: <key>` on all `/api/*` routes.
  - Load allowed keys from env variable: `SHIPGOE_API_KEYS` (comma-separated).
  - Express middleware:
    - Reject with `401` if key missing/invalid.
    - Attach `req.user` or `req.clientId` for logging.
- Later upgrade:
  - JWT-based auth for merchants / operations dashboard.
  - Issue tokens from a `/auth/login` route after verifying credentials.

## 2. Real DB instead of JSON (future)

- Start with SQLite or Postgres.
  - Tables:
    - `shipments(id, from_city, to_city, mode, status, eta, created_at, updated_at)`
    - `positions(id, shipment_id, at, lat, lng, accuracy_m, speed_kph, heading_deg)`
    - `events(id, shipment_id, at, code, label, message, location)`
- Replace `shipments.json` reads/writes with DB queries:
  - `GET /api/tracking/shipments/:id`:
    - Look up shipment by `id`.
    - Load last N positions and all (or recent) events.
  - `POST /api/tracking/shipments`:
    - Insert/replace rows in `shipments` and optionally initial events.

## 3. Validation (future)

- Add a validation library (e.g. `zod` or `joi`).
- Validate request bodies:
  - `POST /api/tracking/shipments`:
    - `id` string (required).
    - `mode` in `['SURFACE', 'AIR', 'HYPERLOCAL']`.
    - `baseRoute` as non-empty array of `{ lat: number, lng: number }`.
  - Any future endpoints for positions/events ingestion.
- Return structured errors:
  - Status `400` with `{ error: 'message', fieldErrors: { fieldName: 'reason' } }`.

## 4. Error handling & logging (future)

- Global error handler middleware:
  - Catch thrown errors and send JSON with `500` (unless they set their own status).
  - Log stack traces with a correlation ID.
- Request logging:
  - Use `morgan` or a simple custom logger.
  - Log method, path, status, response time, and `req.clientId` from auth.

## 5. Deployment (future)

- Containerization:
  - Add `Dockerfile`:
    - `FROM node:lts-alpine`
    - Copy `package.json` & `package-lock.json`.
    - `npm ci`, then copy source.
    - `CMD ["node", "server.js"]`.
- Hosting:
  - Deploy container to Render, Railway, fly.io, or AWS.
  - Expose HTTPS endpoint, e.g. `https://api.shipgoe.com`.
- Config:
  - Environment variables:
    - `PORT`
    - `NODE_ENV`
    - `SHIPGOE_API_KEYS`
    - DB connection vars (`DATABASE_URL` or similar).

