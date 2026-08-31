# TaskFlow — Project Plan

## 1. Purpose

TaskFlow is a small, full-stack project & task management application built to demonstrate taking an application from source code to a fully functional, tested, containerized, and cloud-deployable product. It doubles as a working reference implementation for engagements that involve:

- Picking up an existing/generated codebase and making it production-ready
- Deploying to a cloud app service platform (Azure App Service, AWS)
- Ensuring functional correctness and performance before handoff

## 2. Scope

### In scope (v1)
- Project management: create, rename, delete projects
- Task management: create, update, move between statuses (To Do / In Progress / Done), delete
- Task metadata: priority (low/medium/high), notes, due date
- REST API with validation and error handling
- Web UI (React) consuming the API
- Automated backend test suite
- Containerization (Docker) for both frontend and backend
- Deployment documentation for Azure App Service and AWS

### Out of scope (v1)
- User authentication / multi-user support
- Real-time collaboration (websockets, live sync)
- File attachments on tasks
- Notifications/reminders
- Mobile app

These are natural v2 candidates and are called out again in Section 6.

## 3. Milestones

| # | Milestone | Deliverable | Status |
|---|---|---|---|
| 1 | Backend API | Express + SQLite API with projects/tasks CRUD, validation, health check | ✅ Done |
| 2 | Backend tests | Automated test suite covering CRUD lifecycles and validation edge cases | ✅ Done |
| 3 | Frontend UI | React app with project sidebar and Kanban-style task board | ✅ Done |
| 4 | Containerization | Dockerfiles for backend and frontend, docker-compose for local dev | ✅ Done |
| 5 | Cloud deployment docs | Step-by-step guides for Azure App Service and AWS (EB + ECS/EKS) | ✅ Done |
| 6 | CI/CD | GitHub Actions workflow for automated Azure deployment | ⏳ Pending (needs a token with `workflow` scope to push) |
| 7 | Documentation | Project plan, technical plan, README, API reference | ✅ Done (this set) |

## 4. Roles & Responsibilities

Single-developer engagement (Mustehsan Ikram) covering:
- Architecture and API design
- Backend implementation and testing
- Frontend implementation
- Containerization and deployment configuration
- Documentation

## 5. Assumptions & Constraints

- SQLite is used for v1 to keep the app dependency-free and easy to run locally or in a small container. It is explicitly **not** intended as the production datastore at scale — see Technical Plan §5 for the migration path to a managed database.
- No authentication layer exists yet; the API is open. This is acceptable for a demo/internal tool but must be addressed before any public-facing production deployment.
- Deployment guides assume the reader has basic familiarity with the Azure CLI or AWS CLI/console; they are not zero-knowledge tutorials.

## 6. Future Work (v2+ candidates)

- Authentication (JWT-based or platform-native, e.g., Azure AD / AWS Cognito)
- Swap SQLite → managed Postgres (Azure Database for PostgreSQL / Amazon RDS)
- Real-time updates via WebSockets
- Task comments and file attachments
- Recurring tasks / reminders
- Multi-tenant support (teams/organizations)

## 7. Risks

| Risk | Mitigation |
|---|---|
| SQLite file loss on ephemeral cloud storage | Documented in both deployment guides; recommend managed DB or persistent volume/mount |
| No auth means API is open if deployed publicly | Explicitly flagged in README and this plan; recommend adding auth before any public deployment |
| Single point of failure (single container/instance) | Deployment guides note horizontal scaling requires moving off SQLite first |
