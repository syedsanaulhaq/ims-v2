# InvMIS ERP System - Production Deployment Guide

## 🚀 Overview
The Inventory Management Information System (InvMIS) is a comprehensive ERP solution built with React + TypeScript frontend and Node.js backend, designed for government and enterprise inventory management.

## 📋 System Requirements

### Minimum Requirements
- **CPU**: 2 cores, 2.0 GHz
- **RAM**: 4 GB minimum, 8 GB recommended
- **Storage**: 20 GB available space
- **OS**: Windows Server 2019+, Ubuntu 20.04+, CentOS 8+

### Recommended Production Requirements
- **CPU**: 4+ cores, 3.0 GHz
- **RAM**: 16 GB or higher
- **Storage**: 100 GB SSD
- **Network**: 100 Mbps+ connection

## 🛠 Technology Stack

### Frontend
- **Framework**: React 18 + TypeScript
- **UI Library**: Shadcn/UI + Tailwind CSS
- **State Management**: React Context API
- **Charts**: Recharts
- **Build Tool**: Vite

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Security**: Helmet, CORS, JWT, bcrypt
- **Session Management**: express-session
- **Rate Limiting**: Custom middleware

### Database
- **Primary**: SQL Server (InvMISDB)
- **Demo Mode**: In-memory data store
- **Session Store**: In-memory (configurable)

## 🔧 Installation & Setup

### 1. Clone Repository
```bash
git clone https://github.com/syedsanaulhaq/ims-v1.git
cd ims-v1
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Copy and configure environment files:
```bash
cp .env.example .env.production
```

Update `.env.production` with your settings:
```env
# Production Configuration
VITE_APP_ENV=production
VITE_API_URL=https://your-api-domain.com
NODE_ENV=production

# Database Configuration
DB_SERVER=your-sql-server
DB_NAME=InvMISDB
DB_USER=your-db-user
DB_PASSWORD=your-db-password

# Security
JWT_SECRET=your-super-secure-jwt-secret-key
SESSION_SECRET=your-session-secret-key

# SSL/TLS (for HTTPS)
SSL_CERT_PATH=/path/to/certificate.crt
SSL_KEY_PATH=/path/to/private.key
```

## 🐳 Docker Deployment

### Quick Start with Docker Compose
```bash
# Production deployment
docker-compose -f docker-compose.prod.yml up -d

# Staging deployment
docker-compose -f docker-compose.staging.yml up -d
```

### Manual Docker Build
```bash
# Build production image
docker build -t invmis:latest .

# Run container
docker run -d \\
  --name invmis-prod \\
  -p 80:80 \\
  -p 443:443 \\
  -e NODE_ENV=production \\
  invmis:latest
```

## 📦 Manual Deployment

### 1. Build Frontend
```bash
npm run build
```

### 2. Start Production API
```bash
# Using PM2 (recommended)
npm install -g pm2
pm2 start invmis-api-server.cjs --name "invmis-api"

# Or using Node directly
node invmis-api-server.cjs
```

### 3. Serve Frontend
Use a web server like Nginx to serve the built frontend files.

## 🌐 Nginx Configuration

Create `/etc/nginx/sites-available/invmis`:
```nginx
server {
    listen 80;
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL Configuration
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;

    # Frontend
    location / {
        root /var/www/invmis/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
        
        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
    }

    # API Proxy
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Static assets caching
    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## 🔒 Security Configuration

### 1. Firewall Rules
```bash
# Ubuntu/Debian
ufw allow 22/tcp      # SSH
ufw allow 80/tcp      # HTTP
ufw allow 443/tcp     # HTTPS
ufw deny 5000/tcp     # Block direct API access
ufw enable

# CentOS/RHEL
firewall-cmd --permanent --add-service=ssh
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --reload
```

### 2. SSL/TLS Certificate
```bash
# Using Let's Encrypt (recommended)
certbot --nginx -d your-domain.com

# Or use your existing certificates
```

### 3. Database Security
- Use strong passwords
- Enable SQL Server encryption
- Configure proper user permissions
- Regular security updates

## 📊 Monitoring & Logging

### Health Check Endpoints
- **API Health**: `GET /api/health`
- **System Status**: `GET /api/system/status`

### Log Files
- **API Logs**: `/var/log/invmis/api.log`
- **Access Logs**: `/var/log/nginx/invmis-access.log`
- **Error Logs**: `/var/log/nginx/invmis-error.log`

### Monitoring Stack
The system includes Prometheus and Grafana configurations:
```bash
# Start monitoring
docker-compose -f monitoring/docker-compose.yml up -d
```

## 🔄 Backup Strategy

### 1. Database Backup
```sql
-- SQL Server backup script
BACKUP DATABASE InvMISDB 
TO DISK = 'C:\\Backups\\InvMISDB_Full.bak'
WITH FORMAT, INIT, COMPRESSION;
```

### 2. Application Backup
```bash
# Backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
tar -czf "/backups/invmis_$DATE.tar.gz" \\
    /var/www/invmis \\
    /etc/nginx/sites-available/invmis \\
    /path/to/ssl/certificates
```

### 3. Automated Backups
Set up cron job for automated backups:
```bash
# Edit crontab
crontab -e

# Add backup jobs
0 2 * * * /scripts/backup-database.sh
0 3 * * 0 /scripts/backup-application.sh
```

## 🚀 Deployment Scripts

### Production Deployment
```bash
./scripts/deploy-production.ps1   # Windows
./scripts/deploy-production.sh    # Linux
```

### Staging Deployment
```bash
./scripts/deploy-staging.ps1      # Windows
./scripts/quick-deploy-staging.ps1 # Quick staging
```

## 🔍 Troubleshooting

### Common Issues

#### API Server Won't Start
```bash
# Check port availability
netstat -tulpn | grep :5000

# Check logs
pm2 logs invmis-api

# Restart service
pm2 restart invmis-api
```

#### Frontend Build Fails
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

#### Database Connection Issues
- Verify SQL Server is running
- Check firewall settings
- Validate connection string
- Test credentials

### Performance Optimization

#### Frontend
- Enable Gzip compression
- Configure CDN for static assets
- Implement service workers
- Optimize bundle size

#### Backend
- Configure clustering
- Implement Redis for sessions
- Database query optimization
- Enable response caching

## 📈 Scaling Considerations

### Horizontal Scaling
- Load balancer configuration
- Multiple API server instances
- Shared session store (Redis)
- Database clustering

### Vertical Scaling
- Increase server resources
- Optimize database performance
- Monitor memory usage
- CPU optimization

## 🔐 User Management

### Default Administrator Account
- **Username**: `admin`
- **Password**: `admin123` (Change immediately!)

### User Roles
- **Administrator**: Full system access
- **Manager**: Department management
- **User**: Standard operations
- **Viewer**: Read-only access

## 📞 Support & Maintenance

### Regular Maintenance Tasks
- [ ] Weekly security updates
- [ ] Monthly database maintenance
- [ ] Quarterly performance reviews
- [ ] Annual security audits

### Support Contacts
- **Technical Support**: support@invmis.com
- **System Administrator**: admin@invmis.com
- **Emergency**: +1-xxx-xxx-xxxx

### License
This software is proprietary. Contact sales@invmis.com for licensing information.

---

**Last Updated**: September 14, 2025  
**Version**: 1.0.0  
**Deployment Status**: ✅ Production Ready