# 🚀 InvMIS Deployment Stages

This document describes the three-stage deployment pipeline for the Inventory Management System (InvMIS).

## 📊 Deployment Pipeline Overview

```
Development → Demo → Production
```

---

## 🔵 Stage 1: Development

**Purpose**: Active development and testing

**Configuration**:
- Frontend: `http://localhost:8080`
- Backend: `http://localhost:5000`
- Database: `InvMISDB` on `SYED-FAZLI-LAPT`
- Environment File: `.env.development`

**How to Deploy**:
```powershell
# Start development server
npm run dev:start

# Or use the dev server directly
npm run dev
```

**Features**:
- Hot module reloading
- Debug mode enabled
- Verbose error messages
- Direct database connection

---

## 🟡 Stage 2: Demo

**Purpose**: Client demonstrations and previews before staging

**Configuration**:
- Frontend: `http://localhost:8082`
- Backend: `http://localhost:5002`
- Database: `InvMISDB` on `SYED-FAZLI-LAPT`
- Environment File: `.env.demo`

**How to Deploy**:
```powershell
# Deploy to demo environment
./deploy-demo.ps1

# Or manually
npm run switch:demo
npm run demo:start
```

**Features**:
- Production-like build
- Demo-specific configuration
- Detailed logging for debugging
- Separate port to run alongside development

---

## 🟢 Stage 3: Production

**Purpose**: Live production deployment

**Configuration**:
- Frontend: `http://localhost:8083`
- Backend: `http://localhost:5003`
- Database: `InvMISDB` on `SYED-FAZLI-LAPT`
- Environment File: `.env.production`

**How to Deploy**:
```powershell
# Deploy to production
./deploy-production.ps1

# Or manually
npm run switch:prod
npm run prod:start
```

**Features**:
- Optimized production build
- Minimal logging
- Enhanced security settings
- Performance optimizations

---

## 🛠️ Quick Commands

### Environment Switching
```powershell
npm run switch:dev      # Switch to development
npm run switch:demo     # Switch to demo
npm run switch:staging  # Switch to staging
npm run switch:prod     # Switch to production
```

### Starting Environments
```powershell
npm run dev:start       # Start development
npm run demo:start      # Start demo
npm run staging:start   # Start staging
npm run prod:start      # Start production
```

### Deployment Scripts
```powershell
./deploy-demo.ps1       # Deploy to demo
./deploy-production.ps1 # Deploy to production
```

---

## 📋 Port Reference

| Stage       | Frontend | Backend | Notes                          |
|-------------|----------|---------|--------------------------------|
| Development | 8080     | 5000    | Hot reload enabled             |
| Demo        | 8082     | 5002    | Production build for demos     |
| Production  | 8083     | 5003    | Optimized production build     |

---

## 🔐 Environment Variables

Each stage has its own `.env` file:

- `.env.development` - Development configuration
- `.env.demo` - Demo configuration
- `.env.staging` - Staging configuration (if needed)
- `.env.production` - Production configuration

Additionally, backend SQL Server configuration is managed via `.env.sqlserver` which is automatically updated by deployment scripts.

---

## 📝 Deployment Workflow

### From Development to Demo
1. Complete features in development
2. Test thoroughly on `localhost:8080`
3. Commit changes to repository
4. Run `./deploy-demo.ps1`
5. Test on `localhost:8082`
6. Gather client feedback

### From Demo to Production
1. Validate all features in demo
2. Get client approval
3. Backup production database
4. Run `./deploy-production.ps1`
5. Verify on `localhost:8083`
6. Monitor logs for issues

---

## 🐛 Troubleshooting

### Ports Already in Use
```powershell
# Stop all Node processes
Get-Process -Name node | Stop-Process -Force

# Then redeploy
./deploy-demo.ps1
```

### Environment Not Switching
```powershell
# Manually copy environment file
Copy-Item -Path ".env.demo" -Destination ".env" -Force

# Verify
Get-Content .env | Select-String "ENVIRONMENT"
```

### Build Failures
```powershell
# Clean node modules and rebuild
Remove-Item -Recurse -Force node_modules
npm install
npm run build
```

---

## 📞 Support

For issues or questions about the deployment pipeline, contact the development team.

---

**Last Updated**: October 28, 2025
