# MGTAB Detector V1 — Railway Deployment Guide (2026)

---

## Why Railway for This Project

Railway is the best fit for MGTAB Detector V1 because:

- **Supports Node.js + Python in one service** — your backend spawns Python as a subprocess, not a separate HTTP server. Railway runs both in the same container.
- **Nixpacks auto-detection** — Railway automatically detects `package.json` (Node) and `requirements.txt` (Python) and installs both runtimes.
- **No Docker knowledge required** — Railway builds from source; you only need to configure a few settings.
- **Fast GitHub integration** — push to `main`, Railway redeploys automatically.
- **Free tier** — 500 execution hours/month, sufficient for demos and evaluations.

---

## Prerequisites

Before starting, confirm you have:

- [ ] GitHub account with your `mgtab-detector` repo pushed
- [ ] Railway account at [railway.app](https://railway.app) (sign up with GitHub)
- [ ] `inference/models/mlp_v1.pt` committed to the repo (**not gitignored**)
- [ ] `inference/models/normalization_stats.json` committed to the repo
- [ ] `inference/requirements.txt` exists with all Python dependencies

---

## Step 1: Prepare the Code Before Pushing

Do these **before** creating Railway services. Make changes locally, then push to GitHub.

### 1.1 — Verify model files are not gitignored

```bash
# Run from project root
git check-ignore -v inference/models/mlp_v1.pt
git check-ignore -v inference/models/normalization_stats.json
```

If either command returns output, they are being ignored. Fix it by adding exceptions to `.gitignore`:

```gitignore
# In your root .gitignore, add these two lines:
!inference/models/mlp_v1.pt
!inference/models/normalization_stats.json
```

Then commit and push:

```bash
git add inference/models/mlp_v1.pt inference/models/normalization_stats.json .gitignore
git commit -m "chore: include model files for Railway deployment"
git push origin main
```

> ⚠️ **If these files are not in the repo, the Python inference service will crash on startup with a FileNotFoundError.**

---

### 1.2 — Create a root-level `requirements.txt`

Railway's Nixpacks looks for `requirements.txt` at the **root of the service's build directory**. Since your backend's root directory will be `/backend`, you need to place the Python requirements there.

```bash
# Copy inference requirements into the backend folder
cp inference/requirements.txt backend/requirements.txt

git add backend/requirements.txt
git commit -m "chore: add requirements.txt to backend for Railway Python detection"
git push origin main
```

Your `backend/requirements.txt` should contain at minimum:

```txt
torch>=2.0.0
sentence-transformers>=2.2.0
numpy>=1.24.0
```

> 💡 If `ENABLE_LABSE=false` (recommended for free tier), `sentence-transformers` is not loaded at runtime, but it must still be listed so Nixpacks installs Python correctly.

---

### 1.3 — Create a `Procfile` in the backend folder

```bash
# Create backend/Procfile
echo "web: node src/server.js" > backend/Procfile

git add backend/Procfile
git commit -m "chore: add Procfile for Railway"
git push origin main
```

---

### 1.4 — Update CORS in your backend to allow the Railway frontend URL

Open `backend/src/app.js` and find your CORS configuration. Change it to read from an environment variable:

```javascript
// backend/src/app.js — find your cors() call and update it to:
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:4173',
    process.env.FRONTEND_URL,       // ← Railway will set this
  ].filter(Boolean),
  credentials: true,
}));
```

```bash
git add backend/src/app.js
git commit -m "fix: read CORS origin from FRONTEND_URL env var"
git push origin main
```

---

### 1.5 — Verify your frontend reads the API URL from env

Open `frontend/src/lib/api.ts` (or wherever your API base URL is set) and confirm it looks like this:

```typescript
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1';
```

If it has a hardcoded `localhost`, change it to use `import.meta.env.VITE_API_BASE_URL`.

```bash
git add frontend/src/lib/
git commit -m "fix: use VITE_API_BASE_URL env var for API base URL"
git push origin main
```

---

## Step 2: Create Two Railway Services

Log in to [railway.app](https://railway.app) and click **New Project**.

---

### Service A: Backend (Node.js + Python Inference)

#### 2A.1 — Create the service

1. Click **New Project** → **Deploy from GitHub repo**
2. Select your `mgtab-detector` repository
3. Railway creates one service automatically — this will be your **backend**

#### 2A.2 — Configure service settings

Click the service → **Settings** tab:

| Setting | Value |
|---|---|
| **Service Name** | `mgtab-backend` |
| **Root Directory** | `backend` |
| **Build Command** | `npm install` |
| **Start Command** | `node src/server.js` |
| **Health Check Path** | `/api/v1/health` |

> ⚠️ **Root Directory is critical.** Setting it to `backend` tells Railway to run all commands from inside the `/backend` folder, which means `requirements.txt`, `Procfile`, and `node_modules` all resolve correctly from there.

#### 2A.3 — Set environment variables

Click **Variables** tab → **Raw Editor** → paste this entire block:

```env
NODE_ENV=production
PORT=3001
PYTHON_PATH=python3
INFERENCE_SCRIPT_PATH=../inference/inference_v1.py
MODEL_PATH=../inference/models/mlp_v1.pt
NORMALIZATION_STATS_PATH=../inference/models/normalization_stats.json
ENABLE_MONGODB=false
ENABLE_FULL_GNN=false
ENABLE_LABSE=false
LOG_LEVEL=info
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
FRONTEND_URL=https://PLACEHOLDER-set-this-after-frontend-deploys.up.railway.app
```

> ⚠️ Leave `FRONTEND_URL` as a placeholder for now. You will update it after the frontend deploys in Step 2B.

**Variable explanations:**

| Variable | Why it matters |
|---|---|
| `NODE_ENV=production` | Enables rate limiting, disables debug logs, enables Express hardening |
| `PORT=3001` | Railway reads this to know which port to expose |
| `PYTHON_PATH=python3` | Nixpacks installs Python as `python3` — do not use `python` |
| `INFERENCE_SCRIPT_PATH` | Path relative to `/backend` at runtime. `../inference/` goes up one level to repo root, then into `inference/` |
| `MODEL_PATH` | Same — relative to backend working directory at runtime |
| `ENABLE_LABSE=false` | **Critical for free tier.** LaBSE requires ~1.5GB RAM. Railway free tier has 512MB. Keeping this false means tweet text is ignored and a zero-vector is used instead — the MLP still works. |
| `ENABLE_MONGODB=false` | Use in-memory history for V1. If you add a Railway MongoDB plugin later, set to `true` and add `MONGODB_URI`. |
| `FRONTEND_URL` | Used by your CORS config to whitelist the deployed frontend |

#### 2A.4 — Deploy and get the backend URL

Click **Deploy**. Watch the **Build Logs**. Successful deployment looks like:

```
Installing Node.js dependencies...
Installing Python dependencies from requirements.txt...
Build successful

Starting: node src/server.js
[INFO] Inference service starting...
[INFO] Python process ready — model loaded (mlp_v1.pt)
[INFO] Server listening on port 3001
```

Once deployed, Railway gives you a public URL:
```
https://mgtab-backend-production-xxxx.up.railway.app
```

**Save this URL** — you need it for the frontend.

Test it immediately:

```bash
curl https://mgtab-backend-production-xxxx.up.railway.app/api/v1/health
```

Expected response:
```json
{ "status": "ok", "model": { "loaded": true }, "timestamp": "2026-04-07T..." }
```

---

### Service B: Frontend (React Static Site)

#### 2B.1 — Add a second service

Inside the same Railway project → **New** → **GitHub Repo** → select the same `mgtab-detector` repository again.

#### 2B.2 — Configure service settings

Click the new service → **Settings**:

| Setting | Value |
|---|---|
| **Service Name** | `mgtab-frontend` |
| **Root Directory** | `frontend` |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | *(leave empty — Railway detects `dist/` and serves it as a static site)* |
| **Publish Directory** | `dist` |

> 💡 If Railway doesn't auto-detect static mode, go to **Settings → Networking → Static Site** and set publish directory to `dist`.

#### 2B.3 — Set environment variables

Click **Variables** → **Raw Editor**:

```env
VITE_API_BASE_URL=https://mgtab-backend-production-xxxx.up.railway.app/api/v1
NODE_ENV=production
```

> ⚠️ **`VITE_API_BASE_URL` must be set BEFORE the build runs.** Vite bakes this value into the JS bundle at build time — it is not read at runtime. If you set it after building, you must **redeploy** the frontend.

Replace `mgtab-backend-production-xxxx` with your actual backend Railway URL from Step 2A.4.

#### 2B.4 — Deploy and get frontend URL

Click **Deploy**. Build logs should show:

```
Installing Node.js dependencies...
Running: npm run build
vite v8.x building for production...
✓ built in 900ms
dist/index.html       5.2 kB
dist/assets/index.js  490 kB
Build successful — serving static files from dist/
```

Your frontend URL:
```
https://mgtab-frontend-production-xxxx.up.railway.app
```

---

## Step 3: Post-Deployment Configuration

### 3.1 — Update backend CORS with real frontend URL

Go to the **backend service** → **Variables** tab:

Change:
```
FRONTEND_URL=https://PLACEHOLDER-set-this-after-frontend-deploys.up.railway.app
```

To:
```
FRONTEND_URL=https://mgtab-frontend-production-xxxx.up.railway.app
```

This triggers a **automatic redeploy** of the backend.

### 3.2 — Test end-to-end

Open your frontend Railway URL in a browser:
```
https://mgtab-frontend-production-xxxx.up.railway.app
```

1. Wait for the page to load (may take 5–10 seconds on first load — Python subprocess is warming up)
2. Fill in some test values in the form with clear bot-like indicators:
   - `followers_count`: 10
   - `friends_count`: 4999
   - `statuses_count`: 80000
   - `default_profile`: true (toggle on)
   - `default_profile_image`: true (toggle on)
   - `description_length`: 0
3. Click **Run Bot Detection**
4. Expect a ResultCard showing **Bot** with confidence ≥ 80%

Open browser DevTools (F12) → Console. If you see:
```
Access to fetch at 'https://backend-url...' has been blocked by CORS policy
```
→ CORS is not set correctly. Go back to Step 3.1 and verify `FRONTEND_URL` matches exactly.

---

## Step 4: Important Notes for Python on Railway

### How Nixpacks installs Python

When Railway finds `requirements.txt` in the build root (`/backend`), its Nixpacks builder:
1. Installs Python 3.11 via Nix
2. Creates a virtualenv
3. Runs `pip install -r requirements.txt`
4. Adds `python3` to `PATH`

Your backend then spawns it with:
```javascript
spawn('python3', ['../inference/inference_v1.py'])
```

This works because at runtime on Railway, `python3` is available system-wide.

### Cold start and subprocess lifecycle

| Phase | What happens | Time |
|---|---|---|
| Railway starts container | Node.js boots | ~2s |
| Node starts Python subprocess | Python imports torch, loads `mlp_v1.pt` | ~5–8s |
| First prediction request | Goes straight to already-loaded model | ~50–200ms |
| Subsequent requests | Same warm Python process, no reload | ~50ms |
| Service idle >30 min (free tier) | Railway hibernates the container | — |
| First request after hibernation | Full cold start again (~10s) | — |

> 💡 **For your demo:** Visit the backend health URL 30 seconds before your evaluator uses the app. This warms up the Python subprocess so inference feels instant.

### LaBSE memory warning (Railway free tier = 512MB RAM)

```
ENABLE_LABSE=false   ← Keep this. Never change to true on free tier.
```

With `ENABLE_LABSE=false`:
- Tweet text entered by the user is **silently ignored**
- The 768 tweet embedding dimensions are set to `0.0`
- The MLP still produces valid predictions using the 20 profile features
- The form still shows the tweet box — it just won't influence the result

If you need LaBSE, upgrade Railway to the Hobby plan ($5/month) which gives 2GB RAM.

---

## Step 5: Common Issues & Fixes

### ❌ Python not found / `spawn python3 ENOENT`

**Cause:** `requirements.txt` not in `/backend`, so Nixpacks didn't install Python.

**Fix:**
```bash
ls backend/requirements.txt   # Must exist
```
If missing:
```bash
cp inference/requirements.txt backend/requirements.txt
git add backend/requirements.txt
git commit -m "fix: add requirements.txt to backend"
git push
```

---

### ❌ Model file not loading / `FileNotFoundError: mlp_v1.pt`

**Cause 1:** File is gitignored and not in the repo.

**Fix:** Follow Step 1.1 — add gitignore exception and force-commit the files.

**Cause 2:** `MODEL_PATH` is wrong relative to the backend working directory.

**Debug:** In Railway → **Logs**, look for the Python process startup. Check what path it printed.

**Fix:** The backend's working directory on Railway is `/app/backend/` (or similar). The path `../inference/models/mlp_v1.pt` goes up to `/app/`, then into `inference/models/`. Verify the repo structure matches this.

---

### ❌ CORS error in browser console

**Symptom:** `Access to fetch ... blocked by CORS policy`

**Fix checklist:**
1. Confirm `FRONTEND_URL` in backend matches the **exact** Railway frontend URL (no trailing slash)
2. Confirm your `app.js` CORS code uses `process.env.FRONTEND_URL`:
   ```javascript
   origin: [process.env.FRONTEND_URL, 'http://localhost:5173'].filter(Boolean)
   ```
3. After changing `FRONTEND_URL`, wait for backend to redeploy, then **hard refresh** the browser (Ctrl+Shift+R)

---

### ❌ Frontend shows "Could not reach inference server"

**Cause 1:** `VITE_API_BASE_URL` is wrong or was set after the build.

**Fix:** Go to frontend service → Variables → confirm the URL → **Redeploy** (manually trigger redeploy after setting the variable).

**Cause 2:** Backend is still warming up (cold start).

**Fix:** Wait 10-15 seconds and retry. The Python model takes time to load on first request.

**Cause 3:** Backend is crashed (OOM — out of memory from LaBSE).

**Fix:** Set `ENABLE_LABSE=false` and redeploy backend.

---

### ❌ Build fails on frontend / TypeScript errors

**Fix:**
```bash
# Test locally first
cd frontend
npm run build

# Fix any errors, then push
git push
```

---

### 📋 How to check logs on Railway

1. Go to your service on railway.app
2. Click **Deployments** tab → select the latest deployment
3. Click **View Logs** — shows both build logs and runtime logs

For real-time logs:
- Install Railway CLI: `npm install -g @railway/cli`
- Run: `railway logs --service mgtab-backend`

---

## Final Pre-Deploy Checklist

### Repository
- [ ] `inference/models/mlp_v1.pt` — committed and NOT in `.gitignore`
- [ ] `inference/models/normalization_stats.json` — committed and NOT in `.gitignore`
- [ ] `backend/requirements.txt` — exists (copy of `inference/requirements.txt`)
- [ ] `backend/Procfile` — contains `web: node src/server.js`
- [ ] CORS in `backend/src/app.js` reads from `process.env.FRONTEND_URL`
- [ ] Frontend API URL reads from `import.meta.env.VITE_API_BASE_URL`

### Backend Service (Railway)
- [ ] Root Directory set to `backend`
- [ ] Build Command: `npm install`
- [ ] Start Command: `node src/server.js`
- [ ] `NODE_ENV=production`
- [ ] `PORT=3001`
- [ ] `PYTHON_PATH=python3`
- [ ] `INFERENCE_SCRIPT_PATH=../inference/inference_v1.py`
- [ ] `MODEL_PATH=../inference/models/mlp_v1.pt`
- [ ] `NORMALIZATION_STATS_PATH=../inference/models/normalization_stats.json`
- [ ] `ENABLE_LABSE=false` ← **critical for free tier RAM limit**
- [ ] `ENABLE_MONGODB=false`
- [ ] `FRONTEND_URL=https://your-actual-frontend.up.railway.app`

### Frontend Service (Railway)
- [ ] Root Directory set to `frontend`
- [ ] Build Command: `npm install && npm run build`
- [ ] Publish Directory: `dist`
- [ ] `VITE_API_BASE_URL=https://your-actual-backend.up.railway.app/api/v1`
- [ ] Frontend redeployed **after** `VITE_API_BASE_URL` was set

### Post-Deploy Verification
- [ ] `curl https://your-backend.up.railway.app/api/v1/health` → `{"status":"ok"}`
- [ ] Frontend loads at Railway URL with no browser console errors
- [ ] Submit a test prediction → ResultCard appears
- [ ] History tab shows the prediction
- [ ] No CORS errors in browser DevTools

---

## Quick Reference: Railway URLs After Deployment

| Service | URL Pattern |
|---|---|
| Backend API | `https://mgtab-backend-production-xxxx.up.railway.app` |
| Health check | `https://mgtab-backend-production-xxxx.up.railway.app/api/v1/health` |
| Model info | `https://mgtab-backend-production-xxxx.up.railway.app/api/v1/model/info` |
| Frontend app | `https://mgtab-frontend-production-xxxx.up.railway.app` |

---

*Guide written for Railway 2026 — Nixpacks v1.x, Node.js 20+, Python 3.11+*
