# IMS System Transfer & Setup Guide

## 📋 System Overview
**Inventory Management System (IMS) v1**
- **Technology Stack:** React + TypeScript (Frontend), Node.js (Backend), SQL Server (Database)
- **Repository:** https://github.com/syedsanaulhaq/ims-v1.git
- **Current Status:** Production-ready with complete feature set

## 🚀 Quick Setup Instructions

### Prerequisites
Before starting, ensure you have:
- [ ] Windows 10/11
- [ ] Git for Windows
- [ ] Node.js (v18 or higher)
- [ ] SQL Server (Local or Remote)
- [ ] VS Code (recommended)

### Step 1: Clone Repository
```bash
git clone https://github.com/syedsanaulhaq/ims-v1.git
cd ims-v1
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Database Setup
1. Run the database setup script:
```bash
node setup-database.cjs
```

2. Or manually import the SQL files in this order:
   - `create-complete-database-schema.sql`
   - `create-realistic-sample-data.sql`

### Step 4: Environment Configuration
1. Copy `.env.example` to `.env.sqlserver`
2. Update database connection settings:
```env
DB_SERVER=your-server-name
DB_DATABASE=IMS_Database
DB_USER=your-username
DB_PASSWORD=your-password
```

### Step 5: Start the System
```bash
# Start backend server
node backend-server.cjs

# In another terminal, start frontend
npm run dev
```

## 📁 Project Structure
```
ims-v1/
├── src/                          # Frontend React application
│   ├── components/              # React components
│   ├── pages/                   # Page components
│   ├── services/               # API services
│   └── routes/                 # Routing configuration
├── backend-server.cjs          # Backend Node.js server
├── package.json               # Dependencies and scripts
├── *.sql                      # Database schema and data files
└── README.md                  # Project documentation
```

## 🔧 System Features
- **Tender Management:** Complete tender lifecycle
- **Inventory Control:** Stock tracking and management
- **User Authentication:** Role-based access control
- **Approval Workflow:** Multi-level approval system
- **Reporting:** Comprehensive reporting system
- **Real-time Updates:** Live data synchronization

## 🛠️ Troubleshooting
See `TROUBLESHOOTING.md` for common issues and solutions.

## 📞 Support
Contact: developer@ims-project.local
