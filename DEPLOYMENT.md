# RTI Saathi backend deployment

Build and run the release candidate with:

```sh
npm ci
npm run typecheck
npm test
npm start
```

`npm start` compiles TypeScript before launching `dist/server.js`.

## Required production configuration

- `NODE_ENV=production`
- `PORT`
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- `DB_CONNECT_TIMEOUT_MS`
- `DEMO_MODE`
- `DEMO_USER_EMAIL`, `DEMO_USER_PASSWORD`, `DEMO_SESSION_TTL_MINUTES` when demo mode is enabled
- `FRONTEND_ORIGIN` (or legacy `FRONTEND_URL`) as a single URL origin, without a path

## Release controls

- `DEMO_PAYMENT_PROOF_TTL_MINUTES` controls server-issued demo payment proof lifetime.
- `LOGIN_RATE_LIMIT_MAX` and `LOGIN_RATE_LIMIT_WINDOW_MS` control in-memory login throttling.
- `JSON_BODY_LIMIT` is the explicit Express JSON limit and defaults to `1mb`.
- `SHUTDOWN_TIMEOUT_MS` bounds graceful HTTP, persistence, and database shutdown.
- `DB_LOGGING` must remain `false` unless SQL diagnostics are intentionally required.

## Optional AI configuration

- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `OPENAI_RTI_VECTOR_STORE_ID`

Missing AI configuration or unavailable provider quota does not prevent startup. AI-backed endpoints use their deterministic safe fallbacks. Do not store real credentials in `.env.example` or source control.

## Degraded database mode

If MySQL is unavailable at startup, the application selects the existing in-memory store. Both health endpoints remain HTTP 200 and report `database: "unavailable"` with `applicationStore: "memory"`. Runtime records in this mode are not durable.
