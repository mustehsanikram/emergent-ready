# Deploying to AWS

Two supported paths depending on how much infra you want to manage.

## Option A — Elastic Beanstalk (simplest, good for a demo/small app)

```bash
# One-time setup
pip install awsebcli --upgrade
cd backend
eb init taskflow-api --platform node.js-20 --region us-east-1
eb create taskflow-api-env --single --envvars NODE_ENV=production,PORT=8080

# Redeploy after changes
eb deploy
```

Frontend: build and upload to S3 + CloudFront (see below), or deploy as a second EB environment behind nginx as in the Dockerfile.

```bash
cd ../frontend
npm ci
VITE_API_URL="https://<your-eb-backend-url>/api" npm run build

aws s3 mb s3://taskflow-frontend-<unique-suffix>
aws s3 sync dist/ s3://taskflow-frontend-<unique-suffix> --delete
aws s3 website s3://taskflow-frontend-<unique-suffix> --index-document index.html
# Put CloudFront in front of the bucket for HTTPS + caching.
```

**Note on data**: Elastic Beanstalk instances are ephemeral. For anything beyond a demo, replace SQLite with **Amazon RDS (PostgreSQL)** — only `backend/src/db.js` needs to change.

## Option B — ECS / EKS with the provided Dockerfiles (production-grade)

The `backend/Dockerfile` and `frontend/Dockerfile` build directly into container images suitable for ECS Fargate or EKS.

```bash
# Build and push backend image
aws ecr create-repository --repository-name taskflow-backend
docker build -t taskflow-backend ./backend
docker tag taskflow-backend:latest <account-id>.dkr.ecr.<region>.amazonaws.com/taskflow-backend:latest
aws ecr get-login-password --region <region> | docker login --username AWS --password-stdin <account-id>.dkr.ecr.<region>.amazonaws.com
docker push <account-id>.dkr.ecr.<region>.amazonaws.com/taskflow-backend:latest

# Repeat for frontend, then create an ECS Fargate service (or EKS Deployment/Service)
# pointing at each image. Attach an EFS volume to the backend task for /app/data,
# or migrate to RDS PostgreSQL for a stateless container.
```

For EKS specifically: apply standard Deployment + Service + Ingress manifests referencing these images;
this mirrors the same microservices-on-EKS pattern used for larger production platforms.

## Environment variables (both options)
| Variable | Backend | Frontend |
|---|---|---|
| `PORT` | API listen port (default 8080) | — |
| `CORS_ORIGIN` | Allowed frontend origin | — |
| `DATA_DIR` | SQLite data directory | — |
| `VITE_API_URL` | — | API base URL baked in at build time |
