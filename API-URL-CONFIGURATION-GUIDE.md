# 🎯 Where API URL is Configured - Complete Guide

## 📍 Configuration Locations by Environment

### 1️⃣ DEVELOPMENT Environment

**Environment File: `.env-development`**
```ini
# Line 13-14
API_URL=http://localhost:3001
VITE_API_URL=http://localhost:3001
```

**Ports:**
- Frontend: 8080 (Vite dev server)
- Backend: 3001 (Express API)

**To Use:**
```powershell
npm run dev:full
# Frontend: http://localhost:8080 → Backend: http://localhost:3001
```

---

### 2️⃣ TEST Environment (Your Current Issue!)

**Environment File: `.env-test`**
```ini
# Line 13-14
API_URL=http://localhost:5001
VITE_API_URL=http://localhost:5001
```

**Ports:**
- Frontend: 4173 (Vite preview)
- Backend: 5001 (Express API)

**To Use:**
```powershell
npm run test:full
# Frontend: http://localhost:4173 → Backend: http://localhost:5001
```

**❗ YOUR PROBLEM:**
You ran `npm run test:full` but the build still has old API URL because:
1. Frontend was built BEFORE environment switch, OR
2. You need to rebuild after switching

---

### 3️⃣ PRODUCTION Environment

**Environment File: `.env-production`**
```ini
# Line 13-14
API_URL=https://api.yourdomain.com
VITE_API_URL=https://api.yourdomain.com
```

**Ports:**
- Frontend: 80 (Web server)
- Backend: 5000 (Express API)

**To Use:**
```powershell
npm run prod:full
# Frontend: https://yourdomain.com → Backend: https://api.yourdomain.com
```

---

## 🔧 Frontend Code That Uses API URL

### Location 1: `src/services/invmisApi.ts` (Main API Service)

**Line 8-25:**
```typescript
const getApiBaseUrl = () => {
  // Check if running on staging port (8081)
  const currentPort = window.location.port;
  const isStaging = currentPort === '8081' || window.location.hostname.includes('staging');
  
  if (isStaging) {
    return 'http://localhost:5001/api';
  }
  
  // ⭐ THIS IS WHERE VITE_API_URL IS USED
  if (import.meta.env.VITE_API_URL) {
    return `${import.meta.env.VITE_API_URL}/api`;
  }
  
  // Fallback to development
  return 'http://localhost:3001/api';
};

const API_BASE_URL = getApiBaseUrl();
```

**What happens during build:**
```typescript
// BEFORE BUILD (source code):
if (import.meta.env.VITE_API_URL) {
  return `${import.meta.env.VITE_API_URL}/api`;
}

// AFTER BUILD (dist/index-*.js) with .env-test:
if ("http://localhost:5001") {  // ← Replaced by Vite!
  return "http://localhost:5001/api";  // ← Hardcoded!
}
```

---

### Location 2: `src/services/sessionService.ts` (Session Management)

**Line 2:**
```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
```

**What happens during build:**
```typescript
// BEFORE BUILD:
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// AFTER BUILD with .env-test:
const API_BASE_URL = "http://localhost:5001" || 'http://localhost:3001';
// Result: API_BASE_URL = "http://localhost:5001"
```

---

## 🚨 Why Your Browser Shows Wrong URL

**Your browser console error:**
```javascript
🚀 InvMIS API Configuration: {
  baseUrl: 'https://api.yourdomain.com/api',  ❌ WRONG!
  environment: 'DEVELOPMENT'
}
```

**This means:** The frontend build (dist folder) was created when `.env` contained production or default values.

---

## ✅ THE FIX - Step by Step

### Step 1: Verify Current Environment File

```powershell
# Check what .env currently has
Get-Content .env | Select-String "VITE_API_URL"
```

**Should show:**
```
VITE_API_URL=http://localhost:5001  ✅
```

If NOT, run:
```powershell
.\switch-env.ps1 test
```

---

### Step 2: Stop Current Servers

In the terminal running `npm run test:full`:
- Press `Ctrl+C`

---

### Step 3: Rebuild and Restart

```powershell
npm run test:full
```

**This will:**
1. ✅ Copy `.env-test` → `.env` (in case it wasn't copied)
2. ✅ Run `npm run build` (reads VITE_API_URL from .env)
3. ✅ Start backend on port 5001
4. ✅ Start frontend preview on port 4173

**Wait for this message:**
```
✅ Connected to SQL Server: InventoryManagementDB_TEST
📊 Database has 425 users
🚀 InvMIS API Server running on port 5001
  ➜  Local:   http://localhost:4173/
```

---

### Step 4: Verify in Browser

1. Open: http://localhost:4173
2. Press F12 (Open DevTools)
3. Go to Console tab
4. Look for: `🚀 InvMIS API Configuration`

**Should now show:**
```javascript
🚀 InvMIS API Configuration: {
  baseUrl: 'http://localhost:5001/api',  ✅ CORRECT!
  environment: 'test'
}
```

---

## 📊 How the Build Process Works

```
┌─────────────────────────────────────────────────────────┐
│  STEP 1: Environment Switch                             │
│  $ .\switch-env.ps1 test                                │
│                                                          │
│  Copies: .env-test → .env                               │
│  Result: .env now has VITE_API_URL=http://localhost:5001│
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  STEP 2: Vite Build Reads .env                          │
│  $ npm run build                                         │
│                                                          │
│  Vite reads: VITE_API_URL=http://localhost:5001         │
│  Searches source files for: import.meta.env.VITE_API_URL│
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  STEP 3: Vite Replaces in Source Code                   │
│                                                          │
│  File: src/services/invmisApi.ts                        │
│  Before: import.meta.env.VITE_API_URL                   │
│  After:  "http://localhost:5001"                        │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  STEP 4: Bundle into JavaScript                         │
│                                                          │
│  Creates: dist/assets/index-CwV7KbHf.js                 │
│  Contains: const API_BASE_URL = "http://localhost:5001" │
│                                                          │
│  ⚠️ URL IS NOW HARDCODED IN JAVASCRIPT FILE!            │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  STEP 5: Preview Server Serves dist/                    │
│  $ npm run preview                                       │
│                                                          │
│  Serves: http://localhost:4173                          │
│  Loads: dist/index.html                                 │
│  Loads: dist/assets/index-CwV7KbHf.js                   │
│          (with hardcoded API URL)                        │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  STEP 6: Browser Makes API Calls                        │
│                                                          │
│  Frontend (port 4173) → Backend (port 5001)             │
│  GET http://localhost:5001/api/session                  │
│  POST http://localhost:5001/api/auth/login              │
│                                                          │
│  ✅ WORKING!                                             │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 Summary of ALL Config Files

### Backend Configuration

**File: `invmis-api-server.cjs`**
**Line 29-60:** (Reads from `.env`)
```javascript
const config = {
  server: process.env.SQL_SERVER_HOST,
  database: process.env.SQL_SERVER_DATABASE,
  port: parseInt(process.env.PORT || '5001'),
  // ...
};
```

**Backend reads `.env` at RUNTIME** (every time you start it)

---

### Frontend Configuration

**Files that use VITE_API_URL:**

1. **src/services/invmisApi.ts** - Main API service
2. **src/services/sessionService.ts** - Session management
3. **src/services/itemMasterApi.new.ts** - Item API (if used)

**Frontend reads `.env` at BUILD TIME ONLY** (when you run `npm run build`)

---

## 🔄 When to Rebuild

**You MUST rebuild frontend when:**
- ✅ After running `switch-env.ps1`
- ✅ After editing `.env` file
- ✅ After editing `.env-test` or `.env-development`
- ✅ When switching from dev to test to prod

**You DON'T need to rebuild when:**
- ❌ Backend code changes (just restart backend)
- ❌ Database changes (just restart backend)
- ❌ Backend port stays the same

---

## 📝 Quick Commands Reference

```powershell
# Switch environment (copies .env-test → .env)
.\switch-env.ps1 test

# Just rebuild frontend
npm run build

# Just start backend
npm run backend

# Just start frontend preview
npm run preview

# Do everything (recommended)
npm run test:full

# Kill all node processes
taskkill /f /im node.exe
```

---

## 🎬 What to Do RIGHT NOW

```powershell
# 1. In the terminal where npm run test:full is running:
#    Press Ctrl+C

# 2. Run this one command:
npm run test:full

# 3. Wait for build to complete (30-60 seconds)

# 4. You should see:
#    ✅ Connected to SQL Server: InventoryManagementDB_TEST
#    ➜  Local:   http://localhost:4173/

# 5. Open browser:
http://localhost:4173

# 6. Check console - should see correct API URL:
#    baseUrl: 'http://localhost:5001/api'

# 7. Login should work! 🎉
```

---

## ❓ Understanding: Why Separate Ports?

**Frontend Port (4173):**
- Serves static files (HTML, CSS, JavaScript)
- Your browser loads this
- The JavaScript makes API calls

**Backend Port (5001):**
- REST API endpoints
- Connects to SQL Server database
- Returns JSON data

**Why separate?**
- Frontend = User Interface (runs in browser)
- Backend = Database + Business Logic (runs on server)
- They communicate via HTTP/HTTPS

**Example API call:**
```
Browser (localhost:4173) 
    → GET http://localhost:5001/api/session
    ← JSON response {user: {...}}
```

This is called a **SPA (Single Page Application)** architecture with a separate API backend.

---

**TL;DR: Run `npm run test:full` again to rebuild with correct API URL!**
