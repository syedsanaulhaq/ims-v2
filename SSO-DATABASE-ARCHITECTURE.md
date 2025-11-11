# SSO with DS Database Query - Alternative Implementation

## Scenario: IMS Queries DS Database Directly

If you want IMS to query the **Digital System (DS) database** directly instead of maintaining a copy of AspNetUsers, here's how:

---

## Architecture:

```
DS (.NET Core)                    IMS (Node.js)
├── DigitalSystemDB              ├── InventoryManagementDB
│   └── AspNetUsers (MASTER)     │   └── (No AspNetUsers needed)
│                                 │
└── Generates JWT Token          └── Validates token + Queries DS DB
```

---

## Step 1: Add DS Database Connection to IMS

### Update `.env.sqlserver`:

```env
# IMS Database
SQL_SERVER_HOST=SYED-FAZLI-LAPT
SQL_SERVER_DATABASE=InventoryManagementDB
SQL_SERVER_USER=inventorymanagementuser
SQL_SERVER_PASSWORD=2016Wfp61@
SQL_SERVER_PORT=1433

# DS Database (for user lookup)
DS_SQL_SERVER_HOST=SYED-FAZLI-LAPT
DS_SQL_SERVER_DATABASE=DigitalSystemDB
DS_SQL_SERVER_USER=dsuser
DS_SQL_SERVER_PASSWORD=dspassword
DS_SQL_SERVER_PORT=1433

JWT_SECRET=YourVerySecureSecretKeyAtLeast32CharactersLong123456
```

---

## Step 2: Create DS Database Connection in backend-server.cjs

### Add after existing database config (around line 60):

```javascript
// ============================================================================
// DS Database Configuration (for user lookup)
// ============================================================================
const dsDbConfig = {
  user: process.env.DS_SQL_SERVER_USER || 'dsuser',
  password: process.env.DS_SQL_SERVER_PASSWORD || 'dspassword',
  server: process.env.DS_SQL_SERVER_HOST || 'SYED-FAZLI-LAPT',
  database: process.env.DS_SQL_SERVER_DATABASE || 'DigitalSystemDB',
  port: parseInt(process.env.DS_SQL_SERVER_PORT || '1433'),
  options: {
    encrypt: process.env.DS_SQL_SERVER_ENCRYPT === 'true',
    trustServerCertificate: process.env.DS_SQL_SERVER_TRUST_CERT === 'true',
    enableArithAbort: true
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

let dsPool;

async function initializeDSDatabase() {
  try {
    console.log('🔗 Connecting to DS SQL Server...');
    dsPool = await sql.connect(dsDbConfig);
    console.log('✅ Connected to DS SQL Server successfully');
    console.log(`📊 DS Database: ${dsDbConfig.database} on ${dsDbConfig.server}`);
    return dsPool;
  } catch (err) {
    console.error('❌ DS Database connection error:', err);
    throw err;
  }
}
```

---

## Step 3: Update SSO Endpoint to Query DS Database

### Replace existing SSO endpoint with:

```javascript
// ============================================================================
// SSO AUTHENTICATION ENDPOINTS (DS Database Query Version)
// ============================================================================

// Validate SSO token and fetch user from DS database
app.post('/api/auth/sso-validate', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    console.log('🔐 Validating SSO token from Digital System...');

    // Verify JWT token
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE
    });

    // Extract user information from token
    const userId = decoded.sub;
    const userName = decoded.unique_name;

    console.log(`🔍 Token decoded successfully for user: ${userName} (${userId})`);

    // Query DS database for user information
    console.log('🔍 Querying DS database for user information...');
    
    const userResult = await dsPool.request()
      .input('user_id', sql.NVarChar, userId)
      .query(`
        SELECT 
          Id,
          UserName,
          Email,
          OfficeName,
          WingName,
          intOfficeID,
          intWingID,
          FirstName,
          LastName
        FROM AspNetUsers
        WHERE Id = @user_id
      `);

    if (userResult.recordset.length === 0) {
      console.log(`❌ User ${userId} not found in DS database`);
      return res.status(404).json({ error: 'User not found in Digital System' });
    }

    const user = userResult.recordset[0];

    console.log(`✅ SSO login successful for user: ${user.UserName} (Office: ${user.OfficeName || 'N/A'})`);
    console.log(`📍 Fetched from DS database: ${dsDbConfig.database}`);

    // Return user session data
    res.json({
      success: true,
      user: {
        id: user.Id,
        username: user.UserName,
        email: user.Email,
        first_name: user.FirstName,
        last_name: user.LastName,
        office_name: user.OfficeName,
        wing_name: user.WingName,
        office_id: user.intOfficeID,
        wing_id: user.intWingID
      },
      token: token,
      source: 'DigitalSystem_Database' // Indicates data came from DS DB
    });

  } catch (error) {
    console.error('❌ SSO validation error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token', details: error.message });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please login to Digital System again.' });
    }
    
    res.status(500).json({ error: 'SSO validation failed', details: error.message });
  }
});

console.log('✅ SSO Authentication endpoints loaded (DS Database Query Mode)');
```

---

## Step 4: Update startServer() Function

### Add DS database initialization:

```javascript
async function startServer() {
  try {
    // Initialize IMS database
    await initializeDatabase();
    console.log('IMS Database connection initialized');
    
    // Initialize DS database for SSO
    await initializeDSDatabase();
    console.log('DS Database connection initialized for SSO');
    
    app.listen(PORT, () => {
      console.log(`✅ Server running on http://localhost:${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 IMS Database: ${dbConfig.database} on ${dbConfig.server}`);
      console.log(`🔗 DS Database: ${dsDbConfig.database} on ${dsDbConfig.server}`);
      console.log(`📁 Upload directory: ${uploadsDir}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}
```

---

## Benefits of DS Database Query Approach:

✅ **Always Fresh Data** - No need to sync AspNetUsers  
✅ **Single Source of Truth** - DS database is the master  
✅ **No Data Duplication** - IMS doesn't store user data  
✅ **Automatic Updates** - Changes in DS reflect immediately in IMS  
✅ **Reduced Maintenance** - No need to import/sync users  

---

## Comparison:

### Current Approach (Copy AspNetUsers to IMS):
```
✅ Faster queries (local database)
✅ Works if DS database is down
❌ Need to sync user data regularly
❌ Data can become stale
❌ Duplicate storage
```

### DS Database Query Approach:
```
✅ Always fresh data
✅ No sync needed
✅ Single source of truth
❌ Slightly slower (cross-database query)
❌ IMS dependent on DS database availability
❌ Need DS database credentials
```

---

## Which Approach Should You Use?

### Use **Current Approach** (Copy to IMS) if:
- You want IMS to work independently
- DS database is on different server/network
- You need fast queries
- User data rarely changes

### Use **DS Query Approach** if:
- Both databases on same server (✅ Your case: SYED-FAZLI-LAPT)
- User data changes frequently
- You want real-time data
- You don't want data duplication

---

## Your Current Situation:

Since both databases are on **SYED-FAZLI-LAPT**:

**Option 1: Keep Current Setup (Recommended)**
```
✅ IMS has AspNetUsers copy
✅ SSO validates token + checks IMS database
✅ Works now with imported data
🔧 Need to sync users periodically (create sync script)
```

**Option 2: Switch to DS Query**
```
🔧 Add DS database connection
🔧 Update SSO endpoint
✅ Always fresh data
✅ No sync needed
```

---

## My Recommendation:

**Stick with Current Approach** because:

1. ✅ It's already working
2. ✅ You've already imported users
3. ✅ Simpler architecture
4. ✅ Better performance
5. ✅ IMS can work independently

**Just create a sync script** to periodically update IMS's AspNetUsers from DS:

```javascript
// sync-users-from-ds.js
const sql = require('mssql');

const dsConfig = { /* DS database config */ };
const imsConfig = { /* IMS database config */ };

async function syncUsers() {
  const dsPool = await sql.connect(dsConfig);
  const imsPool = await sql.connect(imsConfig);
  
  // Get users from DS
  const users = await dsPool.request().query('SELECT * FROM AspNetUsers');
  
  // Upsert into IMS
  for (const user of users.recordset) {
    await imsPool.request()
      .input('id', sql.NVarChar, user.Id)
      .input('username', sql.NVarChar, user.UserName)
      .input('email', sql.NVarChar, user.Email)
      // ... other fields
      .query(`
        MERGE AspNetUsers AS target
        USING (SELECT @id AS Id) AS source
        ON target.Id = source.Id
        WHEN MATCHED THEN UPDATE SET UserName = @username, Email = @email
        WHEN NOT MATCHED THEN INSERT (Id, UserName, Email) VALUES (@id, @username, @email);
      `);
  }
  
  console.log('✅ Users synced successfully');
}

// Run sync
syncUsers();
```

Run this script:
- **Nightly**: `Task Scheduler` (Windows)
- **On-demand**: When new users added to DS
- **Webhook**: When user changes in DS

---

## Summary:

**Your understanding is correct:**

1. ✅ Users login in **DS database** (DigitalSystemDB.AspNetUsers)
2. ✅ IMS has a **copy** of AspNetUsers (InventoryManagementDB.AspNetUsers)
3. ✅ SSO validates token + checks **IMS database** for user info
4. ❌ IMS never checks passwords (DS handles that)

**Current setup is good!** SSO is working correctly. You just need to:
- Keep users synced between DS and IMS databases (weekly/monthly sync)
- Or use the DS query approach if you want real-time data

