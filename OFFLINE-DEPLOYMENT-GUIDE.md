# Offline Deployment Guide - No Internet Server

Since your server doesn't have internet access, follow these steps:

## Step 1: Prepare Files on Your Development Machine

### A. Build the project locally first
```powershell
cd E:\ECP-Projects\inventory-management-system-ims\ims-v1

# Install dependencies (if not already done)
npm install

# Build the frontend
npm run build
```

### B. Create deployment package
Create a folder with everything needed:
```powershell
# Create a clean deployment folder
$deployFolder = "C:\Temp\IMS-Deployment-Package"
New-Item -ItemType Directory -Path $deployFolder -Force

# Copy all necessary files
Copy-Item -Path ".\*" -Destination $deployFolder -Recurse -Exclude @("node_modules", ".git", ".vscode", "*.log")

# The deployment package now contains:
# - All source files
# - dist/ folder (built frontend)
# - package.json and package-lock.json
# - backend-server.cjs
# - All SQL scripts and helper files
```

## Step 2: Download Node.js Installer (On Internet-Connected Machine)

1. Go to: https://nodejs.org/en/download/
2. Download: **Windows 64-bit Installer (.msi)** - LTS version
3. Save to USB drive or network location
4. File will be named like: `node-v18.20.4-x64.msi`

## Step 3: Download node_modules (Create Offline Package)

On your development machine:
```powershell
cd E:\ECP-Projects\inventory-management-system-ims\ims-v1

# This will create a portable node_modules that can be copied
npm install

# Now copy the entire project INCLUDING node_modules
$deployFolder = "C:\Temp\IMS-Complete-Package"
New-Item -ItemType Directory -Path $deployFolder -Force

# Copy everything including node_modules
Copy-Item -Path ".\*" -Destination $deployFolder -Recurse -Exclude @(".git", ".vscode", "*.log")
```

## Step 4: Transfer to Server

Transfer via:
- **USB Drive** (copy `IMS-Complete-Package` folder)
- **Network Share** (if server has network access to local network)
- **Remote Desktop** (copy/paste files)
- **FTP/SFTP** (if available internally)

Copy to server at: `C:\ims-v1`

## Step 5: Install Node.js on Server

1. Copy `node-v18.20.4-x64.msi` to server
2. Run the installer
3. Accept all defaults
4. Restart PowerShell after installation

## Step 6: Verify Node.js Installation

```powershell
node --version
npm --version
```

Should show versions like:
```
v18.20.4
10.7.0
```

## Step 7: Deploy on Server

```powershell
# Navigate to deployment folder
cd C:\ims-v1

# Run the offline deployment script
.\deploy-windows-offline.ps1
```

## What the Offline Script Does:

1. ✅ Checks Node.js is installed
2. ✅ Verifies all files are present
3. ✅ Creates .env.sqlserver configuration
4. ✅ Runs build (if needed)
5. ✅ Starts backend server

## Troubleshooting

### If npm install is needed on server:
You already copied node_modules, so it shouldn't be needed. But if required:
```powershell
# Create offline npm cache on dev machine
npm pack

# Copy all .tgz files to server and install from them
```

### If dist folder is missing:
Build was already done on dev machine and copied over.

### If backend won't start:
Check database connectivity:
```powershell
node check-users-quick.cjs
```

## Files Structure After Copy:

```
C:\ims-v1\
├── node_modules\          (copied from dev machine)
├── dist\                  (built frontend)
├── src\                   (source files)
├── public\
├── backend-server.cjs
├── package.json
├── .env.sqlserver        (created by script)
├── deploy-windows-offline.ps1
└── ... (all other files)
```

## Network Configuration

Since server has no internet, make sure:
- ✅ Server can reach database: `172.20.150.34:1433`
- ✅ Internal users can reach server on port 80/443
- ✅ Backend runs on localhost:3001

The application will work entirely offline once deployed!
