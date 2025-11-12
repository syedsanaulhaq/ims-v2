# Production Deployment Guide - Live Server

## 🚀 Quick Deployment Steps

### 1. **Pull from GitHub on Live Server**
```bash
cd /path/to/deployment
git clone https://github.com/ecp-developer/inventory-management-system-ims.git
cd inventory-management-system-ims/ims-v1

# Or if already cloned, pull latest:
git pull origin invmisdb-rebuild-sept14-2025
```

### 2. **Configure Environment Variables**

Create `.env.sqlserver` on your live server:
```bash
# SQL Server Configuration - PRODUCTION
SQL_SERVER_HOST=your-production-sql-server
SQL_SERVER_DATABASE=InventoryManagementDB
SQL_SERVER_USER=your-production-user
SQL_SERVER_PASSWORD=your-production-password
SQL_SERVER_PORT=1433
SQL_SERVER_ENCRYPT=true
SQL_SERVER_TRUST_CERT=false
PORT=3001

# DS Database Configuration (if using SSO)
DS_SQL_SERVER_HOST=your-ds-server
DS_SQL_SERVER_DATABASE=DigitalSystemDB
DS_SQL_SERVER_USER=your-ds-user
DS_SQL_SERVER_PASSWORD=your-ds-password
DS_SQL_SERVER_PORT=1433

# JWT Configuration for SSO
JWT_SECRET=YourVerySecureProductionSecretKeyAtLeast32CharactersLong
```

### 3. **Install Dependencies**
```bash
npm install
```

### 4. **Build Frontend for Production**
```bash
npm run build
```

This creates optimized production files in the `dist/` folder.

### 5. **Setup Database Users**

On your production SQL Server, run:
```sql
-- Option 1: Add plain text password to existing users
UPDATE AspNetUsers 
SET Password = 'your-secure-password'
WHERE UserName = 'your-username';

-- Option 2: Use the provided script
-- Run: node fix-password.cjs
-- (Edit the script first to set your production username/password)
```

### 6. **Start Backend Server**

**For Linux/Production Server:**
```bash
# Using PM2 (recommended for production)
npm install -g pm2
pm2 start backend-server.cjs --name "ims-backend"
pm2 save
pm2 startup  # Follow the instructions shown

# Or using systemd service (see below)
```

**For Windows Server:**
```powershell
# Start backend
node backend-server.cjs

# Or install as Windows Service using node-windows
```

### 7. **Serve Frontend**

**Option A: Using Nginx (Recommended)**
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        root /path/to/ims-v1/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API proxy
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Option B: Using IIS (Windows)**
1. Install IIS with URL Rewrite and ARR modules
2. Create website pointing to `dist/` folder
3. Configure reverse proxy to `http://localhost:3001` for `/api/*`

**Option C: Serve with Node.js (Simple)**
```bash
# Install serve globally
npm install -g serve

# Serve the dist folder
serve -s dist -l 80
```

---

## 📋 Pre-Deployment Checklist

- [ ] Database connection tested on production server
- [ ] User passwords configured (plain text or bcrypt)
- [ ] `.env.sqlserver` file configured with production credentials
- [ ] Backend builds successfully: `npm run build`
- [ ] Backend starts without errors: `node backend-server.cjs`
- [ ] Firewall allows ports 80/443 (frontend) and 3001 (backend)
- [ ] SSL certificate configured (if using HTTPS)
- [ ] Database backups configured

---

## 🔧 Systemd Service (Linux)

Create `/etc/systemd/system/ims-backend.service`:
```ini
[Unit]
Description=IMS Backend Server
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/ims-v1
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

---

## 🧪 Testing After Deployment

1. **Test Backend:**
   ```bash
   curl http://your-server:3001/api/health
   ```

2. **Test Frontend:**
   - Open browser: `http://your-server`
   - Login with: `1111111111111` / `123456`
   - Test navigation, CRUD operations

3. **Check Logs:**
   ```bash
   # PM2
   pm2 logs ims-backend

   # Systemd
   journalctl -u ims-backend -f
   ```

---

## 🔒 Security Considerations

1. **Change default passwords** - Don't use `123456` in production
2. **Use HTTPS** - Configure SSL certificates (Let's Encrypt)
3. **Firewall** - Only expose necessary ports (80, 443)
4. **Database** - Use SQL Server authentication, strong passwords
5. **JWT Secret** - Use strong, unique secret in production
6. **Regular backups** - Database and file uploads

---

## 📞 Troubleshooting

**Backend won't start:**
- Check `node backend-server.cjs` output for errors
- Verify database connection in `.env.sqlserver`
- Check port 3001 is not in use: `netstat -an | grep 3001`

**Login fails:**
- Run `node check-users-quick.cjs` to verify users exist
- Run `node fix-password.cjs` to reset password
- Check backend logs for authentication errors

**Frontend shows blank page:**
- Check browser console (F12) for errors
- Verify `dist/` folder exists and has files
- Check API endpoint in network tab

---

## 📂 Important Files

- `backend-server.cjs` - Main backend server
- `.env.sqlserver` - Database configuration
- `dist/` - Production frontend build
- `check-users-quick.cjs` - Verify database users
- `fix-password.cjs` - Reset user passwords

---

## 🎯 Production URL Structure

After deployment, your app will be accessible at:
- Frontend: `http://your-server/` or `https://your-domain.com/`
- Backend API: `http://your-server:3001/api/` (proxied through frontend server)

**Repository:** https://github.com/ecp-developer/inventory-management-system-ims
**Branch:** invmisdb-rebuild-sept14-2025
**Commit:** dbd56b2 (fully functional)
