# TaskFlow

A small, full-stack project & task management app — built as a functional, deployable demo of taking a codebase from "written" to "fully working and cloud-deployed."

## Stack
- **Backend**: Node.js / Express, SQLite (via `better-sqlite3`), input validation, health check endpoint
- **Frontend**: React (Vite), plain CSS
- **Infra**: Dockerfiles for both services, `docker-compose.yml` for local dev, GitHub Actions workflow for Azure, deployment guides for Azure App Service and AWS

## Features
- Create/rename/delete projects
- Create tasks under a project with title, priority, and status
- Move tasks between To Do / In Progress / Done
- Task counts and completion progress per project
- `/api/health` endpoint for platform readiness/liveness probes

## Running locally

### With Docker (recommended)
```bash
docker compose up --build
```
- Frontend: http://localhost:3000
- Backend API: http://localhost:8080/api

### Without Docker
```bash
# Backend
cd backend
npm install
npm start          # listens on :8080

# Frontend (separate terminal)
cd frontend
npm install
npm run dev         # Vite dev server, proxies to :8080 via VITE_API_URL
```

## Running tests
```bash
cd backend
npm test
```

## Deploying
See `deploy/azure/README.md` and `deploy/aws/README.md` for step-by-step deployment to Azure App Service and AWS (Elastic Beanstalk or ECS/EKS).

## API summary
| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/projects` | List projects |
| POST | `/api/projects` | Create project |
| PUT | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project |
| GET | `/api/tasks?project_id=&status=` | List tasks |
| POST | `/api/tasks` | Create task |
| PUT | `/api/tasks/:id` | Update task |
| DELETE | `/api/tasks/:id` | Delete task |

## Notes on production readiness
SQLite is used here for simplicity and zero external dependencies. For real production deployment at scale, swap `backend/src/db.js` for a managed DB (Azure Database for PostgreSQL / Amazon RDS) — it's the only file that touches persistence directly, by design.
