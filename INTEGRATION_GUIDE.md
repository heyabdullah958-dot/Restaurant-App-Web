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

### 📱 3. Customer Mobile App (`/app`) Setup
1. Open a terminal and navigate to the customer app:
   ```bash
   cd app
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Expo development server on port 8081:
   ```bash
   npx expo start --port 8081 --clear
   ```

### 📲 4. Merchant Manager Mobile App (`/admin-app`) Setup
1. Open a terminal and navigate to the manager app:
   ```bash
   cd admin-app
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Expo development server on port 8082:
   ```bash
   npx expo start --port 8082 --clear
   ```

---

## 🔑 Environment Variable Reference

### 1. Backend (`backend/.env` / Heroku Config Vars)
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

### 2. React Admin & Mobile Apps
| Variable | Description | Example |
|---|---|---|
| `VITE_API_URL` (Admin HQ) | Points to the backend base API endpoint | `https://getfoodpk-fd9b20442fcf.herokuapp.com/api` |
| `EXPO_PUBLIC_API_URL` (Mobile Apps) | Fallback API endpoint for Expo clients | `https://getfoodpk-fd9b20442fcf.herokuapp.com/api` |

---

## 🧪 Automated Testing Suite

To verify full multi-tenant integration across customer checkout, merchant alarms, rider assignments, and account isolation, run:
```bash
python test_dual_app_e2e.py
```

