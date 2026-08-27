# Deploying to Azure App Service

## Prerequisites
- Azure CLI installed and logged in (`az login`)
- Two App Service instances: one for the backend (Node runtime), one for the frontend (or serve frontend as a static site via Azure Static Web Apps)

## Option A — Manual CLI deploy

```bash
# Resource group + plan (skip if they already exist)
az group create --name taskflow-rg --location eastus
az appservice plan create --name taskflow-plan --resource-group taskflow-rg --sku B1 --is-linux

# Backend Web App (Node 20 runtime)
az webapp create \
  --resource-group taskflow-rg \
  --plan taskflow-plan \
  --name taskflow-api \
  --runtime "NODE:20-lts"

az webapp config appsettings set \
  --resource-group taskflow-rg \
  --name taskflow-api \
  --settings NODE_ENV=production PORT=8080 CORS_ORIGIN="https://<your-frontend-domain>"

# Note: App Service's filesystem is not persistent across restarts/scaling.
# For production, mount Azure Files or swap SQLite for Azure Database for PostgreSQL.
az webapp config storage-account add \
  --resource-group taskflow-rg \
  --name taskflow-api \
  --custom-id taskflow-data \
  --storage-type AzureFiles \
  --account-name <storage-account> \
  --share-name taskflow-data \
  --access-key <storage-key> \
  --mount-path /app/data

cd backend
zip -r ../backend.zip .
az webapp deploy --resource-group taskflow-rg --name taskflow-api --src-path ../backend.zip --type zip

# Frontend (static build) — deploy dist/ to a Static Web App or a second App Service
cd ../frontend
npm ci && VITE_API_URL="https://taskflow-api.azurewebsites.net/api" npm run build
az staticwebapp create \
  --name taskflow-web \
  --resource-group taskflow-rg \
  --source ./dist \
  --location eastus2
```

## Option B — GitHub Actions (recommended)
See `.github/workflows/deploy-azure.yml`. It deploys on every push to `main`.

1. In each App Service, go to **Get publish profile** and download it.
2. Add them as repo secrets: `AZURE_BACKEND_PUBLISH_PROFILE`, `AZURE_FRONTEND_PUBLISH_PROFILE`.
3. Update `AZURE_WEBAPP_NAME_BACKEND` / `AZURE_WEBAPP_NAME_FRONTEND` in the workflow file to match your App Service names.
4. Push to `main` — the workflow builds and deploys both services.

## Data persistence note
SQLite + local App Service disk is fine for a demo but **not durable** under scaling or restarts.
For a production app, either:
- Mount Azure Files as done above, or
- Swap the DB layer for Azure Database for PostgreSQL (the `db.js` module is the only file that would need to change).
