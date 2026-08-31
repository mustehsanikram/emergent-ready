# TaskFlow — Technical Plan

## 1. Architecture Overview

```
┌─────────────────┐         HTTP/JSON         ┌──────────────────┐
│   React (Vite)   │  ──────────────────────▶ │  Express API      │
│   Frontend        │ ◀────────────────────── │  (Node.js)         │
│   (nginx in prod) │                           │                    │
└─────────────────┘                           └─────────┬────────┘
                                                          │
                                                          ▼
                                                ┌──────────────────┐
                                                │  SQLite (WAL)     │
                                                │  better-sqlite3   │
                                                └──────────────────┘
```

- **Frontend**: React SPA built with Vite, served as static files (via nginx in the Docker image, or any static host / Azure Static Web Apps / S3+CloudFront in cloud deployments).
- **Backend**: Express REST API. Stateless except for its SQLite file, which lives on a mounted volume.
- **Database**: SQLite via `better-sqlite3` (synchronous, fast, zero network hop). WAL mode enabled for better concurrent read performance.

## 2. Data Model

**projects**
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | autoincrement |
| name | TEXT | required |
| description | TEXT | optional |
| created_at / updated_at | TEXT | ISO-ish datetime, set by SQLite |

**tasks**
| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | autoincrement |
| project_id | INTEGER FK | → projects.id, `ON DELETE CASCADE` |
| title | TEXT | required |
| notes | TEXT | optional |
| status | TEXT | `todo` \| `in_progress` \| `done` |
| priority | TEXT | `low` \| `medium` \| `high` |
| due_date | TEXT | ISO 8601, optional |
| created_at / updated_at | TEXT | |

Indexes on `tasks.project_id` and `tasks.status` for the common query patterns (list by project, filter by status).

## 3. API Design

RESTful, JSON in/out. Full endpoint list in `README.md`. Design choices:

- **Validation** via `express-validator` at the route layer — invalid input never reaches the DB layer.
- **Errors** return `{ error: "message" }` with an appropriate HTTP status (400 validation, 404 not found, 500 unhandled).
- **Health check** (`GET /api/health`) is deliberately dependency-free (no DB call) so it reflects process liveness for platform probes, not DB health. This avoids false-negative restarts if the DB is briefly slow.
- **Cascade deletes**: deleting a project removes its tasks at the DB level (`ON DELETE CASCADE`), avoiding orphaned rows without extra application code.

## 4. Frontend Design

- Component split: `App` (data/state orchestration) → `ProjectSidebar` + `TaskBoard` (presentation + local interaction).
- No global state library — the app is small enough that lifting state to `App` and passing callbacks down is sufficient and easier to reason about than introducing Redux/Zustand for a handful of components.
- API calls centralized in `src/api.js` so the base URL and error handling live in one place (`VITE_API_URL` env var, defaults to `http://localhost:8080/api`).

## 5. Data Persistence & Production Considerations

SQLite was chosen for v1 to minimize moving parts (no separate DB server, trivial local setup, fast for single-instance workloads). It has known limits that matter for production:

- **Not safely shared across multiple app instances** — SQLite file locking doesn't work well over network filesystems, and horizontal scaling of the backend would require a shared DB.
- **Ephemeral container storage** — most cloud app-service platforms don't guarantee disk persistence across restarts/redeploys unless a volume is explicitly mounted (covered in both deployment guides).

**Migration path**: `backend/src/db.js` is the single module that owns the DB connection and schema. Swapping to PostgreSQL means:
1. Replace `better-sqlite3` with `pg` (or an ORM like Prisma/Drizzle if preferred).
2. Rewrite `db.js` to export a connection pool instead of a synchronous handle.
3. Update route handlers' query calls from synchronous (`db.prepare(...).get()/.run()`) to async (`await pool.query(...)`).

No other part of the app touches SQL directly, so the blast radius of this change is contained to `db.js` and the two route files.

## 6. Containerization

- **Backend image**: `node:20-alpine` base, multi-stage not needed (no build step), includes build tools only to compile `better-sqlite3`'s native binding. Runs as a single process on port 8080 with a `HEALTHCHECK` hitting `/api/health`.
- **Frontend image**: two-stage build — `node:20-alpine` to run `vite build`, then `nginx:1.27-alpine` to serve the static output. `nginx.conf` proxies `/api/*` to the backend container by service name (`backend:8080`), which works out of the box in `docker-compose` and can be adapted to a cloud load balancer/ingress config.

## 7. Testing Strategy

- Backend: `node:test` (no extra test framework dependency) covering CRUD lifecycles, cascading relationships, and validation failure paths (missing required fields, invalid foreign keys). Tests run against an isolated temp SQLite file per run — no shared state, no cleanup step needed.
- Frontend: no automated tests yet (v1 scope decision — flagged as a gap, not an oversight). `npm run build` is used as a compile-time smoke test in CI.

## 8. Deployment Strategy

Two supported targets, documented in `deploy/azure/README.md` and `deploy/aws/README.md`:

- **Azure App Service**: two Web Apps (or one Web App + one Static Web App for the frontend), deployed via Azure CLI or the included GitHub Actions workflow.
- **AWS**: Elastic Beanstalk for the simplest path, or ECS/EKS using the same Dockerfiles for a production-grade container orchestration setup — chosen to mirror the microservices-on-EKS pattern used in larger production systems.

## 9. Security Notes (current gaps, intentionally flagged)

- No authentication/authorization layer — anyone with network access to the API can read/write all data. Acceptable for an internal demo; **must** be addressed (JWT, API keys, or platform-native identity) before any public deployment.
- `helmet` is used for baseline HTTP header hardening; CORS is configurable via `CORS_ORIGIN` but defaults to `*` for local dev convenience — this should be locked down to the actual frontend origin in any real deployment.
