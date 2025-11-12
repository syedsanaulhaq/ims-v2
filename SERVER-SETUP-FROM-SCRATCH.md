# Complete Server Setup Guide - From Blank Server to Deployed Application

## 🖥️ Server Requirements

- **OS:** Ubuntu 20.04+ / Windows Server 2019+ / CentOS 8+
- **RAM:** Minimum 4GB (8GB recommended)
- **Disk:** 20GB+ free space
- **Network:** Internet access for downloads

---

## 📋 Part 1: Initial Server Setup (Ubuntu/Linux)

### Step 1: Update System
```bash
sudo apt update && sudo apt upgrade -y
```

### Step 2: Install Node.js (v18 LTS or higher)
```bash
# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v18.x.x or higher
npm --version   # Should show 9.x.x or higher
```

### Step 3: Install Git
```bash
sudo apt install -y git
git --version
```

### Step 4: Install PM2 (Process Manager)
```bash
sudo npm install -g pm2
pm2 --version
```

### Step 5: Install Nginx (Web Server)
```bash
sudo apt install -y nginx
sudo systemctl status nginx
```

### Step 6: Install SQL Server Tools (if needed)
```bash
# For connecting to SQL Server from Linux
curl https://packages.microsoft.com/keys/microsoft.asc | sudo apt-key add -
curl https://packages.microsoft.com/config/ubuntu/$(lsb_release -rs)/prod.list | sudo tee /etc/apt/sources.list.d/msprod.list
sudo apt update
sudo apt install -y mssql-tools unixodbc-dev
```

---

## 📋 Part 2: Initial Server Setup (Windows Server)

### Step 1: Install Node.js
1. Download from: https://nodejs.org/en/download/
2. Choose "Windows Installer (.msi)" - 64-bit
3. Run installer, accept defaults
4. Open PowerShell and verify:
   ```powershell
   node --version
   npm --version
   ```

### Step 2: Install Git
1. Download from: https://git-scm.com/download/win
2. Run installer, accept defaults
3. Verify in PowerShell:
   ```powershell
   git --version
   ```

### Step 3: Install IIS (Web Server)
```powershell
# Run PowerShell as Administrator
Install-WindowsFeature -name Web-Server -IncludeManagementTools
```

### Step 4: Install SQL Server (if needed)
1. Download SQL Server Express: https://www.microsoft.com/en-us/sql-server/sql-server-downloads
2. Download SSMS (SQL Server Management Studio)

---

## 🚀 Part 3: Deploy Application

### Step 1: Clone Repository
```bash
# Navigate to deployment directory
cd /var/www  # Linux
# OR
cd C:\inetpub  # Windows

# Clone repository
git clone https://github.com/ecp-developer/inventory-management-system-ims.git
cd inventory-management-system-ims/ims-v1
git checkout invmisdb-rebuild-sept14-2025
```

### Step 2: Configure Environment Variables

Create `.env.sqlserver` file:
```bash
# Linux
nano .env.sqlserver

# Windows
notepad .env.sqlserver
```

Add this content (replace with your actual values):
```env
# SQL Server Configuration - PRODUCTION
SQL_SERVER_HOST=172.20.150.34
SQL_SERVER_DATABASE=InventoryManagementDB
SQL_SERVER_USER=inventorymanagementuser
SQL_SERVER_PASSWORD=your-strong-password-here
SQL_SERVER_PORT=1433
SQL_SERVER_ENCRYPT=false
SQL_SERVER_TRUST_CERT=true
PORT=3001

# DS Database Configuration (for SSO)
DS_SQL_SERVER_HOST=172.20.150.34
DS_SQL_SERVER_DATABASE=DigitalSystemDB
DS_SQL_SERVER_USER=inventorymanagementuser
DS_SQL_SERVER_PASSWORD=your-strong-password-here
DS_SQL_SERVER_PORT=1433

# JWT Configuration
JWT_SECRET=ChangeThisToAVerySecureRandomString123456789
```

Save and exit (Ctrl+X, then Y on Linux)

### Step 3: Install Dependencies
```bash
npm install
```

This will take 2-5 minutes to download all packages.

### Step 4: Build Frontend
```bash
npm run build
```

This creates the `dist/` folder with optimized production files.

---

## 🔧 Part 4: Setup Backend Service

### Option A: Linux with PM2 (Recommended)

```bash
# Start backend with PM2
pm2 start backend-server.cjs --name ims-backend

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the command it gives you (will be something like):
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u username --hp /home/username

# Verify it's running
pm2 status
pm2 logs ims-backend
```

### Option B: Linux with Systemd

Create service file:
```bash
sudo nano /etc/systemd/system/ims-backend.service
```

Add this content:
```ini
[Unit]
Description=IMS Backend Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/inventory-management-system-ims/ims-v1
ExecStart=/usr/bin/node backend-server.cjs
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable ims-backend
sudo systemctl start ims-backend
sudo systemctl status ims-backend
```

### Option C: Windows with node-windows

Install node-windows:
```powershell
npm install -g node-windows
```

Create service script `install-service.js`:
```javascript
var Service = require('node-windows').Service;

var svc = new Service({
  name: 'IMS Backend',
  description: 'Inventory Management System Backend Server',
  script: 'C:\\inetpub\\inventory-management-system-ims\\ims-v1\\backend-server.cjs'
});

svc.on('install', function(){
  svc.start();
});

svc.install();
```

Install service:
```powershell
node install-service.js
```

---

## 🌐 Part 5: Setup Nginx (Linux)

### Step 1: Create Nginx Configuration
```bash
sudo nano /etc/nginx/sites-available/ims
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain or IP

    # Frontend - Serve static files from dist folder
    location / {
        root /var/www/inventory-management-system-ims/ims-v1/dist;
        try_files $uri $uri/ /index.html;
        
        # Enable CORS if needed
        add_header Access-Control-Allow-Origin *;
    }

    # Backend API - Proxy to Node.js
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }

    # File uploads location
    location /uploads/ {
        alias /var/www/inventory-management-system-ims/ims-v1/uploads/;
    }
}
```

### Step 2: Enable Site and Restart Nginx
```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/ims /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

---

## 🌐 Part 6: Setup IIS (Windows)

### Step 1: Install URL Rewrite Module
1. Download: https://www.iis.net/downloads/microsoft/url-rewrite
2. Install it

### Step 2: Install ARR (Application Request Routing)
1. Download: https://www.iis.net/downloads/microsoft/application-request-routing
2. Install it
3. Open IIS Manager → Server → Application Request Routing → Server Proxy Settings
4. Enable proxy

### Step 3: Create IIS Site
1. Open IIS Manager
2. Right-click "Sites" → Add Website
3. Site name: IMS
4. Physical path: `C:\inetpub\inventory-management-system-ims\ims-v1\dist`
5. Binding: Port 80

### Step 4: Configure Reverse Proxy
Create `web.config` in dist folder:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <system.webServer>
        <rewrite>
            <rules>
                <!-- API proxy to Node.js backend -->
                <rule name="API" stopProcessing="true">
                    <match url="^api/(.*)" />
                    <action type="Rewrite" url="http://localhost:3001/api/{R:1}" />
                </rule>
                
                <!-- SPA fallback -->
                <rule name="SPA" stopProcessing="true">
                    <match url=".*" />
                    <conditions logicalGrouping="MatchAll">
                        <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
                        <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
                    </conditions>
                    <action type="Rewrite" url="/" />
                </rule>
            </rules>
        </rewrite>
    </system.webServer>
</configuration>
```

---

## 🔐 Part 7: Configure Firewall

### Linux (UFW)
```bash
# Allow HTTP
sudo ufw allow 80/tcp

# Allow HTTPS (if using SSL)
sudo ufw allow 443/tcp

# Allow backend port (if accessing directly)
sudo ufw allow 3001/tcp

# Enable firewall
sudo ufw enable
```

### Windows
```powershell
# Allow HTTP
New-NetFirewallRule -DisplayName "IMS HTTP" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow

# Allow backend
New-NetFirewallRule -DisplayName "IMS Backend" -Direction Inbound -Protocol TCP -LocalPort 3001 -Action Allow
```

---

## 🗄️ Part 8: Setup Database Users

Connect to your SQL Server and run:

```sql
-- Create login (if doesn't exist)
CREATE LOGIN inventorymanagementuser WITH PASSWORD = 'YourStrongPassword123!';

-- Switch to your database
USE InventoryManagementDB;

-- Create user
CREATE USER inventorymanagementuser FOR LOGIN inventorymanagementuser;

-- Grant permissions
ALTER ROLE db_datareader ADD MEMBER inventorymanagementuser;
ALTER ROLE db_datawriter ADD MEMBER inventorymanagementuser;
ALTER ROLE db_ddladmin ADD MEMBER inventorymanagementuser;

-- Add plain text password to test user
UPDATE AspNetUsers 
SET Password = '123456'
WHERE UserName = '1111111111111';
```

---

## ✅ Part 9: Verify Deployment

### Step 1: Test Backend
```bash
# Check if backend is running
curl http://localhost:3001/api/health

# Or check PM2 status
pm2 status

# View logs
pm2 logs ims-backend
```

### Step 2: Test Frontend
Open browser and navigate to:
- `http://your-server-ip/` or `http://your-domain.com/`

### Step 3: Test Login
- Username: `1111111111111`
- Password: `123456`

---

## 🔧 Troubleshooting

### Backend Won't Start
```bash
# Check logs
pm2 logs ims-backend --lines 100

# Or if using systemd
journalctl -u ims-backend -f

# Check if port is in use
sudo netstat -tulpn | grep 3001

# Test database connection
node check-users-quick.cjs
```

### Frontend Shows Blank Page
```bash
# Check if dist folder exists
ls -la dist/

# Rebuild if needed
npm run build

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### Can't Connect to Database
```bash
# Test connection from server
sqlcmd -S your-server -U inventorymanagementuser -P yourpassword -Q "SELECT @@VERSION"

# Check .env.sqlserver file
cat .env.sqlserver
```

---

## 📊 Monitoring & Maintenance

### PM2 Commands
```bash
pm2 status              # Check status
pm2 logs ims-backend    # View logs
pm2 restart ims-backend # Restart
pm2 stop ims-backend    # Stop
pm2 delete ims-backend  # Remove
```

### Update Application
```bash
cd /var/www/inventory-management-system-ims/ims-v1
git pull origin invmisdb-rebuild-sept14-2025
npm install
npm run build
pm2 restart ims-backend
```

### Backup Database
```bash
# Create backup script
sudo nano /usr/local/bin/backup-ims-db.sh

#!/bin/bash
sqlcmd -S your-server -U sa -P password -Q "BACKUP DATABASE [InventoryManagementDB] TO DISK = '/var/backups/ims-$(date +%Y%m%d).bak'"

# Make executable
sudo chmod +x /usr/local/bin/backup-ims-db.sh

# Add to cron (daily at 2 AM)
sudo crontab -e
0 2 * * * /usr/local/bin/backup-ims-db.sh
```

---

## 🎯 Quick Reference

**Repository:** https://github.com/ecp-developer/inventory-management-system-ims
**Branch:** invmisdb-rebuild-sept14-2025
**Backend Port:** 3001
**Frontend Port:** 80 (via Nginx/IIS)

**Default Test Credentials:**
- Username: `1111111111111`
- Password: `123456`

**Key Files:**
- `.env.sqlserver` - Database configuration
- `backend-server.cjs` - Backend entry point
- `dist/` - Frontend production build
- `package.json` - Dependencies

**Useful Commands:**
```bash
# Check status
pm2 status
sudo systemctl status nginx

# View logs
pm2 logs ims-backend
sudo tail -f /var/log/nginx/error.log

# Restart services
pm2 restart ims-backend
sudo systemctl restart nginx
```

---

## 🆘 Need Help?

1. Check logs first: `pm2 logs ims-backend`
2. Verify database connection: `node check-users-quick.cjs`
3. Check firewall settings
4. Review Nginx/IIS configuration
5. Ensure .env.sqlserver has correct credentials
