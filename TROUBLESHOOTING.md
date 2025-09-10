# IMS System Troubleshooting Guide

## 🚨 Common Issues & Solutions

### Database Connection Issues

#### Issue: "Login failed for user"
**Solution:**
1. Check SQL Server Authentication mode (should be mixed mode)
2. Verify username/password in `.env.sqlserver`
3. Ensure SQL Server service is running

#### Issue: "Cannot connect to server"
**Solutions:**
1. Check server name in `.env.sqlserver`
2. Verify SQL Server is running and listening on correct port
3. Check Windows Firewall settings
4. For remote connections, enable TCP/IP protocol in SQL Server Configuration Manager

#### Issue: "Database does not exist"
**Solution:**
Run the database setup script:
```bash
node setup-database.cjs
```

### Node.js / npm Issues

#### Issue: "Module not found"
**Solution:**
```bash
# Clear npm cache and reinstall
npm cache clean --force
rm -rf node_modules
rm package-lock.json
npm install
```

#### Issue: "Port already in use"
**Solutions:**
1. Change port in `.env.sqlserver`: `PORT=5001`
2. Or kill process using the port:
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Linux/macOS
lsof -ti:5000 | xargs kill
```

### Frontend Issues

#### Issue: "Cannot connect to backend API"
**Solutions:**
1. Ensure backend server is running: `node backend-server.cjs`
2. Check backend URL in frontend code
3. Verify CORS settings in backend

#### Issue: "Build errors"
**Solution:**
```bash
# Clear build cache
rm -rf dist
rm -rf .vite
npm run build
```

### Git Issues

#### Issue: "Authentication failed"
**Solutions:**
1. Use personal access token instead of password
2. Configure Git credentials:
```bash
git config --global credential.helper manager
```
3. Or use SSH instead of HTTPS

### Performance Issues

#### Issue: "Slow query execution"
**Solutions:**
1. Check database indexes
2. Optimize SQL queries
3. Increase SQL Server memory allocation

#### Issue: "Frontend loading slowly"
**Solutions:**
1. Enable gzip compression
2. Optimize bundle size
3. Use lazy loading for routes

### Development Environment

#### Issue: "VS Code extensions not working"
**Solution:**
Install recommended extensions:
- ES7+ React/Redux/React-Native snippets
- TypeScript Importer
- Prettier
- ESLint

#### Issue: "Hot reload not working"
**Solution:**
```bash
# Restart development server
npm run dev
```

## 📋 System Requirements Check

### Minimum Requirements
- **OS:** Windows 10/11, macOS 10.15+, or Ubuntu 18.04+
- **Node.js:** v18.0.0 or higher
- **RAM:** 8GB minimum, 16GB recommended
- **Storage:** 2GB free space
- **Database:** SQL Server 2017 or higher

### Check Your Environment
```bash
# Check Node.js version
node --version

# Check npm version
npm --version

# Check Git version
git --version

# Check available memory
# Windows
systeminfo | findstr "Total Physical Memory"

# Linux/macOS
free -h
```

## 🔧 Manual Database Setup

If automated setup fails, follow these steps:

1. **Create Database:**
```sql
CREATE DATABASE IMS_Database;
USE IMS_Database;
```

2. **Run Scripts in Order:**
   - `create-complete-database-schema.sql`
   - `create-realistic-sample-data.sql`
   - `create-sample-item-masters.sql`
   - `create-test-users.sql`

3. **Verify Tables:**
```sql
SELECT TABLE_NAME 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_TYPE = 'BASE TABLE';
```

## 🆘 Getting Help

### Log Files Locations
- **Backend logs:** Console output when running `node backend-server.cjs`
- **Frontend logs:** Browser developer console (F12)
- **Database logs:** SQL Server Error Log

### Debugging Commands
```bash
# Check running processes
# Windows
tasklist | findstr node

# Linux/macOS
ps aux | grep node

# Check port usage
# Windows
netstat -an | findstr :5000

# Linux/macOS
lsof -i :5000
```

### Contact Information
- **Project Lead:** developer@ims-project.local
- **Repository:** https://github.com/syedsanaulhaq/ims-v1
- **Documentation:** See README.md files in project directories

## 🔄 Reset Everything

If all else fails, complete reset:

```bash
# 1. Stop all processes
# Kill Node.js processes

# 2. Clean project
rm -rf node_modules
rm package-lock.json
git clean -fdx

# 3. Fresh start
npm install
node setup-database.cjs
node backend-server.cjs
```
