# 🔗 FoodSphere Integration & Local Development Guide
> Unified workspace configuration for running Django Backend alongside React Admin Panel

---

## 🛠️ Local Development Setup

To run both applications in tandem locally without encountering CORS issues, we use a **Vite Dev Server Proxy** setup.

### 🐍 1. Django Backend Setup
1. Open a terminal and navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Activate the virtual environment:
   ```bash
   # Windows PowerShell
   .\venv\Scripts\Activate.ps1
   # Windows CMD
   .\venv\Scripts\activate.bat
   # macOS/Linux
   source venv/bin/activate
   ```
3. Copy/configure the `.env` settings (already stubbed inside `backend/.env`):
   ```env
   SECRET_KEY=your_secret_key_here
   DEBUG=True
   ALLOWED_HOSTS=*
   CORS_ALLOW_ALL_ORIGINS=True
   ```
4. Start the Django development server:
   ```bash
   python manage.py runserver 8000
   ```

### ⚛️ 2. React Admin Dashboard Setup
1. Open another terminal window and navigate to the admin folder:
   ```bash
   cd admin
   ```
2. Install dependencies (if not already done):
   ```bash
   npm install
   ```
3. Set up the local environment file (`admin/.env.local`):
   ```env
   # Leave empty to let Vite proxy handle requests, or set to your local Django host
   VITE_API_URL=
   ```
4. Start the React development server:
   ```bash
   npm run dev
   ```
   This starts Vite on `http://localhost:5173`. Any call to relative endpoint `/api/*` is automatically proxied to `http://localhost:8000/api/*`, bypassing CORS.

---

## 🔑 Environment Variable Reference

### 1. Backend (`backend/.env` / Render Env Vars)
| Variable | Description | Default / Example |
|---|---|---|
| `SECRET_KEY` | Django standard security hash | `django-insecure-...` |
| `DEBUG` | Enable debug logs | `True` (Dev) / `False` (Prod) |
| `DATABASE_URL` | Production PostgreSQL connection string | `postgres://user:pass@host:5432/db` |
| `CORS_ALLOW_ALL_ORIGINS` | Allows cross-origin API calls | `True` (Local/Dev) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary Storage Cloud Name | Required for permanent images |
| `CLOUDINARY_API_KEY` | Cloudinary Storage API Key | Required for permanent images |
| `CLOUDINARY_API_SECRET` | Cloudinary Storage API Secret | Required for permanent images |
| `FCM_SERVICE_ACCOUNT_JSON` | Firebase service account credentials | Required for push alerts |

### 2. React Admin (`admin/.env` / `.env.local`)
| Variable | Description | Example |
|---|---|---|
| `VITE_API_URL` | Points to the backend base API endpoint | `https://restaurant-app-web.onrender.com` |

---

## 🔄 Authentication & Token Refresh Flow

1. **Login (`POST /api/auth/login/`):**
   * Authenticates user and returns an `access` (60 min lifespan) and a `refresh` token.
2. **Auto-Refresh:**
   * React's `apiFetch` interceptor automatically checks API responses. If a request returns `401 Unauthorized` and a refresh token is present, it freezes the request, sends a single call to `/api/auth/refresh/`, updates the access token, and retries the original request.
   * Concurrent 401s are deduplicated (merged) into a single refresh request.
3. **Idempotent Logout (`POST /api/auth/logout/`):**
   * Pings the blacklist endpoint to blacklist the refresh token on the server.
   * Client-side localStorage is cleared immediately. If the token is already expired or invalid, it gracefully returns success.

---

## 🚦 Troubleshooting & Connection Issues

### ⚠️ Preflight CORS errors in Local Dev
* **Fix:** Make sure you are accessing the dashboard on `http://localhost:5173` (Vite dev server) and your `VITE_API_URL` in `admin/.env.local` is **empty/blank**. This forces the app to make relative queries to the same origin, letting Vite's `server.proxy` handle the forwarding.

### ⏱️ 50-Second Load Times on First Request
* **Reason:** Render.com's free-tier instances sleep after 15 minutes of inactivity. The first request triggers a cold-start boot.
* **Fix:** Set up a free monitoring cron-job on [UptimeRobot.com](https://uptimerobot.com) or [Cron-Job.org](https://cron-job.org) targeting the health check endpoint: `https://restaurant-app-web.onrender.com/health/` every 10 minutes.
