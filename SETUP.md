# InfraCode CRM Setup

## 1. Prerequisites

Install the following tools locally:

- Python 3.11+
- Node.js 20+
- npm 10+
- Docker and Docker Compose
- Rust toolchain (`rustup`) for the desktop app
- On Windows for Tauri packaging: Microsoft C++ Build Tools and WebView2 runtime

## 2. Start infrastructure

From the repository root:

```bash
docker compose up -d
```

This starts:

- PostgreSQL on `localhost:5432`
- MinIO API on `localhost:9000`
- MinIO Console on `localhost:9001`
- Automatic bucket creation for `infracode-crm`

## 3. Configure backend environment

Copy the example env file:

```bash
cp backend/.env.example backend/.env
```

Generate a valid Fernet key and update `FERNET_KEY` in `backend/.env`:

```bash
python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

Also replace at least:

- `SECRET_KEY`
- `DATAJUD_API_KEY`
- `CRM_PASSWORD`

## 4. Install backend dependencies

```bash
cd backend
python3 -m venv .venv
. .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

## 5. Run database migrations

Still inside `backend/`:

```bash
alembic upgrade head
```

## 6. Start the backend

Still inside `backend/` with the virtualenv active:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Useful endpoints:

- Health: `http://localhost:8000/health`
- API base: `http://localhost:8000/api/v1`

Default login credentials come from `backend/.env`:

- Email: `CRM_EMAIL`
- Password: `CRM_PASSWORD`

## 7. Install frontend dependencies

In a second terminal:

```bash
cd frontend
npm install
```

## 8. Start the frontend

```bash
npm run dev
```

Frontend URL:

- `http://localhost:5173`

The frontend talks to the backend at:

- `http://localhost:8000/api/v1`

## 9. Run the desktop app with Tauri 2

Keep the backend running.

From `frontend/`:

```bash
npm run tauri:dev
```

Notes:

- The Tauri config starts the Vite dev server automatically.
- On Linux/macOS, make sure your Rust toolchain is installed.
- On Windows, install the WebView2 runtime and MSVC build tools before packaging.

## 10. Build production frontend

From `frontend/`:

```bash
npm run build
```

Generated output:

- `frontend/dist`

## 11. Build the desktop installer

From `frontend/`:

```bash
npm run tauri:build
```

Expected Windows bundle targets:

- `.msi`
- `.exe` (NSIS)

## 12. Common workflow

Recommended terminal layout:

Terminal 1:

```bash
cd backend
. .venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Terminal 2:

```bash
cd frontend
npm run dev
```

Terminal 3 for desktop development:

```bash
cd frontend
npm run tauri:dev
```

## 13. MinIO access

- Console URL: `http://localhost:9001`
- User: `minioadmin`
- Password: `minioadmin`
- Bucket: `infracode-crm`

## 14. First-use checklist

- `docker compose up -d`
- `cp backend/.env.example backend/.env`
- generate and set `FERNET_KEY`
- install backend deps
- `alembic upgrade head`
- start backend
- install frontend deps
- start frontend
- log in with `.env` credentials

## 15. Railway

For a production deploy on Railway with GitHub autodeploy, use the configuration and steps in `RAILWAY.md`.
