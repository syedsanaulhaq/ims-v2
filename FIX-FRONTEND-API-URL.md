# 🔧 Fix Frontend API URL - Rebuild Required

## The Problem

Your `.env` file is correct:
```
VITE_API_URL=http://localhost:5001  ✅ Correct!
```

But the **frontend build** (in `dist/` folder) was created **BEFORE** switching to test environment, so it has the **old API URL** baked into the JavaScript files.

**Browser console shows:**
```
baseUrl: 'https://api.yourdomain.com/api'  ❌ Wrong! Old build
```

**Should show:**
```
baseUrl: 'http://localhost:5001/api'  ✅ Correct after rebuild
```

---

## Why This Happens

### 🎯 Vite's Build Process:

```
1. Read .env file
   VITE_API_URL=http://localhost:5001

2. Replace import.meta.env.VITE_API_URL in source code
   if (import.meta.env.VITE_API_URL) {
     return `${import.meta.env.VITE_API_URL}/api`;
   }
   
3. Bundle into JavaScript (dist/index-CwV7KbHf.js)
   const API_BASE_URL = "http://localhost:5001/api";  ← Hardcoded!

4. Browser loads this JavaScript file
   → API URL is now PERMANENT until you rebuild
```

**The API URL gets BAKED IN at build time, not runtime!**

---

## The Solution

You **MUST rebuild** the frontend after switching environments:

### Option 1: Stop and Restart Everything (Recommended)

```powershell
# In the terminal where npm run test:full is running:
# Press Ctrl+C to stop

# Then restart (this rebuilds automatically):
npm run test:full
```

### Option 2: Just Rebuild (If servers are running)

```powershell
# Keep servers running, just rebuild in a new terminal:
npm run build

# Then refresh browser: http://localhost:4173
```

### Option 3: Manual Kill and Restart

```powershell
# Kill all node processes
taskkill /f /im node.exe

# Wait 2 seconds
Start-Sleep -Seconds 2

# Restart test environment
npm run test:full

# This will:
# 1. Copy .env-test → .env
# 2. BUILD frontend (VITE_API_URL=http://localhost:5001 baked in)
# 3. Start backend (port 5001)
# 4. Start frontend preview (port 4173)
```

---

## Verify the Fix

After rebuilding, check browser console at http://localhost:4173:

**Before rebuild (wrong):**
```javascript
🚀 InvMIS API Configuration: {
  baseUrl: 'https://api.yourdomain.com/api',  ❌
  environment: 'DEVELOPMENT'
}
```

**After rebuild (correct):**
```javascript
🚀 InvMIS API Configuration: {
  baseUrl: 'http://localhost:5001/api',  ✅
  environment: 'test'
}
```

---

## Understanding the Frontend Code

**File: `src/services/invmisApi.ts`**

```typescript
const getApiBaseUrl = () => {
  // Check if running on staging port (8081)
  const currentPort = window.location.port;
  const isStaging = currentPort === '8081' || window.location.hostname.includes('staging');
  
  if (isStaging) {
    return 'http://localhost:5001/api';  // Hardcoded for staging
  }
  
  // Check for environment variable (VITE BUILD TIME)
  if (import.meta.env.VITE_API_URL) {
    return `${import.meta.env.VITE_API_URL}/api`;  ← This gets replaced at BUILD time!
  }
  
  // Default fallback
  return 'http://localhost:3001/api';
};
```

When Vite builds, it replaces `import.meta.env.VITE_API_URL` with the actual value from `.env`:

**Before build (source code):**
```typescript
if (import.meta.env.VITE_API_URL) {
  return `${import.meta.env.VITE_API_URL}/api`;
}
```

**After build (dist/index-*.js):**
```javascript
if ("http://localhost:5001") {  // ← Replaced!
  return "http://localhost:5001/api";  // ← Replaced!
}
```

---

## Port Mappings for All Environments

| Environment | Frontend Port | Backend Port | VITE_API_URL | Frontend Location | Backend Location |
|-------------|---------------|--------------|--------------|-------------------|------------------|
| **Development** | 8080 (vite) | 3001 | http://localhost:3001 | http://localhost:8080 | http://localhost:3001 |
| **Test** | 4173 (preview) | 5001 | http://localhost:5001 | http://localhost:4173 | http://localhost:5001 |
| **Production** | 80 (nginx) | 5000 | https://api.yourdomain.com | https://yourdomain.com | https://api.yourdomain.com |

**Why different ports?**
- **Development**: Uses Vite dev server (hot reload)
- **Test**: Uses Vite preview (simulates production build)
- **Production**: Uses web server (Apache/Nginx)

**Why separate frontend/backend ports?**
- Backend = REST API server (Express.js on Node)
- Frontend = Static files (HTML, CSS, JS served by Vite)
- They communicate via HTTP requests (CORS enabled)

---

## The Fix You Need RIGHT NOW

```powershell
# 1. Stop current test:full (Ctrl+C in that terminal)

# 2. Restart it (rebuilds with correct .env)
npm run test:full

# 3. Wait 30-60 seconds for build

# 4. Open browser
http://localhost:4173

# 5. Check console - should see:
#    baseUrl: 'http://localhost:5001/api' ✅

# 6. Login should work!
```

---

## Why npm run test:full Works

**File: `package.json`**
```json
"test:full": "powershell -Command \"./switch-env.ps1 test; npm run build\" && concurrently \"npm run backend\" \"npm run preview\""
```

**What it does:**
```
1. ./switch-env.ps1 test
   → Copies .env-test to .env
   
2. npm run build
   → Vite reads .env
   → Replaces import.meta.env.VITE_API_URL with http://localhost:5001
   → Creates dist/ folder with correct API URL baked in
   
3. npm run backend
   → Starts Express server on port 5001
   → Connects to InventoryManagementDB_TEST
   
4. npm run preview
   → Serves dist/ folder on port 4173
   → Frontend has correct API URL!
```

---

## Common Mistakes

❌ **Mistake 1**: Editing `.env` and expecting immediate change
- **Problem**: Frontend already built, old URL in dist/
- **Fix**: Rebuild after any .env change

❌ **Mistake 2**: Running `npm run preview` without rebuilding
- **Problem**: Serves old dist/ folder
- **Fix**: Run `npm run build` first

❌ **Mistake 3**: Using `npm run dev` for test environment
- **Problem**: Dev server doesn't use preview port (4173)
- **Fix**: Use `npm run test:full` which uses preview

❌ **Mistake 4**: Forgetting to switch environment first
- **Problem**: Building with wrong .env file
- **Fix**: Run `./switch-env.ps1 test` before building

---

## Quick Reference

### To Start Test Environment:
```powershell
npm run test:full
```

### To Rebuild After .env Changes:
```powershell
npm run build
```

### To Check Current API URL:
```powershell
# Open browser console at http://localhost:4173
# Look for: 🚀 InvMIS API Configuration
```

### To Verify Backend Connection:
```powershell
# Backend terminal should show:
# ✅ Connected to SQL Server: InventoryManagementDB_TEST
# 🚀 InvMIS API Server running on port 5001
```

---

## Summary

**The API URL Configuration Chain:**

```
.env-test (source)
    ↓
switch-env.ps1 (copies)
    ↓
.env (active)
    ↓
npm run build (reads VITE_API_URL)
    ↓
dist/index-*.js (HARDCODED URL)
    ↓
Browser (loads JavaScript)
    ↓
API calls to http://localhost:5001 ✅
```

**Remember:**
- ✅ Environment variables = Build time (not runtime!)
- ✅ Must rebuild after switching environments
- ✅ `npm run test:full` does everything automatically
- ✅ Check browser console to verify API URL
