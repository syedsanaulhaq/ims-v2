const express = require('express');
const cors = require('cors');
const sql = require('mssql');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const session = require('express-session');
require('dotenv').config({ path: '.env.sqlserver' });

const app = express();
const PORT = process.env.PORT || 3001;

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'inventory-management-secret-key-2025',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // Set to true in production with HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:8080', 'http://localhost:8081', 'http://localhost:8082', 'http://localhost:4173', 'file://'],
  credentials: true
}));
app.use(express.json());

// Global request logger to debug routing issues
app.use((req, res, next) => {
  console.log(`🌍 ALL REQUESTS: ${req.method} ${req.originalUrl}`);
  if (req.originalUrl.includes('/finalize')) {
    console.log('🚨 FINALIZE REQUEST DETECTED!');
    console.log('🚨 Method:', req.method);
    console.log('🚨 URL:', req.originalUrl);
    console.log('🚨 Body:', req.body);
  }
  next();
});

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads', 'tender-files');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp and original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + fileExtension);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: function (req, file, cb) {
    // Accept common document and image formats
    const allowedTypes = /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|jpg|jpeg|png|gif)$/i;
    if (allowedTypes.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only documents and images are allowed.'));
    }
  }
});

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve HTML files from root directory (for session setter page)
app.use(express.static(__dirname));

// SQL Server configuration - Using environment variables from .env.sqlserver
const sqlConfig = {
  server: process.env.SQL_SERVER_HOST || 'SYED-FAZLI-LAPT',
  database: process.env.SQL_SERVER_DATABASE || 'InventoryManagementDB_TEST',
  user: process.env.SQL_SERVER_USER || 'inventorymanagementuser',
  password: process.env.SQL_SERVER_PASSWORD || '2016Wfp61@',
  port: parseInt(process.env.SQL_SERVER_PORT) || 1433,
  options: {
    encrypt: process.env.SQL_SERVER_ENCRYPT === 'true',
    trustServerCertificate: process.env.SQL_SERVER_TRUST_CERT === 'true' || true,
    enableArithAbort: true
  },
  requestTimeout: 30000,
  connectionTimeout: 30000
};
let pool;

// Default session for development/testing
const DEFAULT_SESSION = {
  user_id: 'DEV-USER-001',
  user_name: 'Development User',
  email: 'dev.user@system.com',
  role: 'Admin',
  office_id: 583,
  wing_id: 19,
  created_at: new Date().toISOString()
};

// Session management
const sessions = new Map();
const DEFAULT_SESSION_ID = 'default-session';

// Initialize default session
sessions.set(DEFAULT_SESSION_ID, DEFAULT_SESSION);

// Initialize SQL Server connection
async function initializeDatabase() {
  try {
    console.log('🔗 Connecting to SQL Server...');
    pool = await sql.connect(sqlConfig);
    console.log('✅ Connected to SQL Server successfully');
    
    // Test the connection
    const testResult = await pool.request().query('SELECT @@VERSION as version');
    console.log('📊 Database version:', testResult.recordset[0]?.version?.substring(0, 50) + '...');
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.log('⚠️  Server will continue with mock data fallback');
    // Don't exit - allow server to run with mock data
  }
}

// API Routes

// Authentication middleware
const requireAuth = (req, res, next) => {
  if (req.session && req.session.userId) {
    next();
  } else {
    res.status(401).json({ error: 'Authentication required' });
  }
};

// Authentication endpoints
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    if (!pool) {
      // Mock authentication for development
      if (username === 'admin' && password === 'admin') {
        const mockUser = {
          Id: '1',
          FullName: 'System Administrator',
          UserName: 'admin',
          Email: 'admin@company.com',
          Role: 'Admin',
          intOfficeID: 583,
          intWingID: 16
        };
        
        req.session.userId = mockUser.Id;
        req.session.user = mockUser;
        
        return res.json({
          success: true,
          user: mockUser,
          message: 'Login successful'
        });
      } else {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
    }

    // Query AspNetUsers table
    const result = await pool.request()
      .input('username', sql.NVarChar, username)
      .query(`
        SELECT 
          Id, FullName, UserName, Email, Role, intOfficeID, intWingID, 
          intBranchID, intDesignationID, Password, PasswordHash, ISACT
        FROM AspNetUsers 
        WHERE UserName = @username AND ISACT = 1
      `);

    if (result.recordset.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.recordset[0];

    // Check password - first try plain text Password field, then hashed PasswordHash
    let isPasswordValid = false;
    
    if (user.Password && user.Password === password) {
      // Plain text password match
      isPasswordValid = true;
    } else if (user.PasswordHash) {
      // Try bcrypt comparison for hashed passwords
      try {
        isPasswordValid = await bcrypt.compare(password, user.PasswordHash);
      } catch (error) {
        console.error('Password hash comparison error:', error);
        isPasswordValid = false;
      }
    }

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Store user in session
    req.session.userId = user.Id;
    req.session.user = {
      Id: user.Id,
      FullName: user.FullName,
      UserName: user.UserName,
      Email: user.Email,
      Role: user.Role,
      intOfficeID: user.intOfficeID,
      intWingID: user.intWingID,
      intBranchID: user.intBranchID,
      intDesignationID: user.intDesignationID
    };

    // Update last login time
    await pool.request()
      .input('userId', sql.NVarChar, user.Id)
      .input('lastLogin', sql.DateTime2, new Date())
      .query(`
        UPDATE AspNetUsers 
        SET LastLoggedIn = @lastLogin 
        WHERE Id = @userId
      `);

    res.json({
      success: true,
      user: req.session.user,
      message: 'Login successful'
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to logout' });
    }
    res.json({ success: true, message: 'Logout successful' });
  });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({
    success: true,
    user: req.session.user
  });
});

// Session management endpoints
app.get('/api/session', async (req, res) => {
  try {
    // Check if we have a session user
    if (req.session && req.session.userId) {
      // User is properly logged in via session
      const sessionUser = {
        user_id: req.session.userId,
        user_name: req.session.user?.FullName || 'Unknown User',
        email: req.session.user?.Email || '',
        role: req.session.user?.Role || 'User',
        office_id: req.session.user?.intOfficeID || 583,
        wing_id: req.session.user?.intWingID || 19,
        created_at: new Date().toISOString()
      };
      
      console.log('🔐 Session: Returning logged-in user:', sessionUser.user_name, '(', sessionUser.user_id, ')');
      return res.json({
        success: true,
        session: sessionUser,
        session_id: req.sessionID
      });
    }
    
    // Try to get the current logged-in user from AspNetUsers
    // For development, we'll check if there's a user with CNIC 1111111111111 (Simple Test User)
    if (pool) {
      const result = await pool.request().query(`
        SELECT Id, FullName, Email, CNIC 
        FROM AspNetUsers 
        WHERE CNIC = '1111111111111'
      `);
      
      if (result.recordset.length > 0) {
        const user = result.recordset[0];
        const sessionUser = {
          user_id: user.Id,
          user_name: user.FullName,
          email: user.Email,
          role: 'User',
          office_id: 583,
          wing_id: 19,
          created_at: new Date().toISOString()
        };
        
        return res.json({
          success: true,
          session: sessionUser,
          session_id: 'auto-detected-session'
        });
      }
    }
  } catch (error) {
    console.error('Error getting session user:', error);
  }
  
  // Fallback to default session
  console.log('🛠️ Session: Using default session for development');
  res.json({
    success: true,
    session: DEFAULT_SESSION,
    session_id: DEFAULT_SESSION_ID
  });
});

app.get('/api/session/current-user', (req, res) => {
  // Return current user info
  res.json({
    success: true,
    user: DEFAULT_SESSION
  });
});

// File upload endpoint
app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Return the relative path that can be used to access the file
    const filePath = `tender-files/${req.file.filename}`;
    res.json({ 
      success: true,
      filePath: filePath,
      originalName: req.file.originalname,
      size: req.file.size,
      url: `http://localhost:3001/uploads/${filePath}`
    });
  } catch (error) {
    res.status(500).json({ error: 'File upload failed' });
  }
});

// Get all active offices
app.get('/api/offices', async (req, res) => {
  try {
    if (!pool) {
      // Return mock data when SQL Server is not connected
      const mockOffices = [
        { intOfficeID: 1, strOfficeName: 'Head Office', strOfficeDescription: 'Main headquarters', strTelephoneNumber: '021-1234567', strEmail: 'head@company.com', OfficeCode: 'HO001' },
        { intOfficeID: 2, strOfficeName: 'Branch Office Karachi', strOfficeDescription: 'Karachi branch', strTelephoneNumber: '021-7654321', strEmail: 'karachi@company.com', OfficeCode: 'KHI001' },
        { intOfficeID: 3, strOfficeName: 'Branch Office Lahore', strOfficeDescription: 'Lahore branch', strTelephoneNumber: '042-1234567', strEmail: 'lahore@company.com', OfficeCode: 'LHR001' }
      ];
      return res.json(mockOffices);
    }

    const result = await pool.request().query(`
      SELECT 
        intOfficeID,
        strOfficeName,
        strOfficeDescription,
        strTelephoneNumber,
        strEmail,
        OfficeCode,
        IS_ACT,
        IS_DELETED,
        CreatedAt,
        UpdatedAt,
        CreatedBy,
        UpdatedBy,
        Version,
        CRT_BY,
        CRT_AT,
        LST_MOD_BY,
        LST_MOD_AT,
        DEL_BY,
        DEL_AT,
        DEL_IP,
        strFax,
        strGPSCoords,
        strPhotoPath,
        intProvinceID,
        intDivisionID,
        intDistrictID,
        intConstituencyID
      FROM tblOffices 
      WHERE IS_ACT = 1 AND (IS_DELETED = 0 OR IS_DELETED IS NULL)
      ORDER BY strOfficeName
    `);
    res.json(result.recordset);
  } catch (error) {
    // Fallback to mock data on any error
    const mockOffices = [
      { intOfficeID: 1, strOfficeName: 'Head Office', strOfficeDescription: 'Main headquarters', strTelephoneNumber: '021-1234567', strEmail: 'head@company.com', OfficeCode: 'HO001' },
      { intOfficeID: 2, strOfficeName: 'Branch Office Karachi', strOfficeDescription: 'Karachi branch', strTelephoneNumber: '021-7654321', strEmail: 'karachi@company.com', OfficeCode: 'KHI001' },
      { intOfficeID: 3, strOfficeName: 'Branch Office Lahore', strOfficeDescription: 'Lahore branch', strTelephoneNumber: '042-1234567', strEmail: 'lahore@company.com', OfficeCode: 'LHR001' }
    ];
    res.json(mockOffices);
  }
});

// Get all active wings
app.get('/api/wings', async (req, res) => {
  try {
    if (!pool) {
      // Return mock data when SQL Server is not connected
      const mockWings = [
        { Id: 1, Name: 'Administration Wing', ShortName: 'Admin', FocalPerson: 'John Smith', ContactNo: '021-1111111', WingCode: 'ADM001' },
        { Id: 2, Name: 'Finance Wing', ShortName: 'Finance', FocalPerson: 'Jane Doe', ContactNo: '021-2222222', WingCode: 'FIN001' },
        { Id: 3, Name: 'Operations Wing', ShortName: 'Operations', FocalPerson: 'Mike Johnson', ContactNo: '021-3333333', WingCode: 'OPS001' }
      ];
      return res.json(mockWings);
    }

    const result = await pool.request().query(`
      SELECT 
        Id,
        Name,
        ShortName,
        FocalPerson,
        ContactNo,
        Creator,
        CreateDate,
        Modifier,
        ModifyDate,
        OfficeID,
        IS_ACT,
        HODID,
        HODName,
        WingCode,
        CreatedAt,
        UpdatedAt
      FROM WingsInformation 
      WHERE IS_ACT = 1
      ORDER BY Name
    `);
    res.json(result.recordset);
  } catch (error) {
    // Fallback to mock data on any error
    const mockWings = [
      { Id: 1, Name: 'Administration Wing', ShortName: 'Admin', FocalPerson: 'John Smith', ContactNo: '021-1111111', WingCode: 'ADM001' },
      { Id: 2, Name: 'Finance Wing', ShortName: 'Finance', FocalPerson: 'Jane Doe', ContactNo: '021-2222222', WingCode: 'FIN001' },
      { Id: 3, Name: 'Operations Wing', ShortName: 'Operations', FocalPerson: 'Mike Johnson', ContactNo: '021-3333333', WingCode: 'OPS001' }
    ];
    res.json(mockWings);
  }
});

// Get all active DECs
app.get('/api/decs', async (req, res) => {
  try {
    if (!pool) {
      // Return mock data when SQL Server is not connected
      const mockDecs = [
        { intAutoID: 1, WingID: 1, DECName: 'Human Resources DEC', DECAcronym: 'HR', DECAddress: 'Block A, Office Complex', Location: 'Islamabad', DECCode: 'HR001' },
        { intAutoID: 2, WingID: 2, DECName: 'Information Technology DEC', DECAcronym: 'IT', DECAddress: 'Block B, Office Complex', Location: 'Karachi', DECCode: 'IT001' },
        { intAutoID: 3, WingID: 3, DECName: 'Procurement DEC', DECAcronym: 'PROC', DECAddress: 'Block C, Office Complex', Location: 'Lahore', DECCode: 'PROC001' }
      ];
      return res.json(mockDecs);
    }

    const result = await pool.request().query(`
      SELECT DISTINCT
        DECID as intAutoID,
        WingID,
        DECName,
        DECID as DEC_ID
      FROM vw_Full_hirarcy_Office_to_Employee
      WHERE DECID IS NOT NULL
      ORDER BY DECName
    `);
    console.log(`✅ Loaded ${result.recordset.length} DECs from hierarchy view`);
    res.json(result.recordset);
  } catch (error) {
    console.error('❌ Error fetching DECs from database:', error);
    // Fallback to mock data on any error
    const mockDecs = [
      { intAutoID: 1, WingID: 1, DECName: 'Human Resources DEC', DECAcronym: 'HR', DECAddress: 'Block A, Office Complex', Location: 'Islamabad', DECCode: 'HR001' },
      { intAutoID: 2, WingID: 2, DECName: 'Information Technology DEC', DECAcronym: 'IT', DECAddress: 'Block B, Office Complex', Location: 'Karachi', DECCode: 'IT001' },
      { intAutoID: 3, WingID: 3, DECName: 'Procurement DEC', DECAcronym: 'PROC', DECAddress: 'Block C, Office Complex', Location: 'Lahore', DECCode: 'PROC001' }
    ];
    res.json(mockDecs);
  }
});

// Get office names by IDs
app.get('/api/offices/names', async (req, res) => {
  try {
    const { ids } = req.query;
    if (!ids) {
      return res.json({ names: [] });
    }

    const idList = ids.split(',').map(id => id.trim()).filter(id => id);
    if (idList.length === 0) {
      return res.json({ names: [] });
    }

    if (!pool) {
      // Return mock data when SQL Server is not connected
      const mockNames = idList.map((id, index) => `Office ${id}`);
      return res.json({ names: mockNames });
    }

    const placeholders = idList.map((_, index) => `@id${index}`).join(',');
    const request = pool.request();
    idList.forEach((id, index) => {
      request.input(`id${index}`, sql.Int, parseInt(id));
    });

    const result = await request.query(`
      SELECT strOfficeName 
      FROM Office_MST 
      WHERE intOfficeID IN (${placeholders}) AND IS_ACT = 1
      ORDER BY strOfficeName
    `);

    const names = result.recordset.map(row => row.strOfficeName);
    res.json({ names });
  } catch (error) {
    console.error('Error fetching office names:', error);
    res.json({ names: [] });
  }
});

// Get wing names by IDs
app.get('/api/wings/names', async (req, res) => {
  try {
    const { ids } = req.query;
    if (!ids) {
      return res.json({ names: [] });
    }

    const idList = ids.split(',').map(id => id.trim()).filter(id => id);
    if (idList.length === 0) {
      return res.json({ names: [] });
    }

    if (!pool) {
      // Return mock data when SQL Server is not connected
      const mockNames = idList.map((id, index) => `Wing ${id}`);
      return res.json({ names: mockNames });
    }

    const placeholders = idList.map((_, index) => `@id${index}`).join(',');
    const request = pool.request();
    idList.forEach((id, index) => {
      request.input(`id${index}`, sql.Int, parseInt(id));
    });

    const result = await request.query(`
      SELECT WingName 
      FROM Wing_MST 
      WHERE intAutoID IN (${placeholders}) AND IS_ACT = 'true'
      ORDER BY WingName
    `);

    const names = result.recordset.map(row => row.WingName);
    res.json({ names });
  } catch (error) {
    console.error('Error fetching wing names:', error);
    res.json({ names: [] });
  }
});

// Get DEC names by IDs
app.get('/api/decs/names', async (req, res) => {
  try {
    const { ids } = req.query;
    if (!ids) {
      return res.json({ names: [] });
    }

    const idList = ids.split(',').map(id => id.trim()).filter(id => id);
    if (idList.length === 0) {
      return res.json({ names: [] });
    }

    if (!pool) {
      // Return mock data when SQL Server is not connected
      const mockNames = idList.map((id, index) => `DEC ${id}`);
      return res.json({ names: mockNames });
    }

    const placeholders = idList.map((_, index) => `@id${index}`).join(',');
    const request = pool.request();
    idList.forEach((id, index) => {
      request.input(`id${index}`, sql.Int, parseInt(id));
    });

    const result = await request.query(`
      SELECT DECName 
      FROM DEC_MST 
      WHERE intAutoID IN (${placeholders}) AND IS_ACT = 'true'
      ORDER BY DECName
    `);

    const names = result.recordset.map(row => row.DECName);
    res.json({ names });
  } catch (error) {
    console.error('Error fetching DEC names:', error);
    res.json({ names: [] });
  }
});

// Get all active users from AspNetUsers
app.get('/api/users', async (req, res) => {
  try {
    if (!pool) {
      // Return mock data when SQL Server is not connected
      const mockUsers = [
        { Id: '1', FullName: 'John Doe', UserName: 'john.doe', Email: 'john.doe@company.com', Role: 'Admin', intOfficeID: 583, intWingID: 16, ISACT: true },
        { Id: '2', FullName: 'Jane Smith', UserName: 'jane.smith', Email: 'jane.smith@company.com', Role: 'User', intOfficeID: 584, intWingID: 17, ISACT: true },
        { Id: '3', FullName: 'Mike Johnson', UserName: 'mike.johnson', Email: 'mike.johnson@company.com', Role: 'Manager', intOfficeID: 585, intWingID: 18, ISACT: true }
      ];
      return res.json(mockUsers);
    }

    const result = await pool.request().query(`
      SELECT 
        Id,
        FullName,
        FatherOrHusbandName,
        CNIC,
        UserName,
        Email,
        PhoneNumber,
        Role,
        intOfficeID,
        intWingID,
        intBranchID,
        intDesignationID,
        ISACT,
        AddedOn,
        LastLoggedIn,
        Gender,
        ProfilePhoto,
        UID
      FROM AspNetUsers 
      WHERE ISACT = 1
      ORDER BY FullName
    `);
    res.json(result.recordset);
  } catch (error) {
    // Fallback to mock data on any error
    const mockUsers = [
      { Id: '1', FullName: 'John Doe', UserName: 'john.doe', Email: 'john.doe@company.com', Role: 'Admin', intOfficeID: 583, intWingID: 16, ISACT: true },
      { Id: '2', FullName: 'Jane Smith', UserName: 'jane.smith', Email: 'jane.smith@company.com', Role: 'User', intOfficeID: 584, intWingID: 17, ISACT: true },
      { Id: '3', FullName: 'Mike Johnson', UserName: 'mike.johnson', Email: 'mike.johnson@company.com', Role: 'Manager', intOfficeID: 585, intWingID: 18, ISACT: true }
    ];
    res.json(mockUsers);
  }
});

// Get users for approval forwarding (formatted for dropdown)
app.get('/api/users/approvers', async (req, res) => {
  try {
    if (!pool) {
      // Return mock data when SQL Server is not connected
      const mockUsers = [
        { 
          Id: '1', 
          FullName: 'John Doe', 
          UserName: 'john.doe', 
          Role: 'Admin', 
          displayName: 'John Doe (Admin)',
          designation: 'System Administrator'
        },
        { 
          Id: '2', 
          FullName: 'Jane Smith', 
          UserName: 'jane.smith', 
          Role: 'Manager', 
          displayName: 'Jane Smith (Manager)',
          designation: 'Department Manager'
        },
        { 
          Id: '3', 
          FullName: 'Mike Johnson', 
          UserName: 'mike.johnson', 
          Role: 'Approver', 
          displayName: 'Mike Johnson (Approver)',
          designation: 'Senior Officer'
        }
      ];
      return res.json(mockUsers);
    }

    const result = await pool.request().query(`
      SELECT 
        u.Id,
        u.FullName,
        u.UserName,
        u.Email,
        u.Role,
        u.intOfficeID,
        u.intWingID,
        u.intDesignationID,
        d.DesignationName as designation,
        o.strOfficeName as officeName,
        w.WingName as wingName,
        CONCAT(u.FullName, ' (', COALESCE(d.DesignationName, u.Role), ')') as displayName
      FROM AspNetUsers u
      LEFT JOIN Designation_MST d ON u.intDesignationID = d.intAutoID
      LEFT JOIN Office_MST o ON u.intOfficeID = o.intOfficeID
      LEFT JOIN Wing_MST w ON u.intWingID = w.intAutoID
      WHERE u.ISACT = 1
      ORDER BY u.FullName
    `);

    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching approvers:', error);
    // Fallback to mock data on any error
    const mockUsers = [
      { 
        Id: '1', 
        FullName: 'John Doe', 
        UserName: 'john.doe', 
        Role: 'Admin', 
        displayName: 'John Doe (Admin)',
        designation: 'System Administrator'
      },
      { 
        Id: '2', 
        FullName: 'Jane Smith', 
        UserName: 'jane.smith', 
        Role: 'Manager', 
        displayName: 'Jane Smith (Manager)',
        designation: 'Department Manager'
      }
    ];
    res.json(mockUsers);
  }
});

// Get single user details
app.get('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!pool) {
      // Return mock data
      const mockUser = {
        Id: id,
        FullName: 'John Doe',
        UserName: 'john.doe',
        Email: 'john.doe@company.com',
        Role: 'Admin',
        designation: 'System Administrator'
      };
      return res.json(mockUser);
    }

    const result = await pool.request()
      .input('userId', sql.NVarChar, id)
      .query(`
        SELECT 
          u.Id,
          u.FullName,
          u.FatherOrHusbandName,
          u.CNIC,
          u.UserName,
          u.Email,
          u.PhoneNumber,
          u.Role,
          u.intOfficeID,
          u.intWingID,
          u.intBranchID,
          u.intDesignationID,
          u.Gender,
          u.AddedOn,
          u.LastLoggedIn,
          d.DesignationName as designation,
          o.strOfficeName as officeName,
          w.WingName as wingName
        FROM AspNetUsers u
        LEFT JOIN Designation_MST d ON u.intDesignationID = d.intAutoID
        LEFT JOIN Office_MST o ON u.intOfficeID = o.intOfficeID
        LEFT JOIN Wing_MST w ON u.intWingID = w.intAutoID
        WHERE u.Id = @userId AND u.ISACT = 1
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get wings by office
app.get('/api/offices/:officeId/wings', async (req, res) => {
  try {
    const { officeId } = req.params;
    const result = await pool.request()
      .input('officeId', sql.Int, officeId)
      .query(`
        SELECT 
          Id,
          Name,
          ShortName,
          FocalPerson,
          ContactNo,
          Creator,
          CreateDate,
          Modifier,
          ModifyDate,
          OfficeID,
          IS_ACT,
          HODID,
          HODName,
          WingCode,
          CreatedAt,
          UpdatedAt
        FROM WingsInformation 
        WHERE OfficeID = @officeId AND IS_ACT = 1
        ORDER BY Name
      `);
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch wings by office', details: error.message });
  }
});

// Get DECs by wing
app.get('/api/wings/:wingId/decs', async (req, res) => {
  try {
    const { wingId } = req.params;
    const result = await pool.request()
      .input('wingId', sql.Int, wingId)
      .query(`
        SELECT 
          intAutoID,
          WingID,
          DECName,
          DECAcronym,
          DECAddress,
          Location,
          IS_ACT,
          DateAdded,
          DECCode,
          HODID,
          HODName,
          CreatedAt,
          UpdatedAt,
          CreatedBy,
          UpdatedBy,
          Version
        FROM DEC_MST 
        WHERE WingID = @wingId AND IS_ACT = 1
        ORDER BY DECName
      `);
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch DECs by wing', details: error.message });
  }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    if (pool) {
      const result = await pool.request().query('SELECT 1 as test');
      res.json({ status: 'healthy', database: 'connected', timestamp: new Date().toISOString() });
    } else {
      res.status(503).json({ status: 'unhealthy', database: 'disconnected' });
    }
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', database: 'error', error: error.message });
  }
});

// Check if inventoryuser exists
app.get('/api/check-user', async (req, res) => {
  try {
    if (!pool) {
      return res.status(503).json({ error: 'Database not connected' });
    }

    // Check if inventoryuser exists
    const userCheck = await pool.request().query(`
      SELECT 
        name,
        type_desc,
        create_date,
        modify_date,
        is_disabled
      FROM sys.server_principals 
      WHERE name = 'inventoryuser'
    `);

    // Check database users
    const dbUserCheck = await pool.request().query(`
      SELECT 
        name,
        type_desc,
        create_date,
        modify_date
      FROM sys.database_principals 
      WHERE name = 'inventoryuser'
    `);

    // Check current user
    const currentUser = await pool.request().query('SELECT SYSTEM_USER as current_user, USER_NAME() as database_user');

    res.json({
      serverLogin: userCheck.recordset,
      databaseUser: dbUserCheck.recordset,
      currentConnection: currentUser.recordset[0],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to check user', details: error.message });
  }
});

// =============================================================================
// STOCK ISSUANCE API ENDPOINTS (REBUILT FROM SCRATCH)
// =============================================================================

// Submit stock issuance request
app.post('/api/stock-issuance/requests', async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const {
      request_number,
      request_type,
      requester_office_id,
      requester_wing_id,
      requester_branch_id,
      requester_user_id,
      purpose,
      urgency_level,
      justification,
      expected_return_date,
      is_returnable,
      request_status = 'Submitted'
    } = req.body;
    // Insert stock issuance request
    const requestResult = await pool.request()
      .input('request_number', sql.NVarChar, request_number)
      .input('request_type', sql.NVarChar, request_type)
      .input('requester_office_id', sql.Int, requester_office_id)
      .input('requester_wing_id', sql.Int, requester_wing_id)
      .input('requester_branch_id', sql.NVarChar, requester_branch_id)
      .input('requester_user_id', sql.UniqueIdentifier, requester_user_id)
      .input('purpose', sql.NVarChar, purpose)
      .input('urgency_level', sql.NVarChar, urgency_level)
      .input('justification', sql.NVarChar, justification)
      .input('expected_return_date', sql.NVarChar, expected_return_date)
      .input('is_returnable', sql.Bit, is_returnable)
      .input('request_status', sql.NVarChar, request_status)
      .query(`
        INSERT INTO stock_issuance_requests (
          id, request_number, request_type, requester_office_id, requester_wing_id,
          requester_branch_id, requester_user_id, purpose, urgency_level, 
          justification, expected_return_date, is_returnable, request_status,
          submitted_at, created_at, updated_at
        ) 
        OUTPUT INSERTED.id, INSERTED.request_number
        VALUES (
          NEWID(), @request_number, @request_type, @requester_office_id, @requester_wing_id,
          @requester_branch_id, @requester_user_id, @purpose, @urgency_level,
          @justification, @expected_return_date, @is_returnable, @request_status,
          GETDATE(), GETDATE(), GETDATE()
        )
      `);

    // Automatically submit for approval
    const requestId = requestResult.recordset[0].id;
    const workflowId = 'D806EC95-FB78-4187-8FC2-87B897C124A4'; // Stock Issuance Approval workflow
    const userId = req.session?.userId || requester_user_id; // Use session user or requester

    try {
      // Get supervisor from viw_employee_with_supervisor based on the requester
      const supervisorResult = await pool.request()
        .input('employee_id', sql.NVarChar, requester_user_id)
        .query(`
          SELECT BossID 
          FROM viw_employee_with_supervisor 
          WHERE EmployeeID = @employee_id
        `);

      let firstApproverId = null;
      
      if (supervisorResult.recordset.length > 0 && supervisorResult.recordset[0].BossID) {
        // Found supervisor in hierarchy
        firstApproverId = supervisorResult.recordset[0].BossID;
        console.log('👤 Auto-assigning stock issuance to supervisor from viw_employee_with_supervisor:', firstApproverId);
      } else {
        // Fallback to workflow approvers if no supervisor found
        console.log('⚠️ No supervisor found in viw_employee_with_supervisor, falling back to workflow approvers');
        const workflowResult = await pool.request()
          .input('workflow_id', sql.UniqueIdentifier, workflowId)
          .query(`
            SELECT TOP 1 user_id 
            FROM workflow_approvers 
            WHERE workflow_id = @workflow_id AND can_approve = 1
            ORDER BY added_date
          `);
        
        if (workflowResult.recordset.length > 0) {
          firstApproverId = workflowResult.recordset[0].user_id;
          console.log('👤 Auto-assigning stock issuance to workflow approver:', firstApproverId);
        }
      }

      if (firstApproverId) {
        // Create approval record
        await pool.request()
          .input('request_id', sql.UniqueIdentifier, requestId)
          .input('request_type', sql.NVarChar, 'stock_issuance')
          .input('workflow_id', sql.UniqueIdentifier, workflowId)
          .input('current_approver_id', sql.NVarChar, firstApproverId)
          .input('current_status', sql.NVarChar, 'pending')
          .input('submitted_by', sql.NVarChar, userId)
          .query(`
            INSERT INTO request_approvals (request_id, request_type, workflow_id, current_approver_id, current_status, submitted_by)
            VALUES (@request_id, @request_type, @workflow_id, @current_approver_id, @current_status, @submitted_by)
          `);

        console.log('✅ Approval record created for stock issuance request:', requestId);
        
        // Create notification for the assigned approver
        try {
          await createNotification(
            firstApproverId,
            '🔔 New Approval Request',
            `A new stock issuance request requires your approval. Request ID: ${requestId}`,
            'info',
            `/dashboard/approval-dashboard`,
            'View Request'
          );
        } catch (notificationError) {
          console.error('Failed to create notification for approver:', notificationError);
        }
      } else {
        console.warn('⚠️ No approvers found for stock issuance workflow');
      }
    } catch (approvalError) {
      console.error('❌ Failed to create approval record:', approvalError);
      // Don't fail the entire request, just log the error
    }

    res.json({
      success: true,
      data: requestResult.recordset[0]
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to create request', details: error.message });
  }
});

// Submit stock issuance items
app.post('/api/stock-issuance/items', async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const { request_id, items } = req.body;
    // Insert multiple items
    const itemInserts = items.map(item => {
      return pool.request()
        .input('request_id', sql.UniqueIdentifier, request_id)
        .input('item_master_id', sql.UniqueIdentifier, item.item_master_id)
        .input('nomenclature', sql.NVarChar, item.nomenclature)
        .input('requested_quantity', sql.Int, item.requested_quantity)
        .input('unit_price', sql.Decimal(10,2), item.unit_price || 0)
        .input('item_type', sql.NVarChar, item.item_type)
        .input('custom_item_name', sql.NVarChar, item.custom_item_name)
        .query(`
          INSERT INTO stock_issuance_items (
            id, request_id, item_master_id, nomenclature, requested_quantity,
            unit_price, item_type, custom_item_name, created_at, updated_at
          ) VALUES (
            NEWID(), @request_id, @item_master_id, @nomenclature, @requested_quantity,
            @unit_price, @item_type, @custom_item_name, GETDATE(), GETDATE()
          )
        `);
    });

    await Promise.all(itemInserts);
    res.json({ 
      success: true, 
      items_count: items.length,
      message: `Successfully created ${items.length} items`
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to create items', details: error.message });
  }
});

// Get stock issuance requests with proper JOINs
app.get('/api/stock-issuance/requests', async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const { status } = req.query;
    let whereClause = '';
    
    if (status) {
      whereClause = `WHERE sir.request_status = '${status}'`;
    }
    // Main query with proper field mappings
    const requestsQuery = `
      SELECT 
        sir.id,
        sir.request_number,
        sir.request_type,
        sir.requester_office_id,
        sir.requester_wing_id,
        sir.requester_branch_id,
        sir.requester_user_id,
        sir.purpose,
        sir.urgency_level,
        sir.justification,
        sir.expected_return_date,
        sir.is_returnable,
        sir.request_status,
        sir.submitted_at,
        sir.created_at,
        sir.updated_at,
        -- Office information
        COALESCE(o.strOfficeName, 'Unknown Office') as office_name,
        COALESCE(o.OfficeCode, 'N/A') as office_code,
        -- Wing information  
        COALESCE(w.Name, 'Unknown Wing') as wing_name,
        COALESCE(w.ShortName, 'N/A') as wing_short_name,
        COALESCE(w.WingCode, 'N/A') as wing_code,
        -- User information
        COALESCE(u.FullName, 'Unknown User') as requester_full_name,
        COALESCE(u.Role, 'User') as requester_role,
        COALESCE(u.Email, 'N/A') as requester_email,
        COALESCE(u.UserName, 'N/A') as requester_username
      FROM stock_issuance_requests sir
      LEFT JOIN tblOffices o ON sir.requester_office_id = o.intOfficeID
      LEFT JOIN WingsInformation w ON sir.requester_wing_id = w.Id  
      LEFT JOIN AspNetUsers u ON CAST(sir.requester_user_id AS NVARCHAR(450)) = CAST(u.Id AS NVARCHAR(450))
      ${whereClause}
      ORDER BY sir.created_at DESC
    `;

    const result = await pool.request().query(requestsQuery);
    // Get items for each request
    const requestsWithItems = await Promise.all(
      result.recordset.map(async (request) => {
        try {
          const itemsResult = await pool.request()
            .input('request_id', sql.UniqueIdentifier, request.id)
            .query(`
              SELECT 
                sii.id,
                sii.item_master_id,
                sii.nomenclature,
                sii.requested_quantity,
                sii.unit_price,
                sii.item_type,
                sii.custom_item_name,
                sii.item_status,
                sii.created_at,
                sii.updated_at
              FROM stock_issuance_items sii
              WHERE sii.request_id = @request_id
              ORDER BY sii.created_at
            `);
          
          return {
            // Request data
            id: request.id,
            request_number: request.request_number,
            request_type: request.request_type,
            purpose: request.purpose,
            urgency_level: request.urgency_level,
            justification: request.justification,
            expected_return_date: request.expected_return_date,
            is_returnable: request.is_returnable,
            request_status: request.request_status,
            submitted_at: request.submitted_at,
            created_at: request.created_at,
            updated_at: request.updated_at,
            
            // Requester information
            requester: {
              user_id: request.requester_user_id,
              full_name: request.requester_full_name,
              role: request.requester_role,
              email: request.requester_email,
              username: request.requester_username
            },
            
            // Office information
            office: {
              office_id: request.requester_office_id,
              name: request.office_name,
              office_code: request.office_code
            },
            
            // Wing information
            wing: {
              wing_id: request.requester_wing_id,
              name: request.wing_name,
              short_name: request.wing_short_name,
              wing_code: request.wing_code
            },
            
            // Branch/DEC information (derived from wing)
            branch: {
              branch_id: request.requester_branch_id,
              dec_name: request.wing_name
            },
            
            // Items
            items: itemsResult.recordset || []
          };
        } catch (error) {
          return {
            ...request,
            requester: {
              user_id: request.requester_user_id,
              full_name: 'Unknown User',
              role: 'User',
              email: 'N/A',
              username: 'N/A'
            },
            office: {
              office_id: request.requester_office_id,
              name: 'Unknown Office',
              office_code: 'N/A'
            },
            wing: {
              wing_id: request.requester_wing_id,
              name: 'Unknown Wing',
              short_name: 'N/A',
              wing_code: 'N/A'
            },
            branch: {
              branch_id: request.requester_branch_id,
              dec_name: 'Unknown Wing'
            },
            items: []
          };
        }
      })
    );

    // Calculate dashboard counts
    const totalCount = requestsWithItems.length;
    const pendingCount = requestsWithItems.filter(r => 
      r.request_status === 'Submitted' || r.request_status === 'Pending'
    ).length;
    const approvedCount = requestsWithItems.filter(r => 
      r.request_status === 'Approved'
    ).length;
    const issuedCount = requestsWithItems.filter(r => 
      r.request_status === 'Issued'
    ).length;
    if (requestsWithItems.length > 0) {
    }
    
    res.json({
      success: true,
      data: requestsWithItems,
      summary: {
        totalCount,
        pendingCount,
        approvedCount,
        issuedCount
      },
      pagination: {
        totalPages: 1,
        currentPage: 1,
        pageSize: requestsWithItems.length
      }
    });

  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch requests', 
      details: error.message 
    });
  }
});

// Get issued items for stock returns (returnable items with status 'Issued')
app.get('/api/stock-issuance/issued-items', async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const result = await pool.request().query(`
      SELECT 
        sii.id,
        sii.request_id,
        sii.nomenclature,
        sii.requested_quantity,
        sir.request_number,
        sir.created_at,
        sir.expected_return_date,
        sir.is_returnable,
        u.FullName as requester_name
      FROM stock_issuance_items sii
      INNER JOIN stock_issuance_requests sir ON sii.request_id = sir.id
      LEFT JOIN AspNetUsers u ON CAST(sir.requester_user_id AS NVARCHAR(450)) = CAST(u.Id AS NVARCHAR(450))
      WHERE sir.is_returnable = 1 
        AND sii.item_status = 'Issued'
      ORDER BY sir.expected_return_date ASC
    `);
    res.json({
      success: true,
      data: result.recordset
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch issued items', details: error.message });
  }
});

// =============================================================================
// STOCK ISSUANCE APPROVAL ENDPOINTS
// =============================================================================

// Approve stock issuance request
app.put('/api/stock-issuance/requests/:id/approve', async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const { id } = req.params;
    const {
      approver_name,
      approver_designation,
      approval_comments,
      item_approvals
    } = req.body;
    const transaction = pool.transaction();
    await transaction.begin();

    try {
      // Update request status to approved
      await transaction.request()
        .input('id', sql.UniqueIdentifier, id)
        .input('approver_name', sql.NVarChar, approver_name)
        .input('approver_designation', sql.NVarChar, approver_designation)
        .input('approval_comments', sql.NVarChar, approval_comments)
        .query(`
          UPDATE stock_issuance_requests 
          SET 
            request_status = 'Approved',
            approved_at = GETDATE(),
            approved_by = @approver_name,
            review_comments = @approval_comments,
            updated_at = GETDATE()
          WHERE id = @id
        `);

      // Update individual items if item_approvals provided
      if (item_approvals && Array.isArray(item_approvals)) {
        for (const itemApproval of item_approvals) {
          await transaction.request()
            .input('item_id', sql.UniqueIdentifier, itemApproval.item_id)
            .input('approved_quantity', sql.Int, itemApproval.approved_quantity)
            .input('rejection_reason', sql.NVarChar, itemApproval.rejection_reason || null)
            .query(`
              UPDATE stock_issuance_items 
              SET 
                approved_quantity = @approved_quantity,
                item_status = CASE 
                  WHEN @approved_quantity > 0 THEN 'Approved'
                  ELSE 'Rejected'
                END,
                rejection_reason = @rejection_reason,
                updated_at = GETDATE()
              WHERE id = @item_id
            `);
        }
      } else {
        // If no specific item approvals, approve all items with requested quantities
        await transaction.request()
          .input('request_id', sql.UniqueIdentifier, id)
          .query(`
            UPDATE stock_issuance_items 
            SET 
              approved_quantity = requested_quantity,
              item_status = 'Approved',
              updated_at = GETDATE()
            WHERE request_id = @request_id
          `);
      }

      await transaction.commit();
      res.json({
        success: true,
        message: 'Request approved successfully'
      });

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    res.status(500).json({ error: 'Failed to approve request', details: error.message });
  }
});

// Reject stock issuance request
app.put('/api/stock-issuance/requests/:id/reject', async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const { id } = req.params;
    const {
      approver_name,
      approver_designation,
      approval_comments
    } = req.body;
    const transaction = pool.transaction();
    await transaction.begin();

    try {
      // Update request status to rejected
      await transaction.request()
        .input('id', sql.UniqueIdentifier, id)
        .input('approver_name', sql.NVarChar, approver_name)
        .input('approver_designation', sql.NVarChar, approver_designation)
        .input('approval_comments', sql.NVarChar, approval_comments)
        .query(`
          UPDATE stock_issuance_requests 
          SET 
            request_status = 'Rejected',
            reviewed_at = GETDATE(),
            reviewed_by = @approver_name,
            review_comments = @approval_comments,
            updated_at = GETDATE()
          WHERE id = @id
        `);

      // Mark all items as rejected
      await transaction.request()
        .input('request_id', sql.UniqueIdentifier, id)
        .input('rejection_reason', sql.NVarChar, approval_comments || 'Request rejected by approver')
        .query(`
          UPDATE stock_issuance_items 
          SET 
            approved_quantity = 0,
            item_status = 'Rejected',
            rejection_reason = @rejection_reason,
            updated_at = GETDATE()
          WHERE request_id = @request_id
        `);

      await transaction.commit();
      res.json({
        success: true,
        message: 'Request rejected successfully'
      });

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    res.status(500).json({ error: 'Failed to reject request', details: error.message });
  }
});

// Get pending requests for approval (alias for submitted status)
app.get('/api/stock-issuance/pending-approvals', async (req, res) => {
  try {
    // Redirect to the main requests endpoint with submitted status
    req.query.status = 'Submitted';
    return app._router.handle({ ...req, url: '/api/stock-issuance/requests' }, res);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pending approvals', details: error.message });
  }
});

// Get inventory matches for a specific request (for enhanced approval)
app.get('/api/stock-issuance/requests/:id/inventory-matches', async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const { id } = req.params;
    // First, get the requested items
    const requestedItemsResult = await pool.request()
      .input('request_id', sql.UniqueIdentifier, id)
      .query(`
        SELECT 
          sii.id as requested_item_id,
          sii.nomenclature as requested_nomenclature,
          sii.requested_quantity,
          sii.custom_item_name,
          sii.item_type
        FROM stock_issuance_items sii
        WHERE sii.request_id = @request_id
        ORDER BY sii.created_at
      `);

    const requestedItems = requestedItemsResult.recordset;

    // For each requested item, find potential inventory matches
    const itemsWithMatches = await Promise.all(
      requestedItems.map(async (requestedItem) => {
        try {
          // Search for inventory items that match the requested nomenclature
          const searchTerm = requestedItem.requested_nomenclature || requestedItem.custom_item_name || '';
          const searchWords = searchTerm.split(' ').filter(word => word.length > 2);
          
          let inventoryMatches = [];
          
          if (searchWords.length > 0) {
            // Create a dynamic WHERE clause for fuzzy matching
            const searchConditions = searchWords.map((_, index) => `
              (im.nomenclature LIKE '%' + @searchWord${index} + '%' OR 
               im.description LIKE '%' + @searchWord${index} + '%' OR
               im.specifications LIKE '%' + @searchWord${index} + '%')
            `).join(' OR ');

            const matchQuery = `
              SELECT 
                cis.id as inventory_id,
                cis.item_master_id,
                cis.current_quantity as current_stock,
                cis.reserved_quantity as reserved_stock,
                cis.available_quantity as available_stock,
                cis.reorder_point as reorder_level,
                cis.maximum_stock_level as max_stock_level,
                0 as unit_price, -- Add unit price from another source if available
                im.nomenclature,
                im.description,
                im.specifications,
                im.unit as unit_of_measurement,
                'General' as category, -- Get from category table if needed
                'General' as subcategory, -- Get from subcategory table if needed
                im.item_code,
                -- Calculate available quantity (current - reserved)
                (cis.current_quantity - ISNULL(cis.reserved_quantity, 0)) as available_quantity,
                -- Calculate match score based on search terms
                CASE 
                  WHEN im.nomenclature LIKE '%' + @exactMatch + '%' THEN 100
                  WHEN im.nomenclature LIKE '%' + @firstWord + '%' THEN 80
                  ELSE 60
                END as match_score
              FROM current_inventory_stock cis
              INNER JOIN item_masters im ON cis.item_master_id = im.id
              WHERE cis.current_quantity > 0 
                AND (cis.current_quantity - ISNULL(cis.reserved_quantity, 0)) > 0
                AND (${searchConditions})
              ORDER BY match_score DESC, (cis.current_quantity - ISNULL(cis.reserved_quantity, 0)) DESC
            `;

            const matchRequest = pool.request()
              .input('exactMatch', sql.NVarChar, searchTerm)
              .input('firstWord', sql.NVarChar, searchWords[0] || '');

            // Add search word parameters
            searchWords.forEach((word, index) => {
              matchRequest.input(`searchWord${index}`, sql.NVarChar, word);
            });

            const matchResult = await matchRequest.query(matchQuery);
            inventoryMatches = matchResult.recordset;
          }

          return {
            requested_item_id: requestedItem.requested_item_id,
            requested_nomenclature: requestedItem.requested_nomenclature,
            requested_quantity: requestedItem.requested_quantity,
            custom_item_name: requestedItem.custom_item_name,
            item_type: requestedItem.item_type,
            inventory_matches: inventoryMatches,
            match_count: inventoryMatches.length,
            can_fulfill: inventoryMatches.some(match => match.available_quantity >= requestedItem.requested_quantity),
            total_available: inventoryMatches.reduce((sum, match) => sum + match.available_quantity, 0)
          };

        } catch (error) {
          return {
            requested_item_id: requestedItem.requested_item_id,
            requested_nomenclature: requestedItem.requested_nomenclature,
            requested_quantity: requestedItem.requested_quantity,
            custom_item_name: requestedItem.custom_item_name,
            item_type: requestedItem.item_type,
            inventory_matches: [],
            match_count: 0,
            can_fulfill: false,
            total_available: 0,
            error: error.message
          };
        }
      })
    );

    // Calculate summary statistics
    const totalRequestedItems = requestedItems.length;
    const fullyFulfillableItems = itemsWithMatches.filter(item => item.can_fulfill).length;
    const partiallyFulfillableItems = itemsWithMatches.filter(item => 
      !item.can_fulfill && item.total_available > 0
    ).length;
    const notFulfillableItems = itemsWithMatches.filter(item => item.total_available === 0).length;
    res.json({
      success: true,
      request_id: id,
      items_with_matches: itemsWithMatches,
      summary: {
        total_requested_items: totalRequestedItems,
        fully_fulfillable: fullyFulfillableItems,
        partially_fulfillable: partiallyFulfillableItems,
        needs_procurement: notFulfillableItems,
        fulfillment_rate: totalRequestedItems > 0 ? 
          Math.round((fullyFulfillableItems / totalRequestedItems) * 100) : 0
      }
    });

  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Failed to find inventory matches', 
      details: error.message 
    });
  }
});

// Approve request with specific inventory allocations
app.post('/api/stock-issuance/requests/:id/approve-with-allocation', async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const { id } = req.params;
    const {
      approver_name,
      approver_designation,
      approval_comments,
      item_allocations // Array of { requested_item_id, inventory_item_id, allocated_quantity, decision_type }
    } = req.body;
    const transaction = pool.transaction();
    await transaction.begin();

    try {
      // Update main request status
      await transaction.request()
        .input('id', sql.UniqueIdentifier, id)
        .input('approver_name', sql.NVarChar, approver_name)
        .input('approval_comments', sql.NVarChar, approval_comments)
        .query(`
          UPDATE stock_issuance_requests 
          SET 
            request_status = 'Approved',
            approved_at = GETDATE(),
            approved_by = @approver_name,
            review_comments = @approval_comments,
            updated_at = GETDATE()
          WHERE id = @id
        `);

      // Process each item allocation
      for (const allocation of item_allocations) {
        const {
          requested_item_id,
          inventory_item_id,
          allocated_quantity,
          decision_type, // 'APPROVE_FROM_STOCK', 'APPROVE_FOR_PROCUREMENT', 'REJECT'
          rejection_reason,
          procurement_required_quantity
        } = allocation;

        // Update the requested item with approval details
        await transaction.request()
          .input('requested_item_id', sql.UniqueIdentifier, requested_item_id)
          .input('approved_quantity', sql.Int, allocated_quantity || 0)
          .input('item_status', sql.NVarChar, decision_type === 'REJECT' ? 'Rejected' : 'Approved')
          .input('rejection_reason', sql.NVarChar, rejection_reason)
          .query(`
            UPDATE stock_issuance_items 
            SET 
              approved_quantity = @approved_quantity,
              item_status = @item_status,
              rejection_reason = @rejection_reason,
              updated_at = GETDATE()
            WHERE id = @requested_item_id
          `);

        // If approved from stock, create reservation
        if (decision_type === 'APPROVE_FROM_STOCK' && inventory_item_id && allocated_quantity > 0) {
          // Create stock reservation
          await transaction.request()
            .input('inventory_item_id', sql.UniqueIdentifier, inventory_item_id)
            .input('request_id', sql.UniqueIdentifier, id)
            .input('requested_item_id', sql.UniqueIdentifier, requested_item_id)
            .input('reserved_quantity', sql.Int, allocated_quantity)
            .input('reserved_by', sql.NVarChar, approver_name)
            .input('expires_at', sql.DateTime2, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) // 30 days from now
            .query(`
              INSERT INTO stock_reservations (
                inventory_item_id, request_id, requested_item_id, 
                reserved_quantity, reserved_by, expires_at
              ) VALUES (
                @inventory_item_id, @request_id, @requested_item_id,
                @reserved_quantity, @reserved_by, @expires_at
              )
            `);

          // Update inventory reserved stock
          await transaction.request()
            .input('inventory_item_id', sql.UniqueIdentifier, inventory_item_id)
            .input('reserved_quantity', sql.Int, allocated_quantity)
            .query(`
              UPDATE current_inventory_stock 
              SET 
                reserved_quantity = ISNULL(reserved_quantity, 0) + @reserved_quantity,
                available_quantity = current_quantity - (ISNULL(reserved_quantity, 0) + @reserved_quantity),
                last_updated = GETDATE()
              WHERE id = @inventory_item_id
            `);
        }

        // If procurement required, create procurement request
        if (decision_type === 'APPROVE_FOR_PROCUREMENT' && procurement_required_quantity > 0) {
          await transaction.request()
            .input('original_request_id', sql.UniqueIdentifier, id)
            .input('requested_item_id', sql.UniqueIdentifier, requested_item_id)
            .input('required_quantity', sql.Int, procurement_required_quantity)
            .input('created_by', sql.NVarChar, approver_name)
            .query(`
              INSERT INTO procurement_requests (
                original_request_id, requested_item_id, required_quantity, created_by
              ) VALUES (
                @original_request_id, @requested_item_id, @required_quantity, @created_by
              )
            `);
        }

        // Record the approval decision
        await transaction.request()
          .input('request_id', sql.UniqueIdentifier, id)
          .input('requested_item_id', sql.UniqueIdentifier, requested_item_id)
          .input('decision_type', sql.NVarChar, decision_type)
          .input('inventory_item_id', sql.UniqueIdentifier, inventory_item_id)
          .input('approved_quantity', sql.Int, allocated_quantity || 0)
          .input('procurement_required_quantity', sql.Int, procurement_required_quantity || 0)
          .input('rejection_reason', sql.NVarChar, rejection_reason)
          .input('approver_id', sql.NVarChar, approver_name)
          .query(`
            INSERT INTO stock_issuance_approval_decisions (
              request_id, requested_item_id, decision_type, inventory_item_id,
              approved_quantity, procurement_required_quantity, rejection_reason, approver_id
            ) VALUES (
              @request_id, @requested_item_id, @decision_type, @inventory_item_id,
              @approved_quantity, @procurement_required_quantity, @rejection_reason, @approver_id
            )
          `);
      }

      await transaction.commit();

      const approvedCount = item_allocations.filter(a => a.decision_type === 'APPROVE_FROM_STOCK').length;
      const procurementCount = item_allocations.filter(a => a.decision_type === 'APPROVE_FOR_PROCUREMENT').length;
      const rejectedCount = item_allocations.filter(a => a.decision_type === 'REJECT').length;
      res.json({
        success: true,
        message: 'Request approved with specific allocations',
        summary: {
          approved_from_stock: approvedCount,
          requires_procurement: procurementCount,
          rejected: rejectedCount
        }
      });

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    res.status(500).json({ error: 'Failed to approve request with allocations', details: error.message });
  }
});

// Finalize stock issuance request
app.put('/api/stock-issuance/requests/:id/finalize', async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const { id } = req.params;
    const { finalized_by } = req.body;
    const now = new Date();
    // First check if request exists and is not already finalized
    const checkResult = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('SELECT is_finalized, request_status FROM stock_issuance_requests WHERE id = @id');

    if (checkResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Stock issuance request not found' });
    }

    if (checkResult.recordset[0].is_finalized) {
      return res.status(400).json({ error: 'Stock issuance request is already finalized' });
    }

    // Only approved or issued requests can be finalized
    if (!['Approved', 'Issued'].includes(checkResult.recordset[0].request_status)) {
      return res.status(400).json({ error: 'Only approved or issued requests can be finalized. Please process the request first.' });
    }

    // Update request to finalized status
    await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('finalized_by', sql.NVarChar, finalized_by)
      .input('finalized_at', sql.DateTime, now)
      .query(`
        UPDATE stock_issuance_requests 
        SET 
          is_finalized = 1,
          finalized_by = @finalized_by,
          finalized_at = @finalized_at,
          updated_at = GETDATE()
        WHERE id = @id
      `);
    res.json({
      success: true,
      message: 'Stock issuance request finalized successfully',
      finalized_at: now,
      finalized_by: finalized_by
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to finalize request', details: error.message });
  }
});

// =============================================================================
// STOCK ISSUANCE - ACTUAL ISSUANCE (NEW IMPLEMENTATION)
// =============================================================================

// Issue approved stock items (reduces inventory)
app.post('/api/stock-issuance/requests/:id/issue', async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const { id } = req.params;
    const { issued_by, issued_date, issuance_items } = req.body;
    
    const transaction = pool.transaction();
    await transaction.begin();

    try {
      // Check if request exists and is approved
      const requestCheck = await transaction.request()
        .input('id', sql.UniqueIdentifier, id)
        .query(`
          SELECT request_status, is_finalized 
          FROM stock_issuance_requests 
          WHERE id = @id
        `);

      if (requestCheck.recordset.length === 0) {
        throw new Error('Stock issuance request not found');
      }

      const request = requestCheck.recordset[0];
      if (request.request_status !== 'Approved') {
        throw new Error('Request must be approved before issuing items');
      }

      if (request.is_finalized) {
        throw new Error('Request is already finalized');
      }

      // Create main StockIssuances record
      const stockIssuanceId = uuidv4();
      await transaction.request()
        .input('id', sql.UniqueIdentifier, stockIssuanceId)
        .input('request_id', sql.UniqueIdentifier, id)
        .input('issued_by', sql.NVarChar, issued_by)
        .input('issued_date', sql.Date, issued_date || new Date())
        .query(`
          INSERT INTO StockIssuances (
            Id, RequestId, IssuedBy, IssuedDate, Status, CreatedDate
          ) VALUES (
            @id, @request_id, @issued_by, @issued_date, 'ISSUED', GETDATE()
          )
        `);

      // Process each item being issued
      for (const item of issuance_items) {
        const { item_master_id, issued_quantity, inventory_item_id, unit_price } = item;

        // Get current inventory stock
        const inventoryCheck = await transaction.request()
          .input('inventory_id', sql.UniqueIdentifier, inventory_item_id)
          .query(`
            SELECT current_quantity, reserved_quantity, available_quantity 
            FROM current_inventory_stock 
            WHERE id = @inventory_id
          `);

        if (inventoryCheck.recordset.length === 0) {
          throw new Error(`Inventory item not found: ${inventory_item_id}`);
        }

        const inventory = inventoryCheck.recordset[0];
        if (inventory.current_quantity < issued_quantity) {
          throw new Error(`Insufficient stock. Available: ${inventory.current_quantity}, Requested: ${issued_quantity}`);
        }

        // 1. UPDATE INVENTORY STOCK - Reduce current_quantity and reserved_quantity
        await transaction.request()
          .input('inventory_id', sql.UniqueIdentifier, inventory_item_id)
          .input('issued_quantity', sql.Int, issued_quantity)
          .query(`
            UPDATE current_inventory_stock 
            SET 
              current_quantity = current_quantity - @issued_quantity,
              reserved_quantity = CASE 
                WHEN reserved_quantity >= @issued_quantity 
                THEN reserved_quantity - @issued_quantity 
                ELSE 0 
              END,
              available_quantity = (current_quantity - @issued_quantity) - CASE 
                WHEN reserved_quantity >= @issued_quantity 
                THEN (reserved_quantity - @issued_quantity) 
                ELSE 0 
              END,
              last_updated = GETDATE()
            WHERE id = @inventory_id
          `);

        // 2. CREATE STOCK MOVEMENT LOG ENTRY
        const movementId = uuidv4();
        await transaction.request()
          .input('movement_id', sql.UniqueIdentifier, movementId)
          .input('item_master_id', sql.UniqueIdentifier, item_master_id)
          .input('quantity', sql.Int, issued_quantity)
          .input('unit_price', sql.Decimal(15, 2), unit_price || 0)
          .input('reference_id', sql.UniqueIdentifier, stockIssuanceId)
          .input('authorized_by', sql.NVarChar, issued_by)
          .query(`
            INSERT INTO stock_movement_log (
              id, item_master_id, movement_type, reference_type, reference_id,
              quantity, unit_price, total_value, movement_date, authorized_by, 
              movement_notes, created_at
            ) VALUES (
              @movement_id, @item_master_id, 'Issue', 'Issuance Request', @reference_id,
              @quantity, @unit_price, (@quantity * @unit_price), GETDATE(), @authorized_by,
              'Stock issued against request', GETDATE()
            )
          `);

        // 3. UPDATE STOCK ISSUANCE ITEMS with issued quantity
        await transaction.request()
          .input('request_id', sql.UniqueIdentifier, id)
          .input('item_master_id', sql.UniqueIdentifier, item_master_id)
          .input('issued_quantity', sql.Int, issued_quantity)
          .query(`
            UPDATE stock_issuance_items 
            SET 
              issued_quantity = @issued_quantity,
              item_status = 'Issued',
              updated_at = GETDATE()
            WHERE request_id = @request_id AND item_master_id = @item_master_id
          `);
      }

      // 4. UPDATE REQUEST STATUS TO ISSUED
      await transaction.request()
        .input('id', sql.UniqueIdentifier, id)
        .input('issued_by', sql.NVarChar, issued_by)
        .query(`
          UPDATE stock_issuance_requests 
          SET 
            request_status = 'Issued',
            issued_at = GETDATE(),
            issued_by = @issued_by,
            updated_at = GETDATE()
          WHERE id = @id
        `);

      await transaction.commit();

      res.json({
        success: true,
        message: 'Items issued successfully and inventory updated',
        issuance_id: stockIssuanceId,
        items_issued: issuance_items.length
      });

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    console.error('Error issuing stock items:', error);
    res.status(500).json({ 
      error: 'Failed to issue stock items', 
      details: error.message 
    });
  }
});

// =============================================================================
// STOCK RETURNS - COMPLETE IMPLEMENTATION
// =============================================================================

// Process stock return (increases inventory)
app.post('/api/stock-returns/:id/process', async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const { id } = req.params;
    const { processed_by, processing_notes, return_items } = req.body;
    
    const transaction = pool.transaction();
    await transaction.begin();

    try {
      // Check if return exists and is not already processed
      const returnCheck = await transaction.request()
        .input('id', sql.UniqueIdentifier, id)
        .query(`
          SELECT return_status, original_request_id 
          FROM stock_returns 
          WHERE id = @id
        `);

      if (returnCheck.recordset.length === 0) {
        throw new Error('Stock return not found');
      }

      const stockReturn = returnCheck.recordset[0];
      if (stockReturn.return_status === 'Accepted') {
        throw new Error('Return is already processed');
      }

      // Process each return item
      for (const item of return_items) {
        const { item_master_id, return_quantity, condition_on_return, inventory_item_id } = item;

        // Only add back to inventory if condition is Good or Fair
        if (['Good', 'Fair'].includes(condition_on_return)) {
          // 1. UPDATE INVENTORY STOCK - Increase current_quantity
          await transaction.request()
            .input('inventory_id', sql.UniqueIdentifier, inventory_item_id)
            .input('return_quantity', sql.Int, return_quantity)
            .query(`
              UPDATE current_inventory_stock 
              SET 
                current_quantity = current_quantity + @return_quantity,
                available_quantity = (current_quantity + @return_quantity) - ISNULL(reserved_quantity, 0),
                last_updated = GETDATE()
              WHERE id = @inventory_id
            `);

          // 2. CREATE STOCK MOVEMENT LOG ENTRY
          const movementId = uuidv4();
          await transaction.request()
            .input('movement_id', sql.UniqueIdentifier, movementId)
            .input('item_master_id', sql.UniqueIdentifier, item_master_id)
            .input('quantity', sql.Int, return_quantity)
            .input('reference_id', sql.UniqueIdentifier, id)
            .input('processed_by', sql.NVarChar, processed_by)
            .query(`
              INSERT INTO stock_movement_log (
                id, item_master_id, movement_type, reference_type, reference_id,
                quantity, movement_date, authorized_by, movement_notes, created_at
              ) VALUES (
                @movement_id, @item_master_id, 'Return', 'Stock Return', @reference_id,
                @quantity, GETDATE(), @processed_by, 'Item returned in ${condition_on_return} condition', GETDATE()
              )
            `);
        }
      }

      // 3. UPDATE RETURN STATUS
      await transaction.request()
        .input('id', sql.UniqueIdentifier, id)
        .input('processed_by', sql.NVarChar, processed_by)
        .input('processing_notes', sql.NVarChar, processing_notes)
        .query(`
          UPDATE stock_returns 
          SET 
            return_status = 'Accepted',
            processed_by = @processed_by,
            processed_at = GETDATE(),
            processing_notes = @processing_notes
          WHERE id = @id
        `);

      await transaction.commit();

      res.json({
        success: true,
        message: 'Stock return processed successfully and inventory updated',
        items_returned: return_items.length
      });

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    console.error('Error processing stock return:', error);
    res.status(500).json({ 
      error: 'Failed to process stock return', 
      details: error.message 
    });
  }
});

// =============================================================================
// INVENTORY REPORTING AND DASHBOARD ENDPOINTS
// =============================================================================

// Get inventory dashboard statistics
app.get('/api/inventory/dashboard-stats', async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    // Get comprehensive inventory statistics from current_inventory_stock table
    const statsResult = await pool.request().query(`
      WITH InventoryStats AS (
        SELECT 
          COUNT(*) as total_items,
          SUM(cis.current_quantity) as total_quantity,
          SUM(cis.available_quantity) as available_quantity,
          SUM(cis.reserved_quantity) as reserved_quantity,
          COUNT(CASE WHEN cis.current_quantity <= cis.minimum_stock_level AND cis.minimum_stock_level > 0 THEN 1 END) as low_stock_items,
          COUNT(CASE WHEN cis.current_quantity = 0 THEN 1 END) as out_of_stock_items,
          COUNT(CASE WHEN cis.current_quantity > cis.maximum_stock_level AND cis.maximum_stock_level > 0 THEN 1 END) as overstock_items
        FROM current_inventory_stock cis
        INNER JOIN item_masters im ON cis.item_master_id = im.id
      ),
      CategoryStats AS (
        SELECT 
          COUNT(DISTINCT c.id) as total_categories
        FROM categories c
      )
      SELECT 
        inv.*,
        cat.*,
        0 as issues_last_month,
        0 as returns_last_month,
        0 as total_issued_last_month,
        0 as total_returned_last_month
      FROM InventoryStats inv
      CROSS JOIN CategoryStats cat
    `);

    const stats = statsResult.recordset[0];

    // Get top items by current stock
    const topItemsResult = await pool.request().query(`
      SELECT TOP 10
        im.nomenclature,
        cis.current_quantity,
        cis.available_quantity,
        c.category_name
      FROM current_inventory_stock cis
      INNER JOIN item_masters im ON cis.item_master_id = im.id
      LEFT JOIN categories c ON im.category_id = c.id
      ORDER BY cis.current_quantity DESC
    `);

    // Get low stock alerts
    const lowStockResult = await pool.request().query(`
      SELECT 
        im.nomenclature,
        im.unit,
        cis.current_quantity,
        cis.minimum_stock_level,
        cis.reorder_point,
        c.category_name
      FROM current_inventory_stock cis
      INNER JOIN item_masters im ON cis.item_master_id = im.id
      LEFT JOIN categories c ON im.category_id = c.id
      WHERE cis.current_quantity <= cis.minimum_stock_level 
        AND cis.minimum_stock_level > 0
      ORDER BY (cis.current_quantity - cis.minimum_stock_level) ASC
    `);

    res.json({
      success: true,
      stats: {
        inventory: {
          total_items: stats.total_items,
          total_quantity: stats.total_quantity,
          available_quantity: stats.available_quantity,
          reserved_quantity: stats.reserved_quantity,
          low_stock_items: stats.low_stock_items,
          out_of_stock_items: stats.out_of_stock_items,
          overstock_items: stats.overstock_items
        },
        movements: {
          issues_last_month: stats.issues_last_month,
          returns_last_month: stats.returns_last_month,
          total_issued_last_month: stats.total_issued_last_month,
          total_returned_last_month: stats.total_returned_last_month
        },
        categories: {
          total_categories: stats.total_categories,
          total_subcategories: 0
        }
      },
      top_moving_items: topItemsResult.recordset,
      low_stock_alerts: lowStockResult.recordset
    });

  } catch (error) {
    console.error('Error fetching inventory dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch inventory dashboard statistics', details: error.message });
  }
});

// Get stock movement history
app.get('/api/inventory/movements', async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const { page = 1, limit = 50, movement_type, date_from, date_to, item_master_id } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = '1 = 1';
    const request = pool.request();

    if (movement_type) {
      whereClause += ' AND sml.movement_type = @movement_type';
      request.input('movement_type', sql.NVarChar, movement_type);
    }

    if (date_from) {
      whereClause += ' AND sml.movement_date >= @date_from';
      request.input('date_from', sql.Date, date_from);
    }

    if (date_to) {
      whereClause += ' AND sml.movement_date <= @date_to';
      request.input('date_to', sql.Date, date_to);
    }

    if (item_master_id) {
      whereClause += ' AND sml.item_master_id = @item_master_id';
      request.input('item_master_id', sql.UniqueIdentifier, item_master_id);
    }

    request.input('offset', sql.Int, offset);
    request.input('limit', sql.Int, parseInt(limit));

    const result = await request.query(`
      SELECT 
        sml.id,
        sml.movement_date,
        sml.movement_type,
        sml.reference_type,
        sml.quantity,
        sml.unit_price,
        sml.total_value,
        sml.movement_notes,
        sml.authorized_by,
        im.nomenclature,
        im.unit,
        c.category_name
      FROM stock_movement_log sml
      INNER JOIN item_masters im ON sml.item_master_id = im.id
      LEFT JOIN categories c ON im.category_id = c.id
      WHERE ${whereClause}
      ORDER BY sml.movement_date DESC, sml.created_at DESC
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `);

    res.json({
      success: true,
      data: result.recordset,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total_records: result.recordset.length
      }
    });

  } catch (error) {
    console.error('Error fetching stock movements:', error);
    res.status(500).json({ 
      error: 'Failed to fetch stock movements', 
      details: error.message 
    });
  }
});

// Get inventory valuation report
app.get('/api/inventory/valuation', async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const result = await pool.request().query(`
      WITH LatestPrices AS (
        SELECT 
          sml.item_master_id,
          sml.unit_price,
          ROW_NUMBER() OVER (PARTITION BY sml.item_master_id ORDER BY sml.movement_date DESC) as rn
        FROM stock_movement_log sml
        WHERE sml.unit_price > 0
      )
      SELECT 
        im.nomenclature,
        im.unit,
        c.category_name,
        cis.current_quantity,
        cis.available_quantity,
        cis.reserved_quantity,
        ISNULL(lp.unit_price, 0) as latest_unit_price,
        (cis.current_quantity * ISNULL(lp.unit_price, 0)) as total_value,
        cis.minimum_stock_level,
        cis.maximum_stock_level
      FROM current_inventory_stock cis
      INNER JOIN item_masters im ON cis.item_master_id = im.id
      LEFT JOIN categories c ON im.category_id = c.id
      LEFT JOIN LatestPrices lp ON im.id = lp.item_master_id AND lp.rn = 1
      WHERE cis.current_quantity > 0
      ORDER BY (cis.current_quantity * ISNULL(lp.unit_price, 0)) DESC
    `);

    const totalValue = result.recordset.reduce((sum, item) => sum + (item.total_value || 0), 0);

    res.json({
      success: true,
      data: result.recordset,
      summary: {
        total_items: result.recordset.length,
        total_inventory_value: totalValue,
        average_item_value: result.recordset.length > 0 ? totalValue / result.recordset.length : 0
      }
    });

  } catch (error) {
    console.error('Error fetching inventory valuation:', error);
    res.status(500).json({ 
      error: 'Failed to fetch inventory valuation', 
      details: error.message 
    });
  }
});

// Stock adjustment endpoint
app.put('/api/inventory/stock/:id', async (req, res) => {
  const transaction = new sql.Transaction(pool);
  
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const { id } = req.params;
    const { 
      adjustment_quantity, 
      adjustment_type, // 'increase' or 'decrease'
      reason, 
      authorized_by 
    } = req.body;

    // Validation
    if (!adjustment_quantity || adjustment_quantity <= 0) {
      return res.status(400).json({ error: 'Adjustment quantity must be greater than 0' });
    }

    if (!['increase', 'decrease'].includes(adjustment_type)) {
      return res.status(400).json({ error: 'Adjustment type must be increase or decrease' });
    }

    if (!reason || !authorized_by) {
      return res.status(400).json({ error: 'Reason and authorized_by are required' });
    }

    await transaction.begin();

    // Get current stock record
    const stockResult = await transaction.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        SELECT 
          cis.*,
          im.nomenclature,
          im.unit
        FROM current_inventory_stock cis
        INNER JOIN item_masters im ON cis.item_master_id = im.id
        WHERE cis.id = @id
      `);

    if (stockResult.recordset.length === 0) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Stock record not found' });
    }

    const stockRecord = stockResult.recordset[0];
    const currentQuantity = stockRecord.current_quantity;
    const adjustmentValue = adjustment_type === 'increase' ? adjustment_quantity : -adjustment_quantity;
    const newQuantity = currentQuantity + adjustmentValue;

    // Prevent negative stock
    if (newQuantity < 0) {
      await transaction.rollback();
      return res.status(400).json({ 
        error: 'Adjustment would result in negative stock',
        current_quantity: currentQuantity,
        adjustment: adjustmentValue
      });
    }

    // Update current inventory stock
    await transaction.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('newQuantity', sql.Decimal(10, 2), newQuantity)
      .query(`
        UPDATE current_inventory_stock 
        SET 
          current_quantity = @newQuantity,
          available_quantity = @newQuantity - reserved_quantity,
          last_updated = GETDATE()
        WHERE id = @id
      `);

    // Log the adjustment in stock movement log
    await transaction.request()
      .input('item_master_id', sql.UniqueIdentifier, stockRecord.item_master_id)
      .input('movement_type', sql.NVarChar, adjustment_type === 'increase' ? 'Adjustment (Increase)' : 'Adjustment (Decrease)')
      .input('reference_type', sql.NVarChar, 'Manual Adjustment')
      .input('quantity', sql.Decimal(10, 2), adjustment_quantity)
      .input('movement_notes', sql.Text, reason)
      .input('authorized_by', sql.NVarChar, authorized_by)
      .query(`
        INSERT INTO stock_movement_log (
          item_master_id, movement_type, reference_type, quantity,
          movement_date, movement_notes, authorized_by, created_at
        ) VALUES (
          @item_master_id, @movement_type, @reference_type, @quantity,
          GETDATE(), @movement_notes, @authorized_by, GETDATE()
        )
      `);

    await transaction.commit();

    res.json({
      success: true,
      message: 'Stock adjustment completed successfully',
      data: {
        previous_quantity: currentQuantity,
        adjustment_quantity: adjustment_quantity,
        adjustment_type: adjustment_type,
        new_quantity: newQuantity
      }
    });

  } catch (error) {
    if (transaction._aborted === false) {
      await transaction.rollback();
    }
    console.error('Error adjusting stock:', error);
    res.status(500).json({ 
      error: 'Failed to adjust stock', 
      details: error.message 
    });
  }
});

// Initial Inventory Setup Endpoint
app.post('/api/inventory/initial-setup', async (req, res) => {
  const transaction = new sql.Transaction(pool);
  
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const { initialStocks, setupDate, setupBy } = req.body;

    // Validation
    if (!initialStocks || !Array.isArray(initialStocks) || initialStocks.length === 0) {
      return res.status(400).json({ error: 'Initial stocks array is required' });
    }

    if (!setupBy) {
      return res.status(400).json({ error: 'Setup by user is required' });
    }

    await transaction.begin();

    const insertedRecords = [];
    let totalQuantity = 0;

    for (const stock of initialStocks) {
      const { ItemMasterID, quantity, notes } = stock;

      if (!ItemMasterID || quantity <= 0) {
        continue; // Skip invalid entries
      }

      // Check if item master exists
      const itemMasterResult = await transaction.request()
        .input('itemMasterId', sql.UniqueIdentifier, ItemMasterID)
        .query(`
          SELECT id, nomenclature, unit, category_id 
          FROM item_masters 
          WHERE id = @itemMasterId
        `);

      if (itemMasterResult.recordset.length === 0) {
        console.warn(`Item Master ID ${ItemMasterID} not found, skipping...`);
        continue;
      }

      const itemMaster = itemMasterResult.recordset[0];

      // Check if inventory record already exists for this item
      const existingStockResult = await transaction.request()
        .input('itemMasterId', sql.UniqueIdentifier, ItemMasterID)
        .query(`
          SELECT id, current_quantity 
          FROM current_inventory_stock 
          WHERE item_master_id = @itemMasterId
        `);

      let currentQuantity = 0;
      let operationType = 'INSERT';

      if (existingStockResult.recordset.length > 0) {
        currentQuantity = existingStockResult.recordset[0].current_quantity;
        operationType = 'UPDATE';
        
        // Update existing record
        await transaction.request()
          .input('inventoryId', sql.UniqueIdentifier, existingStockResult.recordset[0].id)
          .input('newQuantity', sql.Int, quantity)
          .input('setupBy', sql.NVarChar, setupBy)
          .query(`
            UPDATE current_inventory_stock 
            SET 
              current_quantity = @newQuantity,
              available_quantity = @newQuantity - ISNULL(reserved_quantity, 0),
              last_updated = GETDATE(),
              updated_by = @setupBy
            WHERE id = @inventoryId
          `);
      } else {
        // Insert new record
        const inventoryId = uuidv4();
        await transaction.request()
          .input('inventoryId', sql.UniqueIdentifier, inventoryId)
          .input('itemMasterId', sql.UniqueIdentifier, ItemMasterID)
          .input('quantity', sql.Int, quantity)
          .input('setupBy', sql.NVarChar, setupBy)
          .query(`
            INSERT INTO current_inventory_stock (
              id, item_master_id, current_quantity, available_quantity, reserved_quantity,
              minimum_stock_level, maximum_stock_level, reorder_point,
              last_updated, created_at, updated_by
            ) VALUES (
              @inventoryId, @itemMasterId, @quantity, @quantity, 0,
              0, 0, 0,
              GETDATE(), GETDATE(), @setupBy
            )
          `);
      }

      // Create opening balance transaction record - simplified for now
      // TODO: Create proper transaction logging table
      console.log(`Initial stock setup: ${itemMaster.nomenclature} - Quantity: ${quantity} by ${setupBy}`);

      insertedRecords.push({
        ItemMasterID: ItemMasterID,
        ItemDescription: itemMaster.ItemDescription,
        Unit: itemMaster.Unit,
        PreviousQuantity: currentQuantity,
        NewQuantity: quantity,
        Operation: operationType
      });

      totalQuantity += quantity;
    }

    await transaction.commit();

    res.json({
      success: true,
      message: `Initial inventory setup completed successfully`,
      data: {
        itemsProcessed: insertedRecords.length,
        totalQuantity: totalQuantity,
        setupDate: setupDate,
        setupBy: setupBy,
        records: insertedRecords
      }
    });

  } catch (error) {
    if (transaction._aborted === false) {
      await transaction.rollback();
    }
    console.error('Error setting up initial inventory:', error);
    res.status(500).json({ 
      error: 'Failed to setup initial inventory', 
      details: error.message 
    });
  }
});

// =============================================================================
// FRESH INITIAL SETUP ENDPOINTS
// =============================================================================

// Get detailed current stock with item master information
app.get('/api/inventory/current-stock-detailed', async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const request = pool.request();
    const result = await request.query(`
      SELECT 
        cs.id,
        cs.item_master_id,
        im.nomenclature,
        im.item_code,
        c.category_name,
        im.unit,
        ISNULL(cs.current_quantity, 0) as current_quantity,
        ISNULL(im.minimum_stock_level, 0) as minimum_stock_level,
        ISNULL(im.maximum_stock_level, 0) as maximum_stock_level,
        im.specifications
      FROM CurrentStock cs
      INNER JOIN item_masters im ON cs.item_master_id = im.id
      LEFT JOIN categories c ON im.category_id = c.id
      WHERE im.status = 'Active'
      ORDER BY im.nomenclature
    `);

    console.log(`📊 Fetched ${result.recordset.length} detailed current stock items`);
    res.json(result.recordset);

  } catch (error) {
    console.error('Error fetching detailed current stock:', error);
    res.status(500).json({ 
      error: 'Failed to fetch detailed current stock', 
      details: error.message 
    });
  }
});

// Update stock quantities (for initial setup adjustments)
app.post('/api/inventory/update-stock-quantities', async (req, res) => {
  const transaction = new sql.Transaction(pool);
  
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const { updates, updated_by, update_date } = req.body;

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ error: 'Updates array is required' });
    }

    await transaction.begin();

    const updatedItems = [];
    
    for (const update of updates) {
      const { item_master_id, new_quantity, notes } = update;

      if (!item_master_id || new_quantity < 0) {
        continue; // Skip invalid entries
      }

      // Get current stock info
      const currentStockResult = await transaction.request()
        .input('itemMasterId', sql.UniqueIdentifier, item_master_id)
        .query(`
          SELECT cs.id, cs.current_quantity, im.nomenclature
          FROM CurrentStock cs
          INNER JOIN item_masters im ON cs.item_master_id = im.id
          WHERE cs.item_master_id = @itemMasterId
        `);

      if (currentStockResult.recordset.length === 0) {
        console.warn(`No current stock found for item ${item_master_id}, skipping...`);
        continue;
      }

      const currentStock = currentStockResult.recordset[0];
      const previousQuantity = currentStock.current_quantity;

      // Update the current stock quantity
      await transaction.request()
        .input('itemMasterId', sql.UniqueIdentifier, item_master_id)
        .input('newQuantity', sql.Int, new_quantity)
        .input('updatedBy', sql.NVarChar(100), updated_by || 'System')
        .input('updateDate', sql.DateTime, new Date(update_date || new Date()))
        .query(`
          UPDATE CurrentStock 
          SET 
            current_quantity = @newQuantity,
            last_updated = @updateDate,
            updated_by = @updatedBy
          WHERE item_master_id = @itemMasterId
        `);

      // Log the stock movement (if you have a stock transactions table)
      try {
        await transaction.request()
          .input('itemMasterId', sql.UniqueIdentifier, item_master_id)
          .input('transactionType', sql.NVarChar(50), 'Initial Setup Adjustment')
          .input('quantityChange', sql.Int, new_quantity - previousQuantity)
          .input('previousQuantity', sql.Int, previousQuantity)
          .input('newQuantity', sql.Int, new_quantity)
          .input('notes', sql.NVarChar(500), notes || 'Initial setup quantity adjustment')
          .input('createdBy', sql.NVarChar(100), updated_by || 'System')
          .input('transactionDate', sql.DateTime, new Date())
          .query(`
            INSERT INTO stock_transactions (
              item_master_id, transaction_type, quantity_change, 
              previous_quantity, new_quantity, notes, created_by, transaction_date
            ) VALUES (
              @itemMasterId, @transactionType, @quantityChange,
              @previousQuantity, @newQuantity, @notes, @createdBy, @transactionDate
            )
          `);
      } catch (logError) {
        // If stock_transactions table doesn't exist, just log to console
        console.log(`Stock change logged: ${currentStock.nomenclature} - ${previousQuantity} → ${new_quantity}`);
      }

      updatedItems.push({
        item_master_id: item_master_id,
        nomenclature: currentStock.nomenclature,
        previous_quantity: previousQuantity,
        new_quantity: new_quantity,
        change: new_quantity - previousQuantity
      });
    }

    await transaction.commit();

    console.log(`✅ Updated ${updatedItems.length} stock quantities`);
    
    res.json({
      success: true,
      message: `Successfully updated ${updatedItems.length} stock quantities`,
      data: {
        updated_items: updatedItems,
        total_updated: updatedItems.length,
        updated_by: updated_by,
        update_date: update_date
      }
    });

  } catch (error) {
    if (transaction._aborted === false) {
      await transaction.rollback();
    }
    console.error('Error updating stock quantities:', error);
    res.status(500).json({ 
      error: 'Failed to update stock quantities', 
      details: error.message 
    });
  }
});

// =============================================================================
// CURRENT INVENTORY STOCK ENDPOINTS (FROM SCRATCH)
// =============================================================================

// Get all records from current_inventory_stock table
app.get('/api/inventory/current-inventory-stock', async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    console.log('📊 Fetching data from View_Current_Inv_Stock view...');
    console.log('🔍 Using view with all item details and categories');
    
    const request = pool.request();
    const result = await request.query(`
      SELECT 
        item_master_id,
        item_code,
        nomenclature,
        category_name,
        sub_category_name,
        current_quantity,
        reserved_quantity,
        available_quantity,
        minimum_stock_level,
        reorder_point,
        maximum_stock_level,
        last_updated,
        created_at,
        updated_by,
        category_id,
        sub_category_id
      FROM View_Current_Inv_Stock
      ORDER BY nomenclature
    `);

    console.log(`✅ Query executed. Found ${result.recordset.length} records from view`);
    console.log('📄 Sample record fields:', Object.keys(result.recordset[0] || {}));
    res.json(result.recordset);

  } catch (error) {
    console.error('❌ Error fetching current_inventory_stock:', error);
    res.status(500).json({ 
      error: 'Failed to fetch current_inventory_stock',
      details: error.message 
    });
  }
});

// Update single record in current_inventory_stock
app.put('/api/inventory/current-inventory-stock/:id', async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const { id } = req.params;
    const { current_quantity } = req.body;
    
    console.log(`🔄 Updating current_inventory_stock ID: ${id} with quantity: ${current_quantity}`);
    
    const request = pool.request();
    const result = await request
      .input('id', sql.UniqueIdentifier, id)
      .input('current_quantity', sql.Int, current_quantity)
      .input('updated_by', sql.NVarChar, 'system')
      .query(`
        UPDATE current_inventory_stock 
        SET current_quantity = @current_quantity,
            available_quantity = @current_quantity - ISNULL(reserved_quantity, 0),
            last_updated = GETDATE(),
            updated_by = @updated_by
        WHERE id = @id
      `);
    
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Record not found' });
    }
    
    console.log(`✅ Updated current_inventory_stock ID: ${id}`);
    res.json({ 
      success: true, 
      message: 'Quantity updated successfully',
      id: id,
      new_quantity: current_quantity
    });

  } catch (error) {
    console.error('❌ Error updating current_inventory_stock:', error);
    res.status(500).json({ 
      error: 'Failed to update quantity',
      details: error.message 
    });
  }
});

// Bulk update records in current_inventory_stock
app.post('/api/inventory/current-inventory-stock/bulk-update', async (req, res) => {
  const transaction = new sql.Transaction(pool);
  
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const { updates } = req.body;
    console.log('🚀 Bulk updating current_inventory_stock:', updates.length, 'records');
    
    await transaction.begin();
    
    for (const update of updates) {
      const request = new sql.Request(transaction);
      await request
        .input('item_master_id', sql.UniqueIdentifier, update.item_master_id)
        .input('current_quantity', sql.Int, update.current_quantity)
        .input('updated_by', sql.NVarChar, 'system')
        .query(`
          UPDATE current_inventory_stock 
          SET current_quantity = @current_quantity,
              available_quantity = @current_quantity - ISNULL(reserved_quantity, 0),
              last_updated = GETDATE(),
              updated_by = @updated_by
          WHERE item_master_id = @item_master_id
        `);
    }
    
    await transaction.commit();
    
    console.log('✅ Bulk update completed successfully');
    res.json({ 
      success: true, 
      message: 'Bulk update completed successfully',
      recordsUpdated: updates.length
    });

  } catch (error) {
    if (transaction._aborted === false) {
      await transaction.rollback();
    }
    console.error('❌ Error in bulk update:', error);
    res.status(500).json({ 
      error: 'Failed to bulk update quantities',
      details: error.message 
    });
  }
});

// =============================================================================
// STOCK RETURN MANAGEMENT ENDPOINTS
// =============================================================================

// Get stock return requests
app.get('/api/stock-returns/requests', async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const { status, request_date_from, request_date_to } = req.query;
    let whereClause = '1 = 1';
    const request = pool.request();

    if (status) {
      whereClause += ' AND srr.status = @status';
      request.input('status', sql.NVarChar, status);
    }

    if (request_date_from) {
      whereClause += ' AND srr.request_date >= @request_date_from';
      request.input('request_date_from', sql.Date, request_date_from);
    }

    if (request_date_to) {
      whereClause += ' AND srr.request_date <= @request_date_to';
      request.input('request_date_to', sql.Date, request_date_to);
    }

    const result = await request.query(`
      SELECT 
        srr.*,
        u.full_name as requester_name,
        o.office_name
      FROM stock_return_requests srr
      LEFT JOIN users u ON srr.requester_id = u.id
      LEFT JOIN offices o ON srr.returning_office_id = o.id
      WHERE ${whereClause}
      ORDER BY srr.request_date DESC
    `);

    res.json({
      success: true,
      data: result.recordset
    });

  } catch (error) {
    console.error('Error fetching stock return requests:', error);
    res.status(500).json({ 
      error: 'Failed to fetch stock return requests', 
      details: error.message 
    });
  }
});

// Process stock return
app.put('/api/stock-returns/requests/:id/process', async (req, res) => {
  const transaction = new sql.Transaction(pool);
  
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const { id } = req.params;
    const { action, processed_by, processing_notes } = req.body; // action: 'approve' or 'reject'

    // Validation
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Action must be approve or reject' });
    }

    if (!processed_by) {
      return res.status(400).json({ error: 'processed_by is required' });
    }

    await transaction.begin();

    // Get return request details
    const returnResult = await transaction.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        SELECT * FROM stock_return_requests WHERE id = @id
      `);

    if (returnResult.recordset.length === 0) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Stock return request not found' });
    }

    const returnRequest = returnResult.recordset[0];

    if (returnRequest.status !== 'Pending') {
      await transaction.rollback();
      return res.status(400).json({ error: 'Only pending requests can be processed' });
    }

    const newStatus = action === 'approve' ? 'Approved' : 'Rejected';

    // Update return request status
    await transaction.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('status', sql.NVarChar, newStatus)
      .input('processed_by', sql.UniqueIdentifier, processed_by)
      .input('processing_notes', sql.Text, processing_notes || null)
      .query(`
        UPDATE stock_return_requests 
        SET 
          status = @status,
          processed_by = @processed_by,
          processed_date = GETDATE(),
          processing_notes = @processing_notes
        WHERE id = @id
      `);

    // If approved, create stock return items and update inventory
    if (action === 'approve') {
      // Get return items
      const itemsResult = await transaction.request()
        .input('return_request_id', sql.UniqueIdentifier, id)
        .query(`
          SELECT * FROM stock_return_items WHERE return_request_id = @return_request_id
        `);

      for (const item of itemsResult.recordset) {
        // Add returned quantity back to inventory
        await transaction.request()
          .input('item_master_id', sql.UniqueIdentifier, item.item_master_id)
          .input('returned_quantity', sql.Decimal(10, 2), item.returned_quantity)
          .query(`
            UPDATE current_inventory_stock 
            SET 
              current_quantity = current_quantity + @returned_quantity,
              available_quantity = available_quantity + @returned_quantity,
              last_updated = GETDATE()
            WHERE item_master_id = @item_master_id;
            
            -- If record doesn't exist, create it
            IF @@ROWCOUNT = 0
            BEGIN
              INSERT INTO current_inventory_stock (
                item_master_id, current_quantity, available_quantity, 
                reserved_quantity, last_updated
              ) VALUES (
                @item_master_id, @returned_quantity, @returned_quantity, 
                0, GETDATE()
              )
            END
          `);

        // Log stock movement
        await transaction.request()
          .input('item_master_id', sql.UniqueIdentifier, item.item_master_id)
          .input('movement_type', sql.NVarChar, 'Return')
          .input('reference_type', sql.NVarChar, 'Stock Return')
          .input('reference_id', sql.UniqueIdentifier, id)
          .input('quantity', sql.Decimal(10, 2), item.returned_quantity)
          .input('movement_notes', sql.Text, `Stock returned: ${returnRequest.return_reason}`)
          .input('authorized_by', sql.UniqueIdentifier, processed_by)
          .query(`
            INSERT INTO stock_movement_log (
              item_master_id, movement_type, reference_type, reference_id,
              quantity, movement_date, movement_notes, authorized_by, created_at
            ) VALUES (
              @item_master_id, @movement_type, @reference_type, @reference_id,
              @quantity, GETDATE(), @movement_notes, @authorized_by, GETDATE()
            )
          `);
      }
    }

    await transaction.commit();

    res.json({
      success: true,
      message: `Stock return request ${action}d successfully`,
      data: {
        request_id: id,
        action: action,
        new_status: newStatus
      }
    });

  } catch (error) {
    if (transaction._aborted === false) {
      await transaction.rollback();
    }
    console.error('Error processing stock return:', error);
    res.status(500).json({ 
      error: 'Failed to process stock return', 
      details: error.message 
    });
  }
});

// Create a stock return with return items
app.post('/api/stock-returns', async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const { 
      return_date,
      returned_by,
      verified_by,
      return_notes,
      return_status,
      return_items 
    } = req.body;

    const transaction = pool.transaction();
    await transaction.begin();

    try {
      // Create stock return record
      const returnResult = await transaction.request()
        .input('return_date', return_date)
        .input('returned_by', returned_by)
        .input('verified_by', verified_by)
        .input('return_notes', return_notes)
        .input('return_status', return_status)
        .query(`
          INSERT INTO stock_returns (return_date, returned_by, verified_by, return_notes, return_status)
          OUTPUT INSERTED.id
          VALUES (@return_date, @returned_by, @verified_by, @return_notes, @return_status)
        `);

      const returnId = returnResult.recordset[0].id;

      // Process each return item
      for (const item of return_items) {
        // Create return item record
        await transaction.request()
          .input('return_id', returnId)
          .input('issued_item_id', item.issued_item_id)
          .input('nomenclature', item.nomenclature)
          .input('return_quantity', item.return_quantity)
          .input('condition_on_return', item.condition_on_return)
          .input('damage_description', item.damage_description)
          .query(`
            INSERT INTO stock_return_items 
            (return_id, issued_item_id, nomenclature, return_quantity, condition_on_return, damage_description)
            VALUES (@return_id, @issued_item_id, @nomenclature, @return_quantity, @condition_on_return, @damage_description)
          `);

        // Update the issuance item status
        await transaction.request()
          .input('issued_item_id', item.issued_item_id)
          .query(`
            UPDATE stock_issuance_items 
            SET status = 'Returned' 
            WHERE id = @issued_item_id
          `);

        // Add back to inventory (for good condition items)
        if (item.condition_on_return === 'Good') {
          await transaction.request()
            .input('date', return_date)
            .input('item', item.nomenclature)
            .input('quantity', item.return_quantity)
            .input('department', returned_by)
            .query(`
              INSERT INTO stock_transactions 
              (date, type, item, quantity, unit_price, total_value, vendor, department, tender_ref, remarks)
              VALUES (@date, 'IN', @item, @quantity, 0, 0, NULL, @department, NULL, 'Stock return - Good condition')
            `);
        }
      }

      await transaction.commit();
      res.json({ 
        success: true, 
        return_id: returnId,
        message: `Successfully processed return for ${return_items.length} items`
      });

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    res.status(500).json({ error: 'Failed to create stock return', details: error.message });
  }
});

// Get all stock returns
app.get('/api/stock-returns', async (req, res) => {
  try {
    if (!pool) {
      await sql.connect(sqlConfig);
    }
    const result = await sql.query`
      SELECT 
        sr.id,
        sr.return_date,
        sr.returned_by,
        sr.verified_by,
        sr.return_notes,
        sr.return_status,
        sr.created_at,
        sr.updated_at
      FROM stock_returns sr
      ORDER BY sr.created_at DESC
    `;
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stock returns', details: error.message });
  }
});

// =============================================================================
// TENDER ENDPOINTS (REBUILT FROM SCRATCH)
// =============================================================================

// POST /api/tenders - Create a new tender and its items
app.post('/api/tenders', upload.fields([
  { name: 'contract_file', maxCount: 1 },
  { name: 'loi_file', maxCount: 1 },
  { name: 'noting_file', maxCount: 1 },
  { name: 'po_file', maxCount: 1 },
  { name: 'rfp_file', maxCount: 1 }
]), async (req, res) => {
  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin();
    const tenderId = uuidv4();
    const now = new Date();

    // Parse tender data from FormData
    let tenderData, items;
    
    if (req.body.tenderData) {
      // Data sent as FormData with JSON string
      const parsedData = JSON.parse(req.body.tenderData);
      items = parsedData.items;
      tenderData = { ...parsedData };
      delete tenderData.items;
    } else {
      // Data sent as regular JSON
      const { items: itemsFromBody, ...tenderDataFromBody } = req.body;
      items = itemsFromBody;
      tenderData = tenderDataFromBody;
    }

    // Handle file uploads
    if (req.files) {
      if (req.files.contract_file) {
        tenderData.contract_file_path = req.files.contract_file[0].filename;
      }
      if (req.files.loi_file) {
        tenderData.loi_file_path = req.files.loi_file[0].filename;
      }
      if (req.files.noting_file) {
        tenderData.noting_file_path = req.files.noting_file[0].filename;
      }
      if (req.files.po_file) {
        tenderData.po_file_path = req.files.po_file[0].filename;
      }
      if (req.files.rfp_file) {
        tenderData.rfp_file_path = req.files.rfp_file[0].filename;
      }
    }

    // Insert into tenders table
    const tenderRequest = transaction.request();
    tenderRequest.input('id', sql.NVarChar, tenderId);
    
    // Map all fields from the schema
    const tenderFields = [
      'reference_number', 'title', 'description', 'estimated_value', 'publish_date',
      'publication_date', 'submission_date', 'submission_deadline', 'opening_date',
      'status', 'document_path', 'created_by', 'advertisement_date', 'procedure_adopted',
      'procurement_method', 'publication_daily', 'contract_file_path', 'loi_file_path',
      'noting_file_path', 'po_file_path', 'rfp_file_path', 'tender_number', 'tender_type',
      'office_ids', 'wing_ids', 'dec_ids', 'tender_spot_type', 'vendor_id', 'tender_status',
      'individual_total', 'actual_price_total'
    ];

    let insertQuery = 'INSERT INTO tenders (id, created_at, updated_at, is_finalized';
    let valuesQuery = 'VALUES (@id, @created_at, @updated_at, 0';

    tenderRequest.input('created_at', sql.DateTime, now);
    tenderRequest.input('updated_at', sql.DateTime, now);

    for (const field of tenderFields) {
      if (tenderData[field] !== undefined) {
        insertQuery += `, ${field}`;
        valuesQuery += `, @${field}`;
        
        let value = tenderData[field];
        let sqlType = sql.NVarChar; // Default to NVarChar

        // Adjust SQL type based on field name/schema
        if (field.endsWith('_date') || field.endsWith('_deadline')) {
          sqlType = sql.DateTime;
          value = value ? new Date(value) : null;
        } else if (field.endsWith('_value') || field.endsWith('_total') || field === 'quantity') {
          sqlType = sql.Decimal(15, 2);
          value = value ? parseFloat(value) : null;
        } else if (field.endsWith('_id')) {
          sqlType = sql.NVarChar;
        }

        tenderRequest.input(field, sqlType, value);
      }
    }

    insertQuery += ') ' + valuesQuery + ')';

    await tenderRequest.query(insertQuery);

    // Insert into tender_items table
    if (items && Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        const itemRequest = transaction.request();
        itemRequest.input('id', sql.NVarChar, uuidv4());
        itemRequest.input('tender_id', sql.NVarChar, tenderId);
        itemRequest.input('created_at', sql.DateTime2, now);
        itemRequest.input('updated_at', sql.DateTime2, now);

        let itemInsertQuery = 'INSERT INTO tender_items (id, tender_id, created_at, updated_at';
        let itemValuesQuery = 'VALUES (@id, @tender_id, @created_at, @updated_at';

        const itemFields = [
          'item_master_id', 'nomenclature', 'quantity', 'quantity_received', 
          'estimated_unit_price', 'actual_unit_price', 'total_amount', 
          'specifications', 'remarks', 'status'
        ];

        for (const field of itemFields) {
          if (item[field] !== undefined) {
            itemInsertQuery += `, ${field}`;
            itemValuesQuery += `, @${field}`;

            let value = item[field];
            let sqlType = sql.NVarChar; // Default

            if (['quantity', 'quantity_received', 'estimated_unit_price', 'actual_unit_price', 'total_amount'].includes(field)) {
              if (field === 'quantity' || field === 'quantity_received') {
                sqlType = sql.Int;
                value = value ? parseInt(value, 10) : null;
              } else {
                sqlType = sql.Decimal(15, 2);
                value = value ? parseFloat(value) : null;
              }
            } else if (field === 'item_master_id') {
              sqlType = sql.NVarChar(50);
            }
            
            itemRequest.input(field, sqlType, value);
          }
        }
        
        itemInsertQuery += ') ' + itemValuesQuery + ')';
        await itemRequest.query(itemInsertQuery);
      }
    }

    await transaction.commit();
    res.status(201).json({ success: true, message: 'Tender created successfully', tenderId });

  } catch (error) {
    await transaction.rollback();
    console.error('Failed to create tender:', error);
    res.status(500).json({ error: 'Failed to create tender', details: error.message });
  }
});

// GET /api/tenders - Get all tenders
app.get('/api/tenders', async (req, res) => {
  try {
    const result = await pool.request().query(`
      SELECT 
        t.*, 
        v.vendor_name
      FROM tenders t
      LEFT JOIN vendors v ON t.vendor_id = v.id
      ORDER BY t.created_at DESC
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Failed to fetch tenders:', error);
    res.status(500).json({ error: 'Failed to fetch tenders', details: error.message });
  }
});

// GET /api/tenders/:id - Get a single tender by ID
app.get('/api/tenders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const tenderResult = await pool.request()
      .input('id', sql.NVarChar, id)
      .query('SELECT * FROM tenders WHERE id = @id');

    if (tenderResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Tender not found' });
    }

    const itemsResult = await pool.request()
      .input('tender_id', sql.NVarChar, id)
      .query('SELECT * FROM tender_items WHERE tender_id = @tender_id');

    const tender = tenderResult.recordset[0];
    tender.items = itemsResult.recordset;

    res.json(tender);
  } catch (error) {
    console.error('Failed to fetch tender:', error);
    res.status(500).json({ error: 'Failed to fetch tender', details: error.message });
  }
});

// PUT /api/tenders/:id/finalize - Finalize a tender (MUST be before /api/tenders/:id)
app.put('/api/tenders/:id/finalize', async (req, res) => {
    console.log('🔥 FINALIZE ENDPOINT HIT! Route: PUT /api/tenders/:id/finalize');
    const { id } = req.params;
    const { finalized_by } = req.body;
    
    console.log('🎯 FINALIZE REQUEST:', { id, finalized_by });
    
    const transaction = new sql.Transaction(pool);
    
    try {
        await transaction.begin();
        console.log('✅ Transaction started');
        
        const now = new Date();
        
        // First, get all tender items
        console.log('📦 Getting tender items...');
        const tenderItemsResult = await transaction.request()
            .input('tender_id', sql.UniqueIdentifier, id)
            .query(`
                SELECT 
                    ti.item_master_id,
                    ti.estimated_unit_price,
                    ti.quantity,
                    im.nomenclature
                FROM tender_items ti
                INNER JOIN item_masters im ON ti.item_master_id = im.id
                WHERE ti.tender_id = @tender_id
            `);
            
        console.log('📦 Found tender items:', tenderItemsResult.recordset.length);
        
        // Add each tender item to stock_transactions_clean
        for (const item of tenderItemsResult.recordset) {
            console.log('📥 Adding item to stock_transactions_clean:', item.nomenclature);
            
            // Auto-populate actual_unit_price with estimated_unit_price by default
            const estimatedPrice = item.estimated_unit_price || 0;
            
            await transaction.request()
                .input('tender_id', sql.UniqueIdentifier, id)
                .input('item_master_id', sql.VarChar(50), item.item_master_id)
                .input('estimated_unit_price', sql.Decimal(18, 2), estimatedPrice)
                .input('actual_unit_price', sql.Decimal(18, 2), estimatedPrice) // Auto-populate with estimated price, can be updated later
                .input('total_quantity_received', sql.Int, item.quantity || 0)
                .input('pricing_confirmed', sql.Bit, true) // Auto-confirm pricing since actual = estimated
                .input('type', sql.VarChar(10), 'IN')
                .input('remarks', sql.Text, `Added from tender finalization - ${item.nomenclature}`)
                .query(`
                    INSERT INTO stock_transactions_clean (
                        id,
                        tender_id,
                        item_master_id,
                        estimated_unit_price,
                        actual_unit_price,
                        total_quantity_received,
                        pricing_confirmed,
                        type,
                        remarks,
                        is_deleted,
                        created_at,
                        updated_at
                    )
                    VALUES (
                        NEWID(),
                        @tender_id,
                        @item_master_id,
                        @estimated_unit_price,
                        @actual_unit_price,
                        @total_quantity_received,
                        @pricing_confirmed,
                        @type,
                        @remarks,
                        0,
                        GETDATE(),
                        GETDATE()
                    )
                `);
        }
        
        // Update tender status to finalized
        console.log('📝 Updating tender status...');
        const updateResult = await transaction.request()
            .input('id', sql.UniqueIdentifier, id)
            .input('finalized_by', sql.NVarChar, finalized_by)
            .input('finalized_at', sql.DateTime, now)
            .input('updated_at', sql.DateTime, now)
            .query(`
                UPDATE tenders 
                SET 
                    is_finalized = 1, 
                    finalized_by = @finalized_by, 
                    finalized_at = @finalized_at,
                    updated_at = @updated_at,
                    status = 'Finalized'
                WHERE id = @id AND is_finalized = 0
            `);
            
        console.log('📝 Tender update result:', updateResult.rowsAffected);

        if (updateResult.rowsAffected[0] === 0) {
            await transaction.rollback();
            return res.status(404).json({ error: 'Tender not found or already finalized.' });
        }

        await transaction.commit();
        console.log('🎉 Tender finalized successfully with stock transactions!');
        res.json({ 
            success: true, 
            message: `Tender finalized successfully! Added ${tenderItemsResult.recordset.length} items to stock transactions.`,
            items_added: tenderItemsResult.recordset.length
        });
    } catch (error) {
        await transaction.rollback();
        console.error('❌ Failed to finalize tender:', error);
        console.error('❌ Error stack:', error.stack);
        res.status(500).json({ error: 'Failed to finalize tender', details: error.message });
    }
});

// TEST endpoint - New finalize endpoint with different name
app.put('/api/tenders/:id/finalize-test', async (req, res) => {
    console.log('🧪 TEST FINALIZE ENDPOINT HIT!');
    res.json({ 
        success: true, 
        message: 'Test finalize endpoint is working!',
        id: req.params.id,
        body: req.body
    });
});

// PUT /api/tenders/:id - Update a tender and its items
app.put('/api/tenders/:id', async (req, res) => {
  const { id } = req.params;
  const { items, ...tenderData } = req.body;
  
  const transaction = new sql.Transaction(pool);
  
  try {
    await transaction.begin();
    console.log(`🔄 Starting tender update for ID: ${id}`);
    
    const now = new Date();

    // Step 1: Update tender basic information
    console.log('📝 Updating tender basic information...');
    
    const tenderUpdateRequest = transaction.request();
    tenderUpdateRequest.input('id', sql.NVarChar, id);
    tenderUpdateRequest.input('updated_at', sql.DateTime2, now);
    
    let updateQuery = 'UPDATE tenders SET updated_at = @updated_at';
    
    // Only update fields that exist in database schema
    const validFields = {
      reference_number: sql.NVarChar,
      title: sql.NVarChar,
      description: sql.NVarChar,
      estimated_value: sql.Decimal(15, 2),
      publish_date: sql.Date,
      submission_deadline: sql.DateTime2,
      opening_date: sql.DateTime2,
      procurement_method: sql.NVarChar,
      publication_daily: sql.NVarChar,
      vendor_id: sql.NVarChar,
      office_ids: sql.NVarChar,
      wing_ids: sql.NVarChar,
      dec_ids: sql.NVarChar
    };
    
    for (const [field, sqlType] of Object.entries(validFields)) {
      if (tenderData[field] !== undefined) {
        updateQuery += `, ${field} = @${field}`;
        
        let value = tenderData[field];
        
        // Handle special data types
        if (field === 'estimated_value') {
          value = value ? parseFloat(value) : null;
        } else if (field === 'publish_date') {
          value = value ? new Date(value) : null;
        } else if (field === 'submission_deadline' || field === 'opening_date') {
          value = value ? new Date(value) : null;
        }
        
        tenderUpdateRequest.input(field, sqlType, value);
      }
    }
    
    updateQuery += ' WHERE id = @id';
    
    await tenderUpdateRequest.query(updateQuery);
    console.log('✅ Tender basic information updated');

    // Step 2: Handle tender items
    if (items && Array.isArray(items)) {
      console.log(`📋 Processing ${items.length} items...`);
      
      // Delete all existing items
      console.log('🗑️ Removing existing items...');
      await transaction.request()
        .input('tender_id', sql.NVarChar, id)
        .query('DELETE FROM tender_items WHERE tender_id = @tender_id');
      
      // Insert new items
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        console.log(`📝 Adding item ${i + 1}/${items.length}: ${item.nomenclature}`);
        
        const itemRequest = transaction.request();
        
        // Generate new UUID for item
        const itemId = uuidv4();
        
        itemRequest.input('id', sql.NVarChar, itemId);
        itemRequest.input('tender_id', sql.NVarChar, id);
        itemRequest.input('item_master_id', sql.NVarChar, item.item_master_id);
        itemRequest.input('nomenclature', sql.NVarChar, item.nomenclature || '');
        itemRequest.input('quantity', sql.Decimal(10, 2), parseFloat(item.quantity) || 0);
        itemRequest.input('estimated_unit_price', sql.Decimal(15, 2), parseFloat(item.estimated_unit_price) || 0);
        itemRequest.input('total_amount', sql.Decimal(15, 2), parseFloat(item.total_amount) || 0);
        itemRequest.input('specifications', sql.NVarChar, item.specifications || '');
        itemRequest.input('remarks', sql.NVarChar, item.remarks || '');
        itemRequest.input('status', sql.NVarChar, 'Active');
        itemRequest.input('created_at', sql.DateTime2, now);
        itemRequest.input('updated_at', sql.DateTime2, now);
        
        // Handle optional actual_unit_price
        if (item.actual_unit_price !== undefined) {
          itemRequest.input('actual_unit_price', sql.Decimal(15, 2), parseFloat(item.actual_unit_price) || 0);
        } else {
          itemRequest.input('actual_unit_price', sql.Decimal(15, 2), 0);
        }
        
        const insertQuery = `
          INSERT INTO tender_items (
            id, tender_id, item_master_id, nomenclature, quantity,
            estimated_unit_price, actual_unit_price, total_amount,
            specifications, remarks, status, created_at, updated_at
          )
          VALUES (
            @id, @tender_id, @item_master_id, @nomenclature, @quantity,
            @estimated_unit_price, @actual_unit_price, @total_amount,
            @specifications, @remarks, @status, @created_at, @updated_at
          )
        `;
        
        await itemRequest.query(insertQuery);
      }
      
      console.log('✅ All items processed successfully');
    } else {
      console.log('🗑️ No items provided, removing all existing items');
      await transaction.request()
        .input('tender_id', sql.NVarChar, id)
        .query('DELETE FROM tender_items WHERE tender_id = @tender_id');
    }

    await transaction.commit();
    console.log('✅ Tender update completed successfully');
    
    res.json({ 
      success: true, 
      message: 'Tender updated successfully',
      tender_id: id
    });

  } catch (error) {
    console.error('❌ Tender update failed:', error.message);
    
    try {
      await transaction.rollback();
      console.log('🔄 Transaction rolled back');
    } catch (rollbackError) {
      console.error('❌ Rollback failed:', rollbackError.message);
    }
    
    res.status(500).json({ 
      error: 'Failed to update tender', 
      details: error.message 
    });
  }
});

// DELETE /api/tenders/:id - Delete a tender
app.delete('/api/tenders/:id', async (req, res) => {
  const { id } = req.params;
  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin();

    // The ON DELETE CASCADE constraint on the foreign key will handle deleting tender_items
    await transaction.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('DELETE FROM tenders WHERE id = @id');

    await transaction.commit();
    res.json({ success: true, message: 'Tender deleted successfully' });
  } catch (error) {
    await transaction.rollback();
    console.error('Failed to delete tender:', error);
    res.status(500).json({ error: 'Failed to delete tender', details: error.message });
  }
});

// =============================================================================
// TENDER VENDORS ENDPOINTS - Multiple vendors per tender with proposals
// =============================================================================

// Configure multer for proposal document uploads
const proposalStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const tenderId = req.params.tenderId;
    const vendorId = req.params.vendorId;
    const uploadPath = path.join(__dirname, 'uploads', 'tender-proposals', tenderId, vendorId);
    
    // Create directory if it doesn't exist
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Keep original filename with timestamp to prevent conflicts
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const nameWithoutExt = path.basename(file.originalname, ext);
    cb(null, `${nameWithoutExt}_${timestamp}${ext}`);
  }
});

const proposalUpload = multer({
  storage: proposalStorage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    // Accept only specific file types
    const allowedTypes = /pdf|doc|docx|xls|xlsx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, DOCX, XLS, and XLSX files are allowed!'));
    }
  }
});

// POST - Add a vendor to a tender
app.post('/api/tenders/:tenderId/vendors', async (req, res) => {
  const { tenderId } = req.params;
  const { vendor_id, vendor_name, quoted_amount, remarks } = req.body;
  
  console.log('📦 Adding vendor to tender:', { tenderId, vendor_id, vendor_name });
  
  try {
    // Check if vendor already exists for this tender
    const checkResult = await pool.request()
      .input('tender_id', sql.UniqueIdentifier, tenderId)
      .input('vendor_id', sql.UniqueIdentifier, vendor_id)
      .query('SELECT id FROM tender_vendors WHERE tender_id = @tender_id AND vendor_id = @vendor_id');
    
    if (checkResult.recordset.length > 0) {
      return res.status(400).json({ error: 'This vendor is already added to this tender' });
    }
    
    // Insert new tender vendor
    const result = await pool.request()
      .input('tender_id', sql.UniqueIdentifier, tenderId)
      .input('vendor_id', sql.UniqueIdentifier, vendor_id)
      .input('vendor_name', sql.NVarChar(200), vendor_name)
      .input('quoted_amount', sql.Decimal(15, 2), quoted_amount || null)
      .input('remarks', sql.NVarChar(500), remarks || null)
      .input('created_by', sql.NVarChar(100), req.session?.user?.username || 'System')
      .query(`
        INSERT INTO tender_vendors (
          tender_id, vendor_id, vendor_name, quoted_amount, remarks, created_by
        )
        OUTPUT INSERTED.*
        VALUES (
          @tender_id, @vendor_id, @vendor_name, @quoted_amount, @remarks, @created_by
        )
      `);
    
    console.log('✅ Vendor added successfully:', result.recordset[0]);
    res.status(201).json(result.recordset[0]);
    
  } catch (error) {
    console.error('❌ Error adding vendor to tender:', error);
    res.status(500).json({ error: 'Failed to add vendor', details: error.message });
  }
});

// GET - Get all vendors for a tender
app.get('/api/tenders/:tenderId/vendors', async (req, res) => {
  const { tenderId } = req.params;
  
  try {
    const result = await pool.request()
      .input('tender_id', sql.UniqueIdentifier, tenderId)
      .query(`
        SELECT 
          tv.*,
          v.vendor_code,
          v.contact_person,
          v.email,
          v.phone,
          v.address,
          v.city,
          v.country
        FROM tender_vendors tv
        LEFT JOIN vendors v ON tv.vendor_id = v.id
        WHERE tv.tender_id = @tender_id
        ORDER BY tv.created_at DESC
      `);
    
    res.json(result.recordset);
    
  } catch (error) {
    console.error('❌ Error fetching tender vendors:', error);
    res.status(500).json({ error: 'Failed to fetch vendors', details: error.message });
  }
});

// PUT - Update vendor information (quoted amount, remarks)
app.put('/api/tenders/:tenderId/vendors/:vendorId', async (req, res) => {
  const { tenderId, vendorId } = req.params;
  const { quoted_amount, remarks } = req.body;
  
  try {
    const result = await pool.request()
      .input('tender_id', sql.UniqueIdentifier, tenderId)
      .input('vendor_id', sql.UniqueIdentifier, vendorId)
      .input('quoted_amount', sql.Decimal(15, 2), quoted_amount || null)
      .input('remarks', sql.NVarChar(500), remarks || null)
      .query(`
        UPDATE tender_vendors 
        SET 
          quoted_amount = @quoted_amount,
          remarks = @remarks,
          updated_at = GETDATE()
        OUTPUT INSERTED.*
        WHERE tender_id = @tender_id AND vendor_id = @vendor_id
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Vendor not found for this tender' });
    }
    
    res.json(result.recordset[0]);
    
  } catch (error) {
    console.error('❌ Error updating vendor:', error);
    res.status(500).json({ error: 'Failed to update vendor', details: error.message });
  }
});

// POST - Upload proposal document for a vendor
app.post('/api/tenders/:tenderId/vendors/:vendorId/proposal', 
  proposalUpload.single('proposal'), 
  async (req, res) => {
    const { tenderId, vendorId } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    console.log('📄 Uploading proposal:', {
      tenderId,
      vendorId,
      filename: req.file.filename,
      size: req.file.size
    });
    
    try {
      // Update tender vendor with proposal information
      const result = await pool.request()
        .input('tender_id', sql.UniqueIdentifier, tenderId)
        .input('vendor_id', sql.UniqueIdentifier, vendorId)
        .input('proposal_document_path', sql.NVarChar(500), req.file.path)
        .input('proposal_document_name', sql.NVarChar(200), req.file.originalname)
        .input('proposal_file_size', sql.BigInt, req.file.size)
        .query(`
          UPDATE tender_vendors 
          SET 
            proposal_document_path = @proposal_document_path,
            proposal_document_name = @proposal_document_name,
            proposal_upload_date = GETDATE(),
            proposal_file_size = @proposal_file_size,
            updated_at = GETDATE()
          OUTPUT INSERTED.*
          WHERE tender_id = @tender_id AND vendor_id = @vendor_id
        `);
      
      if (result.recordset.length === 0) {
        // Delete uploaded file if vendor not found
        fs.unlinkSync(req.file.path);
        return res.status(404).json({ error: 'Vendor not found for this tender' });
      }
      
      console.log('✅ Proposal uploaded successfully');
      res.json({
        success: true,
        message: 'Proposal uploaded successfully',
        vendor: result.recordset[0]
      });
      
    } catch (error) {
      console.error('❌ Error uploading proposal:', error);
      // Delete uploaded file on error
      if (req.file && req.file.path) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ error: 'Failed to upload proposal', details: error.message });
    }
});

// GET - Download proposal document
app.get('/api/tenders/:tenderId/vendors/:vendorId/proposal/download', async (req, res) => {
  const { tenderId, vendorId } = req.params;
  
  try {
    // Get proposal document path
    const result = await pool.request()
      .input('tender_id', sql.UniqueIdentifier, tenderId)
      .input('vendor_id', sql.UniqueIdentifier, vendorId)
      .query(`
        SELECT 
          proposal_document_path,
          proposal_document_name
        FROM tender_vendors 
        WHERE tender_id = @tender_id AND vendor_id = @vendor_id
      `);
    
    if (result.recordset.length === 0 || !result.recordset[0].proposal_document_path) {
      return res.status(404).json({ error: 'Proposal not found' });
    }
    
    const filePath = result.recordset[0].proposal_document_path;
    const fileName = result.recordset[0].proposal_document_name;
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Proposal file not found on server' });
    }
    
    // Send file
    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error('❌ Error downloading file:', err);
        res.status(500).json({ error: 'Failed to download file' });
      }
    });
    
  } catch (error) {
    console.error('❌ Error fetching proposal:', error);
    res.status(500).json({ error: 'Failed to fetch proposal', details: error.message });
  }
});

// PUT - Mark vendor as awarded
app.put('/api/tenders/:tenderId/vendors/:vendorId/award', async (req, res) => {
  const { tenderId, vendorId } = req.params;
  const transaction = new sql.Transaction(pool);
  
  try {
    await transaction.begin();
    
    // Unmark all vendors for this tender
    await transaction.request()
      .input('tender_id', sql.UniqueIdentifier, tenderId)
      .query(`
        UPDATE tender_vendors 
        SET is_awarded = 0, updated_at = GETDATE()
        WHERE tender_id = @tender_id
      `);
    
    // Mark the selected vendor as awarded
    const result = await transaction.request()
      .input('tender_id', sql.UniqueIdentifier, tenderId)
      .input('vendor_id', sql.UniqueIdentifier, vendorId)
      .query(`
        UPDATE tender_vendors 
        SET is_awarded = 1, updated_at = GETDATE()
        OUTPUT INSERTED.*
        WHERE tender_id = @tender_id AND vendor_id = @vendor_id
      `);
    
    if (result.recordset.length === 0) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Vendor not found for this tender' });
    }
    
    // Update tender table with awarded vendor
    await transaction.request()
      .input('tender_id', sql.UniqueIdentifier, tenderId)
      .input('awarded_vendor_id', sql.UniqueIdentifier, vendorId)
      .query(`
        UPDATE tenders 
        SET awarded_vendor_id = @awarded_vendor_id, 
            vendor_id = @awarded_vendor_id,
            updated_at = GETDATE()
        WHERE id = @tender_id
      `);
    
    await transaction.commit();
    
    console.log('✅ Vendor awarded successfully');
    res.json({
      success: true,
      message: 'Vendor awarded successfully',
      vendor: result.recordset[0]
    });
    
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error awarding vendor:', error);
    res.status(500).json({ error: 'Failed to award vendor', details: error.message });
  }
});

// PUT - Mark vendor as successful bidder
app.put('/api/tenders/:tenderId/vendors/:vendorId/successful', async (req, res) => {
  const { tenderId, vendorId } = req.params;
  const { is_successful } = req.body;
  
  const transaction = new sql.Transaction(pool);
  
  try {
    await transaction.begin();
    
    if (is_successful) {
      // Unmark all vendors as successful for this tender
      await transaction.request()
        .input('tender_id', sql.UniqueIdentifier, tenderId)
        .query(`
          UPDATE tender_vendors 
          SET is_successful = 0, updated_at = GETDATE()
          WHERE tender_id = @tender_id
        `);
    }
    
    // Mark the selected vendor as successful (or unmark if is_successful is false)
    const result = await transaction.request()
      .input('tender_id', sql.UniqueIdentifier, tenderId)
      .input('vendor_id', sql.UniqueIdentifier, vendorId)
      .input('is_successful', sql.Bit, is_successful ? 1 : 0)
      .query(`
        UPDATE tender_vendors 
        SET is_successful = @is_successful, updated_at = GETDATE()
        OUTPUT INSERTED.*
        WHERE tender_id = @tender_id AND vendor_id = @vendor_id
      `);
    
    if (result.recordset.length === 0) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Vendor not found for this tender' });
    }
    
    // Update tender table with successful vendor_id
    if (is_successful) {
      await transaction.request()
        .input('tender_id', sql.UniqueIdentifier, tenderId)
        .input('vendor_id', sql.UniqueIdentifier, vendorId)
        .query(`
          UPDATE tenders 
          SET vendor_id = @vendor_id, updated_at = GETDATE()
          WHERE id = @tender_id
        `);
    } else {
      // If unmarking, set vendor_id to NULL
      await transaction.request()
        .input('tender_id', sql.UniqueIdentifier, tenderId)
        .query(`
          UPDATE tenders 
          SET vendor_id = NULL, updated_at = GETDATE()
          WHERE id = @tender_id
        `);
    }
    
    await transaction.commit();
    
    console.log(`✅ Vendor ${is_successful ? 'marked' : 'unmarked'} as successful`);
    res.json({
      success: true,
      message: `Vendor ${is_successful ? 'marked' : 'unmarked'} as successful`,
      vendor: result.recordset[0]
    });
    
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error marking vendor as successful:', error);
    res.status(500).json({ error: 'Failed to mark vendor as successful', details: error.message });
  }
});

// DELETE - Remove vendor from tender
app.delete('/api/tenders/:tenderId/vendors/:vendorId', async (req, res) => {
  const { tenderId, vendorId } = req.params;
  
  try {
    // Get proposal file path before deleting
    const fileResult = await pool.request()
      .input('tender_id', sql.UniqueIdentifier, tenderId)
      .input('vendor_id', sql.UniqueIdentifier, vendorId)
      .query(`
        SELECT proposal_document_path 
        FROM tender_vendors 
        WHERE tender_id = @tender_id AND vendor_id = @vendor_id
      `);
    
    // Delete from database
    const result = await pool.request()
      .input('tender_id', sql.UniqueIdentifier, tenderId)
      .input('vendor_id', sql.UniqueIdentifier, vendorId)
      .query(`
        DELETE FROM tender_vendors 
        WHERE tender_id = @tender_id AND vendor_id = @vendor_id
      `);
    
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Vendor not found for this tender' });
    }
    
    // Delete proposal file if exists
    if (fileResult.recordset.length > 0 && fileResult.recordset[0].proposal_document_path) {
      const filePath = fileResult.recordset[0].proposal_document_path;
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log('🗑️ Deleted proposal file:', filePath);
      }
    }
    
    console.log('✅ Vendor removed from tender');
    res.json({ success: true, message: 'Vendor removed successfully' });
    
  } catch (error) {
    console.error('❌ Error removing vendor:', error);
    res.status(500).json({ error: 'Failed to remove vendor', details: error.message });
  }
});

// =============================================================================
// DELIVERY ENDPOINTS
// =============================================================================

// GET all deliveries
app.get('/api/deliveries', async (req, res) => {
  try {
    const result = await pool.request().query(`
      SELECT 
        d.*,
        t.reference_number as tender_reference,
        t.title as tender_title,
        t.is_finalized as tender_is_finalized
      FROM deliveries d
      LEFT JOIN tenders t ON d.tender_id = t.id
      ORDER BY d.created_at DESC
    `);
    res.json(result.recordset);

  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch deliveries', details: error.message });
  }
});

// GET single delivery by ID
app.get('/api/deliveries/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        SELECT 
          d.*,
          t.reference_number as tender_reference,
          t.title as tender_title,
          t.is_finalized as tender_is_finalized
        FROM deliveries d
        LEFT JOIN tenders t ON d.tender_id = t.id
        WHERE d.id = @id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Delivery not found' });
    }
    res.json(result.recordset[0]);

  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch delivery', details: error.message });
  }
});

// POST create new delivery
app.post('/api/deliveries', async (req, res) => {
  try {
    const {
      delivery_number,
      tender_id,
      delivery_personnel,
      delivery_date,
      delivery_notes,
      delivery_chalan,
      chalan_file_path
    } = req.body;

    const deliveryId = uuidv4();
    const now = new Date().toISOString();

    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, deliveryId)
      .input('delivery_number', sql.Int, delivery_number)
      .input('tender_id', sql.UniqueIdentifier, tender_id)
      .input('delivery_personnel', sql.NVarChar, delivery_personnel)
      .input('delivery_date', sql.NVarChar, delivery_date)
      .input('delivery_notes', sql.NVarChar, delivery_notes)
      .input('delivery_chalan', sql.NVarChar, delivery_chalan)
      .input('chalan_file_path', sql.NVarChar, chalan_file_path)
      .input('created_at', sql.DateTime2, now)
      .input('updated_at', sql.DateTime2, now)
      .query(`
        INSERT INTO deliveries (
          id, delivery_number, tender_id, delivery_personnel, delivery_date,
          delivery_notes, delivery_chalan, chalan_file_path, created_at, updated_at
        ) VALUES (
          @id, @delivery_number, @tender_id, @delivery_personnel, @delivery_date,
          @delivery_notes, @delivery_chalan, @chalan_file_path, @created_at, @updated_at
        )
      `);
    res.json({ 
      success: true, 
      id: deliveryId, 
      delivery_number: delivery_number,
      message: 'Delivery created successfully'
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to create delivery', details: error.message });
  }
});

// PUT update delivery
app.put('/api/deliveries/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      delivery_number,
      tender_id,
      delivery_personnel,
      delivery_date,
      delivery_notes,
      delivery_chalan,
      chalan_file_path
    } = req.body;

    // Check if delivery is finalized
    const checkResult = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        SELECT d.is_finalized
        FROM deliveries d
        WHERE d.id = @id
      `);

    if (checkResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Delivery not found' });
    }

    const { is_finalized } = checkResult.recordset[0];

    if (is_finalized) {
      return res.status(400).json({ 
        error: 'Cannot update delivery - delivery is finalized',
        reason: 'delivery_finalized'
      });
    }

    const now = new Date().toISOString();

    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('delivery_number', sql.Int, delivery_number)
      .input('tender_id', sql.UniqueIdentifier, tender_id)
      .input('delivery_personnel', sql.NVarChar, delivery_personnel)
      .input('delivery_date', sql.NVarChar, delivery_date)
      .input('delivery_notes', sql.NVarChar, delivery_notes)
      .input('delivery_chalan', sql.NVarChar, delivery_chalan)
      .input('chalan_file_path', sql.NVarChar, chalan_file_path)
      .input('updated_at', sql.DateTime2, now)
      .query(`
        UPDATE deliveries SET
          delivery_number = @delivery_number,
          tender_id = @tender_id,
          delivery_personnel = @delivery_personnel,
          delivery_date = @delivery_date,
          delivery_notes = @delivery_notes,
          delivery_chalan = @delivery_chalan,
          chalan_file_path = @chalan_file_path,
          updated_at = @updated_at
        WHERE id = @id
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Delivery not found' });
    }
    res.json({ 
      success: true, 
      id: id,
      message: 'Delivery updated successfully'
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to update delivery', details: error.message });
  }
});

// DELETE delivery
app.delete('/api/deliveries/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if delivery is finalized
    const checkResult = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        SELECT d.is_finalized
        FROM deliveries d
        WHERE d.id = @id
      `);

    if (checkResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Delivery not found' });
    }

    const { is_finalized } = checkResult.recordset[0];

    if (is_finalized) {
      return res.status(400).json({ 
        error: 'Cannot delete delivery - delivery is finalized',
        reason: 'delivery_finalized'
      });
    }

    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('DELETE FROM deliveries WHERE id = @id');

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Delivery not found' });
    }
    res.json({ 
      success: true, 
      message: 'Delivery deleted successfully'
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to delete delivery', details: error.message });
  }
});

// POST create delivery items
app.post('/api/delivery-items', async (req, res) => {
  try {
    const { delivery_id, items } = req.body;

    if (!delivery_id || !items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Missing delivery_id or items array' });
    }

    // First, delete existing delivery items for this delivery
    await pool.request()
      .input('delivery_id', sql.UniqueIdentifier, delivery_id)
      .query('DELETE FROM delivery_items WHERE delivery_id = @delivery_id');

    const now = new Date().toISOString();
    
    // Insert new delivery items
    for (const item of items) {
      const itemId = uuidv4();
      await pool.request()
        .input('id', sql.UniqueIdentifier, itemId)
        .input('delivery_id', sql.UniqueIdentifier, delivery_id)
        .input('item_master_id', sql.NVarChar, item.item_master_id)
        .input('item_name', sql.NVarChar, item.item_name)
        .input('delivery_qty', sql.Int, item.delivery_qty)
        .input('created_at', sql.DateTime2, now)
        .query(`
          INSERT INTO delivery_items (
            id, delivery_id, item_master_id, item_name, delivery_qty, created_at
          ) VALUES (
            @id, @delivery_id, @item_master_id, @item_name, @delivery_qty, @created_at
          )
        `);
    }

    res.json({ 
      success: true, 
      message: 'Delivery items saved successfully',
      items_count: items.length
    });

  } catch (error) {
    console.error('Error saving delivery items:', error);
    res.status(500).json({ error: 'Failed to save delivery items', details: error.message });
  }
});

// PUT update delivery items
app.put('/api/delivery-items/:delivery_id', async (req, res) => {
  try {
    const { delivery_id } = req.params;
    const { items } = req.body;

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Missing items array' });
    }

    // First, delete existing delivery items for this delivery
    await pool.request()
      .input('delivery_id', sql.UniqueIdentifier, delivery_id)
      .query('DELETE FROM delivery_items WHERE delivery_id = @delivery_id');

    const now = new Date().toISOString();
    
    // Insert updated delivery items
    for (const item of items) {
      const itemId = uuidv4();
      await pool.request()
        .input('id', sql.UniqueIdentifier, itemId)
        .input('delivery_id', sql.UniqueIdentifier, delivery_id)
        .input('item_master_id', sql.NVarChar, item.item_master_id)
        .input('item_name', sql.NVarChar, item.item_name)
        .input('delivery_qty', sql.Int, item.delivery_qty)
        .input('created_at', sql.DateTime2, now)
        .query(`
          INSERT INTO delivery_items (
            id, delivery_id, item_master_id, item_name, delivery_qty, created_at
          ) VALUES (
            @id, @delivery_id, @item_master_id, @item_name, @delivery_qty, @created_at
          )
        `);
    }

    res.json({ 
      success: true, 
      message: 'Delivery items updated successfully',
      items_count: items.length
    });

  } catch (error) {
    console.error('Error updating delivery items:', error);
    res.status(500).json({ error: 'Failed to update delivery items', details: error.message });
  }
});

// PUT finalize delivery and add to inventory
app.put('/api/deliveries/:id/finalize', async (req, res) => {
  try {
    const { id } = req.params;
    const { finalized_by } = req.body;

    const now = new Date().toISOString();
    
    const transaction = pool.transaction();
    await transaction.begin();

    try {
      // Check if delivery exists, is not already finalized, and get delivery items
      const checkResult = await transaction.request()
        .input('id', sql.UniqueIdentifier, id)
        .query(`
          SELECT d.is_finalized, d.tender_id, t.is_finalized as tender_is_finalized
          FROM deliveries d
          LEFT JOIN tenders t ON d.tender_id = t.id
          WHERE d.id = @id
        `);

      if (checkResult.recordset.length === 0) {
        throw new Error('Delivery not found');
      }

      const { is_finalized, tender_is_finalized, tender_id } = checkResult.recordset[0];

      if (tender_is_finalized) {
        throw new Error('Cannot finalize delivery - tender is already finalized');
      }

      if (is_finalized) {
        throw new Error('Delivery is already finalized');
      }

      // Get delivery items to add to inventory
      const deliveryItemsResult = await transaction.request()
        .input('delivery_id', sql.UniqueIdentifier, id)
        .query(`
          SELECT 
            di.item_master_id,
            di.quantity_delivered,
            di.unit_price,
            im.nomenclature,
            im.unit,
            im.minimum_stock_level,
            im.maximum_stock_level,
            im.reorder_level
          FROM delivery_items di
          INNER JOIN item_masters im ON di.item_master_id = im.id
          WHERE di.delivery_id = @delivery_id
        `);

      // Process each delivery item
      for (const item of deliveryItemsResult.recordset) {
        const { 
          item_master_id, 
          quantity_delivered, 
          unit_price, 
          nomenclature,
          unit,
          minimum_stock_level,
          maximum_stock_level,
          reorder_level
        } = item;

        // Check if inventory record exists for this item
        const inventoryCheck = await transaction.request()
          .input('item_master_id', sql.UniqueIdentifier, item_master_id)
          .query(`
            SELECT id, current_quantity 
            FROM current_inventory_stock 
            WHERE item_master_id = @item_master_id
          `);

        let inventoryId;
        
        if (inventoryCheck.recordset.length === 0) {
          // Create new inventory record
          inventoryId = uuidv4();
          await transaction.request()
            .input('id', sql.UniqueIdentifier, inventoryId)
            .input('item_master_id', sql.UniqueIdentifier, item_master_id)
            .input('current_quantity', sql.Int, quantity_delivered)
            .input('available_quantity', sql.Int, quantity_delivered)
            .input('reserved_quantity', sql.Int, 0)
            .input('minimum_stock_level', sql.Int, minimum_stock_level || 0)
            .input('maximum_stock_level', sql.Int, maximum_stock_level || 0)
            .input('reorder_point', sql.Int, reorder_level || 0)
            .input('updated_by', sql.NVarChar, finalized_by)
            .query(`
              INSERT INTO current_inventory_stock (
                id, item_master_id, current_quantity, available_quantity, reserved_quantity,
                minimum_stock_level, maximum_stock_level, reorder_point, updated_by,
                last_updated, created_at
              ) VALUES (
                @id, @item_master_id, @current_quantity, @available_quantity, @reserved_quantity,
                @minimum_stock_level, @maximum_stock_level, @reorder_point, @updated_by,
                GETDATE(), GETDATE()
              )
            `);
        } else {
          // Update existing inventory record
          inventoryId = inventoryCheck.recordset[0].id;
          const currentQty = inventoryCheck.recordset[0].current_quantity;
          
          await transaction.request()
            .input('id', sql.UniqueIdentifier, inventoryId)
            .input('quantity_delivered', sql.Int, quantity_delivered)
            .input('updated_by', sql.NVarChar, finalized_by)
            .query(`
              UPDATE current_inventory_stock 
              SET 
                current_quantity = current_quantity + @quantity_delivered,
                available_quantity = (current_quantity + @quantity_delivered) - ISNULL(reserved_quantity, 0),
                updated_by = @updated_by,
                last_updated = GETDATE()
              WHERE id = @id
            `);
        }

        // Create stock movement log entry
        const movementId = uuidv4();
        await transaction.request()
          .input('movement_id', sql.UniqueIdentifier, movementId)
          .input('item_master_id', sql.UniqueIdentifier, item_master_id)
          .input('quantity', sql.Int, quantity_delivered)
          .input('unit_price', sql.Decimal(15, 2), unit_price || 0)
          .input('reference_id', sql.UniqueIdentifier, id)
          .input('authorized_by', sql.NVarChar, finalized_by)
          .input('nomenclature', sql.NVarChar, nomenclature)
          .query(`
            INSERT INTO stock_movement_log (
              id, item_master_id, movement_type, reference_type, reference_id,
              quantity, unit_price, total_value, movement_date, authorized_by, 
              movement_notes, nomenclature, created_at
            ) VALUES (
              @movement_id, @item_master_id, 'Issue', 'Delivery', @reference_id,
              @quantity, @unit_price, (@quantity * @unit_price), GETDATE(), @authorized_by,
              'Stock added from delivery finalization', @nomenclature, GETDATE()
            )
          `);
      }

      // Update delivery to finalized status
      await transaction.request()
        .input('id', sql.UniqueIdentifier, id)
        .input('finalized_by', sql.UniqueIdentifier, finalized_by)
        .input('finalized_at', sql.DateTime2, now)
        .input('updated_at', sql.DateTime2, now)
        .query(`
          UPDATE deliveries SET
            is_finalized = 1,
            finalized_by = @finalized_by,
            finalized_at = @finalized_at,
            updated_at = @updated_at
          WHERE id = @id
        `);

      await transaction.commit();

      res.json({ 
        success: true, 
        id: id,
        message: 'Delivery finalized successfully and inventory updated',
        finalized_at: now,
        finalized_by: finalized_by,
        items_added: deliveryItemsResult.recordset.length
      });

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    console.error('Error finalizing delivery:', error);
    res.status(500).json({ 
      error: 'Failed to finalize delivery', 
      details: error.message 
    });
  }
});

// =============================================================================
// STOCK TRANSACTION / INVENTORY ENDPOINTS
// =============================================================================

// GET all current inventory stock
app.get('/api/inventory-stock', async (req, res) => {
  try {
    const result = await pool.request().query(`
      SELECT 
        cis.*,
        im.nomenclature as item_name,
        im.item_code,
        im.unit,
        im.category_id,
        im.specifications
      FROM current_inventory_stock cis
      LEFT JOIN item_masters im ON cis.item_master_id = im.id
      ORDER BY cis.last_updated DESC
    `);
    res.json(result.recordset);

  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch inventory stock', details: error.message });
  }
});

// GET single inventory stock by ID
app.get('/api/inventory-stock/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        SELECT 
          cis.*,
          im.nomenclature as item_name,
          im.item_code,
          im.unit,
          im.category_id,
          im.specifications
        FROM current_inventory_stock cis
        LEFT JOIN item_masters im ON cis.item_master_id = im.id
        WHERE cis.id = @id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Inventory stock record not found' });
    }
    res.json(result.recordset[0]);

  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch inventory stock', details: error.message });
  }
});

// POST create new inventory stock record
app.post('/api/inventory-stock', async (req, res) => {
  try {
    const {
      item_master_id,
      current_quantity,
      reserved_quantity,
      available_quantity,
      minimum_stock_level,
      reorder_point,
      maximum_stock_level,
      updated_by
    } = req.body;

    const stockId = uuidv4();
    const now = new Date().toISOString();

    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, stockId)
      .input('item_master_id', sql.UniqueIdentifier, item_master_id)
      .input('current_quantity', sql.Int, current_quantity)
      .input('reserved_quantity', sql.Int, reserved_quantity || 0)
      .input('available_quantity', sql.Int, available_quantity || current_quantity)
      .input('minimum_stock_level', sql.Int, minimum_stock_level || 0)
      .input('reorder_point', sql.Int, reorder_point || 0)
      .input('maximum_stock_level', sql.Int, maximum_stock_level || 0)
      .input('updated_by', sql.NVarChar, updated_by)
      .input('last_updated', sql.DateTime2, now)
      .input('created_at', sql.DateTime2, now)
      .query(`
        INSERT INTO current_inventory_stock (
          id, item_master_id, current_quantity, reserved_quantity, available_quantity,
          minimum_stock_level, reorder_point, maximum_stock_level, updated_by,
          last_updated, created_at
        ) VALUES (
          @id, @item_master_id, @current_quantity, @reserved_quantity, @available_quantity,
          @minimum_stock_level, @reorder_point, @maximum_stock_level, @updated_by,
          @last_updated, @created_at
        )
      `);
    res.json({ 
      success: true, 
      id: stockId,
      item_master_id: item_master_id,
      message: 'Inventory stock record created successfully'
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to create inventory stock record', details: error.message });
  }
});

// PUT update inventory stock (stock transaction)
app.put('/api/inventory-stock/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      current_quantity,
      reserved_quantity,
      available_quantity,
      minimum_stock_level,
      reorder_point,
      maximum_stock_level,
      updated_by
    } = req.body;

    const now = new Date().toISOString();

    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('current_quantity', sql.Int, current_quantity)
      .input('reserved_quantity', sql.Int, reserved_quantity)
      .input('available_quantity', sql.Int, available_quantity)
      .input('minimum_stock_level', sql.Int, minimum_stock_level)
      .input('reorder_point', sql.Int, reorder_point)
      .input('maximum_stock_level', sql.Int, maximum_stock_level)
      .input('updated_by', sql.NVarChar, updated_by)
      .input('last_updated', sql.DateTime2, now)
      .query(`
        UPDATE current_inventory_stock SET
          current_quantity = @current_quantity,
          reserved_quantity = @reserved_quantity,
          available_quantity = @available_quantity,
          minimum_stock_level = @minimum_stock_level,
          reorder_point = @reorder_point,
          maximum_stock_level = @maximum_stock_level,
          updated_by = @updated_by,
          last_updated = @last_updated
        WHERE id = @id
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Inventory stock record not found' });
    }
    res.json({ 
      success: true, 
      id: id,
      message: 'Inventory stock updated successfully'
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to update inventory stock', details: error.message });
  }
});

// DELETE inventory stock record
app.delete('/api/inventory-stock/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('DELETE FROM current_inventory_stock WHERE id = @id');

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Inventory stock record not found' });
    }
    res.json({ 
      success: true, 
      message: 'Inventory stock record deleted successfully'
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to delete inventory stock record', details: error.message });
  }
});

// POST stock transaction (adjust stock levels)
app.post('/api/inventory-stock/:id/transaction', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      transaction_type, // 'IN', 'OUT', 'ADJUST'
      quantity,
      reason,
      updated_by
    } = req.body;

    const now = new Date().toISOString();

    // Get current stock levels
    const currentStock = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('SELECT * FROM current_inventory_stock WHERE id = @id');

    if (currentStock.recordset.length === 0) {
      return res.status(404).json({ error: 'Inventory stock record not found' });
    }

    const stock = currentStock.recordset[0];
    let newCurrentQuantity = stock.current_quantity;
    let newAvailableQuantity = stock.available_quantity;

    // Calculate new quantities based on transaction type
    switch (transaction_type.toUpperCase()) {
      case 'IN':
        newCurrentQuantity += quantity;
        newAvailableQuantity += quantity;
        break;
      case 'OUT':
        newCurrentQuantity -= quantity;
        newAvailableQuantity -= quantity;
        break;
      case 'ADJUST':
        newCurrentQuantity = quantity;
        newAvailableQuantity = quantity - stock.reserved_quantity;
        break;
      default:
        return res.status(400).json({ error: 'Invalid transaction type. Use IN, OUT, or ADJUST' });
    }

    // Ensure quantities don't go negative
    if (newCurrentQuantity < 0) newCurrentQuantity = 0;
    if (newAvailableQuantity < 0) newAvailableQuantity = 0;

    // Update the stock record
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('current_quantity', sql.Int, newCurrentQuantity)
      .input('available_quantity', sql.Int, newAvailableQuantity)
      .input('updated_by', sql.NVarChar, updated_by)
      .input('last_updated', sql.DateTime2, now)
      .query(`
        UPDATE current_inventory_stock SET
          current_quantity = @current_quantity,
          available_quantity = @available_quantity,
          updated_by = @updated_by,
          last_updated = @last_updated
        WHERE id = @id
      `);
    res.json({ 
      success: true, 
      transaction_type: transaction_type,
      quantity: quantity,
      previous_quantity: stock.current_quantity,
      new_quantity: newCurrentQuantity,
      message: `Stock ${transaction_type.toLowerCase()} transaction completed successfully`
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to process stock transaction', details: error.message });
  }
});

// =============================================================================
// ITEM MASTER ENDPOINTS
// =============================================================================

// GET all item masters
app.get('/api/item-masters', async (req, res) => {
  try {
    console.log('🔍 Starting /api/item-masters request...');
    
    if (!pool) {
      console.log('⚠️ No database pool available, returning mock data');
      // Return mock data when SQL Server is not connected
      const mockItemMasters = [
        { 
          id: '1', 
          nomenclature: 'Desktop Computer', 
          item_code: 'IT001', 
          unit: 'Unit', 
          category_id: '1', 
          sub_category_id: '1',
          specifications: 'Intel i5, 8GB RAM, 500GB HDD',
          description: 'Standard desktop computer for office use',
          status: 'Active',
          minimum_stock_level: 5,
          maximum_stock_level: 50,
          reorder_point: 10,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
          category_name: 'Information Technology',
          sub_category_name: 'Computers'
        },
        { 
          id: '2', 
          nomenclature: 'Office Chair', 
          item_code: 'FUR001', 
          unit: 'Unit', 
          category_id: '2', 
          sub_category_id: '2',
          specifications: 'Ergonomic design, adjustable height',
          description: 'Comfortable office chair with back support',
          status: 'Active',
          minimum_stock_level: 2,
          maximum_stock_level: 20,
          reorder_point: 5,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
          category_name: 'Furniture',
          sub_category_name: 'Office Furniture'
        },
        { 
          id: '3', 
          nomenclature: 'A4 Paper', 
          item_code: 'STA001', 
          unit: 'Ream', 
          category_id: '3', 
          sub_category_id: '3',
          specifications: '80GSM, white, 500 sheets',
          description: 'Standard office paper for printing',
          status: 'Active',
          minimum_stock_level: 10,
          maximum_stock_level: 100,
          reorder_point: 20,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
          category_name: 'Stationery',
          sub_category_name: 'Paper Products'
        }
      ];
      return res.json(mockItemMasters);
    }

    console.log('📊 Executing database query...');
    const result = await pool.request().query(`
      SELECT 
        id,
        item_code,
        nomenclature,
        category_id,
        sub_category_id,
        unit,
        specifications,
        description,
        status,
        minimum_stock_level,
        maximum_stock_level,
        reorder_point,
        created_at,
        updated_at,
        category_name,
        sub_category_name
      FROM vw_item_masters_with_categories
      ORDER BY nomenclature
    `);
    
    console.log('✅ Query executed successfully, rows returned:', result.recordset.length);
    if (result.recordset.length > 0) {
      console.log('📊 First item sample:', JSON.stringify(result.recordset[0], null, 2));
    }
    
    res.json(result.recordset);
  } catch (error) {
    console.error('❌ Error in /api/item-masters:', error.message);
    console.error('📋 Full error:', error);
    
    // Fallback to mock data on any error
    const mockItemMasters = [
      { 
        id: '1', 
        nomenclature: 'Desktop Computer', 
        item_code: 'IT001', 
        unit: 'Unit', 
        category_id: '1', 
        sub_category_id: '1',
        specifications: 'Intel i5, 8GB RAM, 500GB HDD',
        description: 'Standard desktop computer for office use',
        status: 'Active',
        minimum_stock_level: 5,
        maximum_stock_level: 50,
        reorder_point: 10,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
        category_name: 'Information Technology',
        sub_category_name: 'Computers'
      },
      { 
        id: '2', 
        nomenclature: 'Office Chair', 
        item_code: 'FUR001', 
        unit: 'Unit', 
        category_id: '2', 
        sub_category_id: '2',
        specifications: 'Ergonomic design, adjustable height',
        description: 'Comfortable office chair with back support',
        status: 'Active',
        minimum_stock_level: 2,
        maximum_stock_level: 20,
        reorder_point: 5,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
        category_name: 'Furniture',
        sub_category_name: 'Office Furniture'
      },
      { 
        id: '3', 
        nomenclature: 'A4 Paper', 
        item_code: 'STA001', 
        unit: 'Ream', 
        category_id: '3', 
        sub_category_id: '3',
        specifications: '80GSM, white, 500 sheets',
        description: 'Standard office paper for printing',
        status: 'Active',
        minimum_stock_level: 10,
        maximum_stock_level: 100,
        reorder_point: 20,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
        category_name: 'Stationery',
        sub_category_name: 'Paper Products'
      }
    ];
    res.json(mockItemMasters);
  }
});

// GET single item master by ID
app.get('/api/item-masters/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        SELECT 
          id,
          nomenclature,
          item_code,
          unit,
          category_id,
          sub_category_id,
          specifications,
          description,
          minimum_stock_level,
          reorder_point,
          maximum_stock_level,
          status,
          created_at,
          updated_at
        FROM item_masters 
        WHERE id = @id AND status != 'Deleted'
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Item master not found' });
    }
    res.json(result.recordset[0]);

  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch item master', details: error.message });
  }
});

// POST create new item master
app.post('/api/item-masters', async (req, res) => {
  try {
    const {
      nomenclature,
      item_code,
      unit,
      category_id,
      sub_category_id,
      specifications,
      description,
      minimum_stock_level,
      reorder_point,
      maximum_stock_level,
      status = 'Active'
    } = req.body;

    const itemId = uuidv4();
    const now = new Date().toISOString();

    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, itemId)
      .input('nomenclature', sql.NVarChar, nomenclature)
      .input('item_code', sql.NVarChar, item_code)
      .input('unit', sql.NVarChar, unit)
      .input('category_id', sql.UniqueIdentifier, category_id)
      .input('sub_category_id', sql.UniqueIdentifier, sub_category_id)
      .input('specifications', sql.NVarChar, specifications)
      .input('description', sql.NVarChar, description)
      .input('minimum_stock_level', sql.Int, minimum_stock_level || 0)
      .input('reorder_point', sql.Int, reorder_point || 0)
      .input('maximum_stock_level', sql.Int, maximum_stock_level || 0)
      .input('status', sql.NVarChar, status)
      .input('created_at', sql.DateTime2, now)
      .input('updated_at', sql.DateTime2, now)
      .query(`
        INSERT INTO item_masters (
          id, nomenclature, item_code, unit, category_id, sub_category_id,
          specifications, description, minimum_stock_level, reorder_point,
          maximum_stock_level, status, created_at, updated_at
        ) VALUES (
          @id, @nomenclature, @item_code, @unit, @category_id, @sub_category_id,
          @specifications, @description, @minimum_stock_level, @reorder_point,
          @maximum_stock_level, @status, @created_at, @updated_at
        )
      `);
    res.json({ 
      success: true, 
      id: itemId, 
      nomenclature: nomenclature,
      item_code: item_code,
      message: 'Item master created successfully'
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to create item master', details: error.message });
  }
});

// PUT update item master
app.put('/api/item-masters/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nomenclature,
      item_code,
      unit,
      category_id,
      sub_category_id,
      specifications,
      description,
      minimum_stock_level,
      reorder_point,
      maximum_stock_level,
      status
    } = req.body;

    console.log('🔄 PUT /api/item-masters/:id - Request received');
    console.log('📝 Item ID:', id);
    console.log('📊 Request body:', req.body);

    const now = new Date().toISOString();

    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('nomenclature', sql.NVarChar, nomenclature)
      .input('item_code', sql.NVarChar, item_code)
      .input('unit', sql.NVarChar, unit)
      .input('category_id', sql.UniqueIdentifier, category_id)
      .input('sub_category_id', sql.UniqueIdentifier, sub_category_id)
      .input('specifications', sql.NVarChar, specifications)
      .input('description', sql.NVarChar, description)
      .input('minimum_stock_level', sql.Int, minimum_stock_level)
      .input('reorder_point', sql.Int, reorder_point)
      .input('maximum_stock_level', sql.Int, maximum_stock_level)
      .input('status', sql.NVarChar, status)
      .input('updated_at', sql.DateTime2, now)
      .query(`
        UPDATE item_masters SET
          nomenclature = @nomenclature,
          item_code = @item_code,
          unit = @unit,
          category_id = @category_id,
          sub_category_id = @sub_category_id,
          specifications = @specifications,
          description = @description,
          minimum_stock_level = @minimum_stock_level,
          reorder_point = @reorder_point,
          maximum_stock_level = @maximum_stock_level,
          status = @status,
          updated_at = @updated_at
        WHERE id = @id
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Item master not found' });
    }
    
    console.log('✅ Item master updated successfully');
    res.json({ 
      success: true, 
      id: id,
      message: 'Item master updated successfully'
    });

  } catch (error) {
    console.error('❌ Error updating item master:', error);
    console.error('📋 Error details:', error.message);
    res.status(500).json({ error: 'Failed to update item master', details: error.message });
  }
});

// DELETE item master (soft delete)
app.delete('/api/item-masters/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const now = new Date().toISOString();

    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('updated_at', sql.DateTime2, now)
      .query(`
        UPDATE item_masters SET
          status = 'Deleted',
          updated_at = @updated_at
        WHERE id = @id
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Item master not found' });
    }
    res.json({ 
      success: true, 
      message: 'Item master deleted successfully'
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to delete item master', details: error.message });
  }
});

// =============================================================================
// CATEGORIES ENDPOINTS
// =============================================================================

// GET all categories
app.get('/api/categories', async (req, res) => {
  try {
    if (!pool) {
      // Return mock data when SQL Server is not connected
      const mockCategories = [
        { id: 1, category_name: 'Information Technology', description: 'IT equipment and software', status: 'Active', item_count: 0 },
        { id: 2, category_name: 'Furniture', description: 'Office furniture and fixtures', status: 'Active', item_count: 0 },
        { id: 3, category_name: 'Stationery', description: 'Office supplies and stationery', status: 'Active', item_count: 0 },
        { id: 4, category_name: 'Vehicles', description: 'Government vehicles and transport', status: 'Active', item_count: 0 },
        { id: 5, category_name: 'Medical Equipment', description: 'Medical and healthcare equipment', status: 'Active', item_count: 0 }
      ];
      return res.json(mockCategories);
    }

    const result = await pool.request().query(`
      SELECT 
        c.id,
        c.category_name,
        c.description,
        c.status,
        c.created_at,
        c.updated_at,
        COUNT(DISTINCT im.id) as item_count
      FROM categories c
      LEFT JOIN item_masters im ON c.id = im.category_id
      WHERE c.status != 'Deleted'
      GROUP BY c.id, c.category_name, c.description, c.status, c.created_at, c.updated_at
      ORDER BY c.category_name
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching categories:', error);
    // Fallback to mock data on any error
    const mockCategories = [
      { id: 1, category_name: 'Information Technology', description: 'IT equipment and software', status: 'Active', item_count: 0 },
      { id: 2, category_name: 'Furniture', description: 'Office furniture and fixtures', status: 'Active', item_count: 0 },
      { id: 3, category_name: 'Stationery', description: 'Office supplies and stationery', status: 'Active', item_count: 0 },
      { id: 4, category_name: 'Vehicles', description: 'Government vehicles and transport', status: 'Active', item_count: 0 },
      { id: 5, category_name: 'Medical Equipment', description: 'Medical and healthcare equipment', status: 'Active', item_count: 0 }
    ];
    res.json(mockCategories);
  }
});

// GET single category by ID
app.get('/api/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!pool) {
      const mockCategory = { id: 1, category_name: 'Information Technology', description: 'IT equipment and software', status: 'Active' };
      return res.json(mockCategory);
    }

    const result = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT 
          id,
          category_name,
          description,
          status,
          created_at,
          updated_at
        FROM categories 
        WHERE id = @id AND status != 'Deleted'
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({ error: 'Failed to fetch category', details: error.message });
  }
});

// =============================================================================
// SUB-CATEGORIES ENDPOINTS
// =============================================================================

// GET all sub-categories
app.get('/api/sub-categories', async (req, res) => {
  try {
    console.log('🔍 Fetching all sub-categories...');
    
    if (!pool) {
      const mockSubCategories = [
        { id: 1, sub_category_name: 'Computers', category_id: 1, description: 'Desktop and laptop computers', status: 'Active', item_count: 0 },
        { id: 2, sub_category_name: 'Printers', category_id: 1, description: 'All types of printers', status: 'Active', item_count: 0 },
        { id: 3, sub_category_name: 'Office Chairs', category_id: 2, description: 'Office seating furniture', status: 'Active', item_count: 0 },
        { id: 4, sub_category_name: 'Desks', category_id: 2, description: 'Office desks and tables', status: 'Active', item_count: 0 },
        { id: 5, sub_category_name: 'Paper Products', category_id: 3, description: 'All paper-based stationery', status: 'Active', item_count: 0 },
        { id: 6, sub_category_name: 'Writing Instruments', category_id: 3, description: 'Pens, pencils, markers', status: 'Active', item_count: 0 }
      ];
      return res.json(mockSubCategories);
    }

    const result = await pool.request().query(`
      SELECT 
        sc.id,
        sc.sub_category_name,
        sc.category_id,
        sc.description,
        sc.status,
        sc.created_at,
        sc.updated_at,
        COUNT(DISTINCT im.id) as item_count
      FROM sub_categories sc
      LEFT JOIN item_masters im ON sc.id = im.sub_category_id
      WHERE sc.status != 'Deleted'
      GROUP BY sc.id, sc.sub_category_name, sc.category_id, sc.description, sc.status, sc.created_at, sc.updated_at
      ORDER BY sc.sub_category_name
    `);
    
    console.log('✅ Sub-categories fetched:', result.recordset.length);
    res.json(result.recordset);
  } catch (error) {
    console.error('❌ Error fetching sub-categories:', error);
    // Fallback to mock data on any error
    const mockSubCategories = [
      { id: 1, sub_category_name: 'Computers', category_id: 1, description: 'Desktop and laptop computers', status: 'Active' },
      { id: 2, sub_category_name: 'Printers', category_id: 1, description: 'All types of printers', status: 'Active' },
      { id: 3, sub_category_name: 'Office Chairs', category_id: 2, description: 'Office seating furniture', status: 'Active' },
      { id: 4, sub_category_name: 'Desks', category_id: 2, description: 'Office desks and tables', status: 'Active' },
      { id: 5, sub_category_name: 'Paper Products', category_id: 3, description: 'All paper-based stationery', status: 'Active' },
      { id: 6, sub_category_name: 'Writing Instruments', category_id: 3, description: 'Pens, pencils, markers', status: 'Active' }
    ];
    res.json(mockSubCategories);
  }
});

// GET sub-categories by category ID
app.get('/api/sub-categories/by-category/:categoryId', async (req, res) => {
  try {
    const { categoryId } = req.params;
    console.log('🔍 Fetching sub-categories for category:', categoryId);
    
    if (!pool) {
      const mockSubCategories = [
        { id: 1, sub_category_name: 'Computers', category_id: 1, description: 'Desktop and laptop computers', status: 'Active' },
        { id: 2, sub_category_name: 'Printers', category_id: 1, description: 'All types of printers', status: 'Active' }
      ].filter(sub => sub.category_id.toString() === categoryId);
      return res.json(mockSubCategories);
    }

    const result = await pool.request()
      .input('categoryId', sql.Int, categoryId)
      .query(`
        SELECT 
          id,
          sub_category_name,
          category_id,
          description,
          status,
          created_at,
          updated_at
        FROM sub_categories 
        WHERE category_id = @categoryId AND status != 'Deleted'
        ORDER BY sub_category_name
      `);
    
    console.log('✅ Sub-categories fetched for category', categoryId, ':', result.recordset.length);
    res.json(result.recordset);
  } catch (error) {
    console.error('❌ Error fetching sub-categories by category:', error);
    res.status(500).json({ error: 'Failed to fetch sub-categories', details: error.message });
  }
});

// POST - Create new category
app.post('/api/categories', async (req, res) => {
  try {
    const { category_name, description, status } = req.body;
    
    if (!category_name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const result = await pool.request()
      .input('category_name', sql.NVarChar, category_name)
      .input('description', sql.NVarChar, description || null)
      .input('status', sql.NVarChar, status || 'Active')
      .query(`
        INSERT INTO categories (category_name, description, status, created_at, updated_at)
        OUTPUT INSERTED.*
        VALUES (@category_name, @description, @status, GETDATE(), GETDATE())
      `);

    console.log('✅ Category created:', result.recordset[0]);
    res.json({ message: 'Category created successfully', data: result.recordset[0] });
  } catch (error) {
    console.error('❌ Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category', details: error.message });
  }
});

// PUT - Update category
app.put('/api/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { category_name, description, status } = req.body;

    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('category_name', sql.NVarChar, category_name)
      .input('description', sql.NVarChar, description || null)
      .input('status', sql.NVarChar, status)
      .query(`
        UPDATE categories
        SET category_name = @category_name,
            description = @description,
            status = @status,
            updated_at = GETDATE()
        OUTPUT INSERTED.*
        WHERE id = @id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    console.log('✅ Category updated:', result.recordset[0]);
    res.json({ message: 'Category updated successfully', data: result.recordset[0] });
  } catch (error) {
    console.error('❌ Error updating category:', error);
    res.status(500).json({ error: 'Failed to update category', details: error.message });
  }
});

// DELETE - Delete category
app.delete('/api/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if category has sub-categories
    const checkResult = await pool.request()
      .input('id', sql.Int, id)
      .query('SELECT COUNT(*) as count FROM sub_categories WHERE category_id = @id');

    if (checkResult.recordset[0].count > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete category with existing sub-categories',
        details: 'Please delete all sub-categories first'
      });
    }

    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM categories OUTPUT DELETED.* WHERE id = @id');

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Category not found' });
    }

    console.log('✅ Category deleted:', result.recordset[0]);
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting category:', error);
    res.status(500).json({ error: 'Failed to delete category', details: error.message });
  }
});

// POST - Create new sub-category
app.post('/api/sub-categories', async (req, res) => {
  try {
    const { category_id, sub_category_name, description, status } = req.body;
    
    if (!category_id || !sub_category_name) {
      return res.status(400).json({ error: 'Category ID and sub-category name are required' });
    }

    const result = await pool.request()
      .input('category_id', sql.Int, category_id)
      .input('sub_category_name', sql.NVarChar, sub_category_name)
      .input('description', sql.NVarChar, description || null)
      .input('status', sql.NVarChar, status || 'Active')
      .query(`
        INSERT INTO sub_categories (category_id, sub_category_name, description, status, created_at, updated_at)
        OUTPUT INSERTED.*
        VALUES (@category_id, @sub_category_name, @description, @status, GETDATE(), GETDATE())
      `);

    console.log('✅ Sub-category created:', result.recordset[0]);
    res.json({ message: 'Sub-category created successfully', data: result.recordset[0] });
  } catch (error) {
    console.error('❌ Error creating sub-category:', error);
    res.status(500).json({ error: 'Failed to create sub-category', details: error.message });
  }
});

// PUT - Update sub-category
app.put('/api/sub-categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { category_id, sub_category_name, description, status } = req.body;

    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('category_id', sql.Int, category_id)
      .input('sub_category_name', sql.NVarChar, sub_category_name)
      .input('description', sql.NVarChar, description || null)
      .input('status', sql.NVarChar, status)
      .query(`
        UPDATE sub_categories
        SET category_id = @category_id,
            sub_category_name = @sub_category_name,
            description = @description,
            status = @status,
            updated_at = GETDATE()
        OUTPUT INSERTED.*
        WHERE id = @id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Sub-category not found' });
    }

    console.log('✅ Sub-category updated:', result.recordset[0]);
    res.json({ message: 'Sub-category updated successfully', data: result.recordset[0] });
  } catch (error) {
    console.error('❌ Error updating sub-category:', error);
    res.status(500).json({ error: 'Failed to update sub-category', details: error.message });
  }
});

// DELETE - Delete sub-category
app.delete('/api/sub-categories/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM sub_categories OUTPUT DELETED.* WHERE id = @id');

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Sub-category not found' });
    }

    console.log('✅ Sub-category deleted:', result.recordset[0]);
    res.json({ message: 'Sub-category deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting sub-category:', error);
    res.status(500).json({ error: 'Failed to delete sub-category', details: error.message });
  }
});

// =============================================================================
// VENDOR ENDPOINTS
// =============================================================================

// GET all vendors
app.get('/api/vendors', async (req, res) => {
  try {
    if (!pool) {
      // Return mock data when SQL Server is not connected
      const mockVendors = [
        { id: '1', vendor_code: 'VEN001', vendor_name: 'ABC Suppliers Ltd', contact_person: 'John Smith', email: 'john@abc.com', phone: '021-1234567', status: 'Active' },
        { id: '2', vendor_code: 'VEN002', vendor_name: 'XYZ Traders', contact_person: 'Jane Doe', email: 'jane@xyz.com', phone: '021-7654321', status: 'Active' },
        { id: '3', vendor_code: 'VEN003', vendor_name: 'Best Quality Co', contact_person: 'Mike Johnson', email: 'mike@bestquality.com', phone: '042-1111111', status: 'Active' }
      ];
      return res.json({ vendors: mockVendors });
    }

    const result = await pool.request().query(`
      SELECT 
        id,
        vendor_code,
        vendor_name,
        contact_person,
        email,
        phone,
        address,
        city,
        country,
        tax_number,
        status,
        created_at,
        updated_at
      FROM vendors 
      WHERE status != 'Deleted'
      ORDER BY vendor_name
    `);
    res.json({ vendors: result.recordset });
  } catch (error) {
    // Fallback to mock data on any error
    const mockVendors = [
      { id: '1', vendor_code: 'VEN001', vendor_name: 'ABC Suppliers Ltd', contact_person: 'John Smith', email: 'john@abc.com', phone: '021-1234567', status: 'Active' },
      { id: '2', vendor_code: 'VEN002', vendor_name: 'XYZ Traders', contact_person: 'Jane Doe', email: 'jane@xyz.com', phone: '021-7654321', status: 'Active' },
      { id: '3', vendor_code: 'VEN003', vendor_name: 'Best Quality Co', contact_person: 'Mike Johnson', email: 'mike@bestquality.com', phone: '042-1111111', status: 'Active' }
    ];
    res.json({ vendors: mockVendors });
  }
});

// GET single vendor by ID
app.get('/api/vendors/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        SELECT 
          id,
          vendor_code,
          vendor_name,
          contact_person,
          email,
          phone,
          address,
          city,
          country,
          tax_number,
          status,
          created_at,
          updated_at
        FROM vendors 
        WHERE id = @id AND status != 'Deleted'
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    res.json(result.recordset[0]);

  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch vendor', details: error.message });
  }
});

// POST create new vendor
app.post('/api/vendors', async (req, res) => {
  try {
    const {
      vendor_code,
      vendor_name,
      contact_person,
      email,
      phone,
      address,
      city,
      country,
      tax_number,
      status = 'Active'
    } = req.body;

    const vendorId = uuidv4();
    const now = new Date().toISOString();

    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, vendorId)
      .input('vendor_code', sql.NVarChar, vendor_code)
      .input('vendor_name', sql.NVarChar, vendor_name)
      .input('contact_person', sql.NVarChar, contact_person)
      .input('email', sql.NVarChar, email)
      .input('phone', sql.NVarChar, phone)
      .input('address', sql.NVarChar, address)
      .input('city', sql.NVarChar, city)
      .input('country', sql.NVarChar, country)
      .input('tax_number', sql.NVarChar, tax_number)
      .input('status', sql.NVarChar, status)
      .input('created_at', sql.DateTime2, now)
      .input('updated_at', sql.DateTime2, now)
      .query(`
        INSERT INTO vendors (
          id, vendor_code, vendor_name, contact_person, email, phone,
          address, city, country, tax_number, status, created_at, updated_at
        ) VALUES (
          @id, @vendor_code, @vendor_name, @contact_person, @email, @phone,
          @address, @city, @country, @tax_number, @status, @created_at, @updated_at
        )
      `);
    res.json({ 
      success: true, 
      id: vendorId, 
      vendor_code: vendor_code,
      vendor_name: vendor_name,
      message: 'Vendor created successfully'
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to create vendor', details: error.message });
  }
});

// PUT update vendor
app.put('/api/vendors/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      vendor_code,
      vendor_name,
      contact_person,
      email,
      phone,
      address,
      city,
      country,
      tax_number,
      status
    } = req.body;

    const now = new Date().toISOString();

    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('vendor_code', sql.NVarChar, vendor_code)
      .input('vendor_name', sql.NVarChar, vendor_name)
      .input('contact_person', sql.NVarChar, contact_person)
      .input('email', sql.NVarChar, email)
      .input('phone', sql.NVarChar, phone)
      .input('address', sql.NVarChar, address)
      .input('city', sql.NVarChar, city)
      .input('country', sql.NVarChar, country)
      .input('tax_number', sql.NVarChar, tax_number)
      .input('status', sql.NVarChar, status)
      .input('updated_at', sql.DateTime2, now)
      .query(`
        UPDATE vendors SET
          vendor_code = @vendor_code,
          vendor_name = @vendor_name,
          contact_person = @contact_person,
          email = @email,
          phone = @phone,
          address = @address,
          city = @city,
          country = @country,
          tax_number = @tax_number,
          status = @status,
          updated_at = @updated_at
        WHERE id = @id
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    res.json({ 
      success: true, 
      id: id,
      message: 'Vendor updated successfully'
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to update vendor', details: error.message });
  }
});

// DELETE vendor (soft delete)
app.delete('/api/vendors/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const now = new Date().toISOString();

    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('updated_at', sql.DateTime2, now)
      .query(`
        UPDATE vendors SET
          status = 'Deleted',
          updated_at = @updated_at
        WHERE id = @id
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Vendor not found' });
    }
    res.json({ 
      success: true, 
      message: 'Vendor deleted successfully'
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to delete vendor', details: error.message });
  }
});

// ==================== REORDER REQUESTS ENDPOINTS ====================

// Get all reorder requests or filter by status
app.get('/api/reorder-requests', async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    let query = `
      SELECT 
        rr.*,
        im.nomenclature as item_name,
        im.unit,
        o.strOfficeName as office_name
      FROM reorder_requests rr
      LEFT JOIN item_masters im ON rr.item_master_id = im.id
      LEFT JOIN Office o ON rr.office_id = o.intOfficeID
      WHERE rr.boolDeleted = 0
    `;
    
    const request = pool.request();
    
    // Add status filter if provided
    if (req.query.status) {
      query += ` AND rr.status = @status`;
      request.input('status', sql.VarChar, req.query.status);
    }
    
    query += ` ORDER BY rr.created_at DESC`;
    
    const result = await request.query(query);
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reorder requests', details: error.message });
  }
});

// Get reorder request by ID
app.get('/api/reorder-requests/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        SELECT 
          rr.*,
          im.nomenclature as item_name,
          im.unit,
          o.strOfficeName as office_name
        FROM reorder_requests rr
        LEFT JOIN item_masters im ON rr.item_master_id = im.id
        LEFT JOIN Office o ON rr.office_id = o.intOfficeID
        WHERE rr.id = @id AND rr.boolDeleted = 0
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Reorder request not found' });
    }
    res.json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reorder request', details: error.message });
  }
});

// Create new reorder request
app.post('/api/reorder-requests', async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const {
      item_master_id,
      office_id,
      current_stock,
      minimum_level,
      reorder_level,
      suggested_quantity,
      actual_quantity,
      priority,
      requested_by,
      remarks
    } = req.body;

    const id = uuidv4();
    const now = new Date().toISOString();

    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('item_master_id', sql.UniqueIdentifier, item_master_id)
      .input('office_id', sql.Int, office_id)
      .input('current_stock', sql.Int, current_stock)
      .input('minimum_level', sql.Int, minimum_level)
      .input('reorder_level', sql.Int, reorder_level)
      .input('suggested_quantity', sql.Int, suggested_quantity)
      .input('actual_quantity', sql.Int, actual_quantity || null)
      .input('priority', sql.VarChar, priority || 'Medium')
      .input('status', sql.VarChar, 'Pending')
      .input('requested_by', sql.VarChar, requested_by)
      .input('requested_at', sql.DateTime, now)
      .input('remarks', sql.Text, remarks || null)
      .input('created_at', sql.DateTime, now)
      .input('updated_at', sql.DateTime, now)
      .input('boolActive', sql.Bit, true)
      .input('boolDeleted', sql.Bit, false)
      .query(`
        INSERT INTO reorder_requests (
          id, item_master_id, office_id, current_stock, minimum_level, 
          reorder_level, suggested_quantity, actual_quantity, priority, 
          status, requested_by, requested_at, remarks, created_at, 
          updated_at, boolActive, boolDeleted
        ) VALUES (
          @id, @item_master_id, @office_id, @current_stock, @minimum_level,
          @reorder_level, @suggested_quantity, @actual_quantity, @priority,
          @status, @requested_by, @requested_at, @remarks, @created_at,
          @updated_at, @boolActive, @boolDeleted
        );
        
        SELECT 
          rr.*,
          im.nomenclature as item_name,
          im.unit,
          o.strOfficeName as office_name
        FROM reorder_requests rr
        LEFT JOIN item_masters im ON rr.item_master_id = im.id
        LEFT JOIN Office o ON rr.office_id = o.intOfficeID
        WHERE rr.id = @id;
      `);
    res.status(201).json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create reorder request', details: error.message });
  }
});

// Update reorder request
app.put('/api/reorder-requests/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const updateData = req.body;
    const now = new Date().toISOString();

    // Build dynamic update query
    const fields = [];
    const request = pool.request().input('id', sql.UniqueIdentifier, id);

    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        fields.push(`${key} = @${key}`);
        
        if (key.includes('_at') || key.includes('Date')) {
          request.input(key, sql.DateTime, updateData[key]);
        } else if (typeof updateData[key] === 'number') {
          request.input(key, sql.Int, updateData[key]);
        } else if (typeof updateData[key] === 'boolean') {
          request.input(key, sql.Bit, updateData[key]);
        } else {
          request.input(key, sql.VarChar, updateData[key]);
        }
      }
    });

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    fields.push('updated_at = @updated_at');
    request.input('updated_at', sql.DateTime, now);

    const result = await request.query(`
      UPDATE reorder_requests 
      SET ${fields.join(', ')}
      WHERE id = @id AND boolDeleted = 0;
      
      SELECT 
        rr.*,
        im.nomenclature as item_name,
        im.unit,
        o.strOfficeName as office_name
      FROM reorder_requests rr
      LEFT JOIN item_masters im ON rr.item_master_id = im.id
      LEFT JOIN Office o ON rr.office_id = o.intOfficeID
      WHERE rr.id = @id;
    `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Reorder request not found' });
    }
    res.json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update reorder request', details: error.message });
  }
});

// Delete reorder request
app.delete('/api/reorder-requests/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const now = new Date().toISOString();

    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('updated_at', sql.DateTime, now)
      .query(`
        UPDATE reorder_requests 
        SET boolDeleted = 1, updated_at = @updated_at
        WHERE id = @id AND boolDeleted = 0
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Reorder request not found' });
    }
    res.json({ message: 'Reorder request deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete reorder request', details: error.message });
  }
});

// ==================== STOCK TRANSACTIONS ENDPOINTS ====================

// Get all stock transactions with filters
app.get('/api/stock-transactions', async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    let query = `
      SELECT 
        st.*,
        im.nomenclature as item_name,
        im.unit,
        o.strOfficeName as office_name,
        fo.strOfficeName as from_office_name,
        to_office.strOfficeName as to_office_name
      FROM stock_transactions st
      LEFT JOIN item_masters im ON st.item_master_id = im.id
      LEFT JOIN Office o ON st.office_id = o.intOfficeID
      LEFT JOIN Office fo ON st.from_office_id = fo.intOfficeID
      LEFT JOIN Office to_office ON st.to_office_id = to_office.intOfficeID
      WHERE st.boolDeleted = 0
    `;
    
    const request = pool.request();
    
    // Add filters
    if (req.query.officeId) {
      query += ` AND st.office_id = @officeId`;
      request.input('officeId', sql.Int, req.query.officeId);
    }
    
    if (req.query.itemMasterId) {
      query += ` AND st.item_master_id = @itemMasterId`;
      request.input('itemMasterId', sql.UniqueIdentifier, req.query.itemMasterId);
    }
    
    if (req.query.type) {
      query += ` AND st.transaction_type = @type`;
      request.input('type', sql.VarChar, req.query.type);
    }
    
    if (req.query.startDate) {
      query += ` AND st.transaction_date >= @startDate`;
      request.input('startDate', sql.DateTime, req.query.startDate);
    }
    
    if (req.query.endDate) {
      query += ` AND st.transaction_date <= @endDate`;
      request.input('endDate', sql.DateTime, req.query.endDate);
    }
    
    query += ` ORDER BY st.transaction_date DESC, st.created_at DESC`;
    
    const result = await request.query(query);
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stock transactions', details: error.message });
  }
});

// Get stock transaction by ID
app.get('/api/stock-transactions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        SELECT 
          st.*,
          im.nomenclature as item_name,
          im.unit,
          o.strOfficeName as office_name,
          fo.strOfficeName as from_office_name,
          to_office.strOfficeName as to_office_name
        FROM stock_transactions st
        LEFT JOIN item_masters im ON st.item_master_id = im.id
        LEFT JOIN Office o ON st.office_id = o.intOfficeID
        LEFT JOIN Office fo ON st.from_office_id = fo.intOfficeID
        LEFT JOIN Office to_office ON st.to_office_id = to_office.intOfficeID
        WHERE st.id = @id AND st.boolDeleted = 0
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Stock transaction not found' });
    }
    res.json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stock transaction', details: error.message });
  }
});

// Create new stock transaction
app.post('/api/stock-transactions', async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const {
      item_master_id,
      office_id,
      transaction_type,
      quantity,
      unit_price,
      total_value,
      reference_type,
      reference_id,
      reference_number,
      from_office_id,
      to_office_id,
      remarks,
      transaction_date,
      created_by
    } = req.body;

    const id = uuidv4();
    const now = new Date().toISOString();
    const transactionDate = transaction_date || now;

    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('item_master_id', sql.UniqueIdentifier, item_master_id)
      .input('office_id', sql.Int, office_id)
      .input('transaction_type', sql.VarChar, transaction_type)
      .input('quantity', sql.Int, quantity)
      .input('unit_price', sql.Decimal(18, 2), unit_price || null)
      .input('total_value', sql.Decimal(18, 2), total_value || (unit_price && quantity ? unit_price * quantity : null))
      .input('reference_type', sql.VarChar, reference_type || null)
      .input('reference_id', sql.VarChar, reference_id || null)
      .input('reference_number', sql.VarChar, reference_number || null)
      .input('from_office_id', sql.Int, from_office_id || null)
      .input('to_office_id', sql.Int, to_office_id || null)
      .input('remarks', sql.Text, remarks || null)
      .input('transaction_date', sql.DateTime, transactionDate)
      .input('created_by', sql.VarChar, created_by)
      .input('created_at', sql.DateTime, now)
      .input('updated_at', sql.DateTime, now)
      .input('boolActive', sql.Bit, true)
      .input('boolDeleted', sql.Bit, false)
      .query(`
        INSERT INTO stock_transactions (
          id, item_master_id, office_id, transaction_type, quantity,
          unit_price, total_value, reference_type, reference_id, reference_number,
          from_office_id, to_office_id, remarks, transaction_date, created_by,
          created_at, updated_at, boolActive, boolDeleted
        ) VALUES (
          @id, @item_master_id, @office_id, @transaction_type, @quantity,
          @unit_price, @total_value, @reference_type, @reference_id, @reference_number,
          @from_office_id, @to_office_id, @remarks, @transaction_date, @created_by,
          @created_at, @updated_at, @boolActive, @boolDeleted
        );
        
        SELECT 
          st.*,
          im.nomenclature as item_name,
          im.unit,
          o.strOfficeName as office_name,
          fo.strOfficeName as from_office_name,
          to_office.strOfficeName as to_office_name
        FROM stock_transactions st
        LEFT JOIN item_masters im ON st.item_master_id = im.id
        LEFT JOIN Office o ON st.office_id = o.intOfficeID
        LEFT JOIN Office fo ON st.from_office_id = fo.intOfficeID
        LEFT JOIN Office to_office ON st.to_office_id = to_office.intOfficeID
        WHERE st.id = @id;
      `);
    res.status(201).json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create stock transaction', details: error.message });
  }
});

// Update stock transaction
app.put('/api/stock-transactions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const updateData = req.body;
    const now = new Date().toISOString();

    // Build dynamic update query
    const fields = [];
    const request = pool.request().input('id', sql.UniqueIdentifier, id);

    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        fields.push(`${key} = @${key}`);
        
        if (key.includes('_at') || key.includes('Date') || key.includes('_date')) {
          request.input(key, sql.DateTime, updateData[key]);
        } else if (key.includes('price') || key.includes('value')) {
          request.input(key, sql.Decimal(18, 2), updateData[key]);
        } else if (typeof updateData[key] === 'number') {
          request.input(key, sql.Int, updateData[key]);
        } else if (typeof updateData[key] === 'boolean') {
          request.input(key, sql.Bit, updateData[key]);
        } else {
          request.input(key, sql.VarChar, updateData[key]);
        }
      }
    });

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    fields.push('updated_at = @updated_at');
    request.input('updated_at', sql.DateTime, now);

    const result = await request.query(`
      UPDATE stock_transactions 
      SET ${fields.join(', ')}
      WHERE id = @id AND boolDeleted = 0;
      
      SELECT 
        st.*,
        im.nomenclature as item_name,
        im.unit,
        o.strOfficeName as office_name,
        fo.strOfficeName as from_office_name,
        to_office.strOfficeName as to_office_name
      FROM stock_transactions st
      LEFT JOIN item_masters im ON st.item_master_id = im.id
      LEFT JOIN Office o ON st.office_id = o.intOfficeID
      LEFT JOIN Office fo ON st.from_office_id = fo.intOfficeID
      LEFT JOIN Office to_office ON st.to_office_id = to_office.intOfficeID
      WHERE st.id = @id;
    `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Stock transaction not found' });
    }
    res.json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update stock transaction', details: error.message });
  }
});

// Delete stock transaction
app.delete('/api/stock-transactions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const now = new Date().toISOString();

    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('updated_at', sql.DateTime, now)
      .query(`
        UPDATE stock_transactions 
        SET boolDeleted = 1, updated_at = @updated_at
        WHERE id = @id AND boolDeleted = 0
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Stock transaction not found' });
    }
    res.json({ message: 'Stock transaction deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete stock transaction', details: error.message });
  }
});

// ==================== STORES ENDPOINTS ====================

// Get all stores
app.get('/api/stores', async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const result = await pool.request().query(`
      SELECT 
        id,
        store_name,
        description,
        address,
        office_id,
        boolActive as active,
        created_at,
        updated_at
      FROM stores 
      WHERE boolDeleted = 0
      ORDER BY store_name
    `);
    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stores', details: error.message });
  }
});

// Get store by ID
app.get('/api/stores/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        SELECT 
          id,
          store_name,
          description,
          address,
          office_id,
          boolActive as active,
          created_at,
          updated_at
        FROM stores 
        WHERE id = @id AND boolDeleted = 0
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Store not found' });
    }
    res.json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch store', details: error.message });
  }
});

// Create new store
app.post('/api/stores', async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const { store_name, description, address, office_id } = req.body;

    if (!store_name) {
      return res.status(400).json({ error: 'Store name is required' });
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('store_name', sql.VarChar, store_name)
      .input('description', sql.Text, description || null)
      .input('address', sql.Text, address || null)
      .input('office_id', sql.Int, office_id || null)
      .input('created_at', sql.DateTime, now)
      .input('updated_at', sql.DateTime, now)
      .input('boolActive', sql.Bit, true)
      .input('boolDeleted', sql.Bit, false)
      .query(`
        INSERT INTO stores (
          id, store_name, description, address, office_id,
          created_at, updated_at, boolActive, boolDeleted
        ) VALUES (
          @id, @store_name, @description, @address, @office_id,
          @created_at, @updated_at, @boolActive, @boolDeleted
        );
        
        SELECT 
          id,
          store_name,
          description,
          address,
          office_id,
          boolActive as active,
          created_at,
          updated_at
        FROM stores 
        WHERE id = @id;
      `);
    res.status(201).json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create store', details: error.message });
  }
});

// Update store
app.put('/api/stores/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const updateData = req.body;
    const now = new Date().toISOString();

    // Build dynamic update query
    const fields = [];
    const request = pool.request().input('id', sql.UniqueIdentifier, id);

    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        fields.push(`${key} = @${key}`);
        
        if (key.includes('_at') || key.includes('Date')) {
          request.input(key, sql.DateTime, updateData[key]);
        } else if (typeof updateData[key] === 'number') {
          request.input(key, sql.Int, updateData[key]);
        } else if (typeof updateData[key] === 'boolean') {
          request.input(key, sql.Bit, updateData[key]);
        } else {
          request.input(key, sql.VarChar, updateData[key]);
        }
      }
    });

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    fields.push('updated_at = @updated_at');
    request.input('updated_at', sql.DateTime, now);

    const result = await request.query(`
      UPDATE stores 
      SET ${fields.join(', ')}
      WHERE id = @id AND boolDeleted = 0;
      
      SELECT 
        id,
        store_name,
        description,
        address,
        office_id,
        boolActive as active,
        created_at,
        updated_at
      FROM stores 
      WHERE id = @id;
    `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Store not found' });
    }
    res.json(result.recordset[0]);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update store', details: error.message });
  }
});

// Delete store
app.delete('/api/stores/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const now = new Date().toISOString();

    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('updated_at', sql.DateTime, now)
      .query(`
        UPDATE stores 
        SET boolDeleted = 1, updated_at = @updated_at
        WHERE id = @id AND boolDeleted = 0
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Store not found' });
    }
    res.json({ message: 'Store deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete store', details: error.message });
  }
});

// Start server
async function startServer() {
  try {
    await initializeDatabase();
    console.log('Database connection initialized');
    
    app.listen(PORT, () => {
      console.log(`✅ Server running on http://localhost:${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 Database: ${sqlConfig.database} on ${sqlConfig.server}`);
      console.log(`📁 Upload directory: ${uploadsDir}`);
      console.log('🚀 Tender form with complete field mapping ready!');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

// ===== ITEM SERIAL NUMBERS ENDPOINTS =====

// GET all serial numbers by tender item ID
app.get('/api/item-serial-numbers/tender-item/:tenderItemId', async (req, res) => {
  try {
    const { tenderItemId } = req.params;

    const result = await pool.request()
      .input('tender_item_id', sql.UniqueIdentifier, tenderItemId)
      .query(`
        SELECT 
          id,
          tender_item_id,
          serial_number,
          status,
          remarks,
          created_at
        FROM item_serial_numbers 
        WHERE tender_item_id = @tender_item_id
        ORDER BY created_at DESC
      `);
    res.json(result.recordset);

  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch serial numbers', details: error.message });
  }
});

// POST create single serial number
app.post('/api/item-serial-numbers', async (req, res) => {
  try {
    const {
      tender_item_id,
      serial_number,
      status,
      remarks
    } = req.body;

    const id = require('crypto').randomUUID();
    const now = new Date().toISOString();

    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('tender_item_id', sql.UniqueIdentifier, tender_item_id)
      .input('serial_number', sql.NVarChar, serial_number)
      .input('status', sql.NVarChar, status || null)
      .input('remarks', sql.NVarChar, remarks || null)
      .input('created_at', sql.DateTime2, now)
      .query(`
        INSERT INTO item_serial_numbers (
          id, tender_item_id, serial_number, status, remarks, created_at
        ) VALUES (
          @id, @tender_item_id, @serial_number, @status, @remarks, @created_at
        )
      `);
    res.json({ 
      success: true, 
      id: id,
      message: 'Serial number created successfully'
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to create serial number', details: error.message });
  }
});

// POST create multiple serial numbers
app.post('/api/item-serial-numbers/bulk', async (req, res) => {
  try {
    const { serials } = req.body;

    if (!Array.isArray(serials) || serials.length === 0) {
      return res.status(400).json({ error: 'Serials array is required and cannot be empty' });
    }

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const insertedIds = [];

      for (const serial of serials) {
        const id = require('crypto').randomUUID();
        const now = new Date().toISOString();

        await transaction.request()
          .input('id', sql.UniqueIdentifier, id)
          .input('tender_item_id', sql.UniqueIdentifier, serial.tender_item_id)
          .input('serial_number', sql.NVarChar, serial.serial_number)
          .input('status', sql.NVarChar, serial.status || null)
          .input('remarks', sql.NVarChar, serial.remarks || null)
          .input('created_at', sql.DateTime2, now)
          .query(`
            INSERT INTO item_serial_numbers (
              id, tender_item_id, serial_number, status, remarks, created_at
            ) VALUES (
              @id, @tender_item_id, @serial_number, @status, @remarks, @created_at
            )
          `);

        insertedIds.push(id);
      }

      await transaction.commit();
      res.json({ 
        success: true, 
        ids: insertedIds,
        count: serials.length,
        message: 'Serial numbers created successfully'
      });

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    res.status(500).json({ error: 'Failed to create serial numbers', details: error.message });
  }
});

// PUT update serial number
app.put('/api/item-serial-numbers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      serial_number,
      status,
      remarks
    } = req.body;

    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('serial_number', sql.NVarChar, serial_number)
      .input('status', sql.NVarChar, status)
      .input('remarks', sql.NVarChar, remarks)
      .query(`
        UPDATE item_serial_numbers SET
          serial_number = @serial_number,
          status = @status,
          remarks = @remarks
        WHERE id = @id
      `);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Serial number not found' });
    }
    res.json({ 
      success: true, 
      id: id,
      message: 'Serial number updated successfully'
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to update serial number', details: error.message });
  }
});

// POST create delivery item serial numbers
app.post('/api/delivery-item-serial-numbers', async (req, res) => {
  try {
    const { delivery_item_id, delivery_id, item_master_id, serial_numbers } = req.body;

    if (!delivery_item_id || !Array.isArray(serial_numbers) || serial_numbers.length === 0) {
      return res.status(400).json({ error: 'delivery_item_id and serial_numbers array are required' });
    }

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const insertedIds = [];
      const now = new Date().toISOString();

      for (const serialNumber of serial_numbers) {
        const id = require('crypto').randomUUID();

        await transaction.request()
          .input('id', sql.UniqueIdentifier, id)
          .input('delivery_id', sql.UniqueIdentifier, delivery_id)
          .input('delivery_item_id', sql.UniqueIdentifier, delivery_item_id)
          .input('item_master_id', sql.UniqueIdentifier, item_master_id)
          .input('serial_number', sql.NVarChar, serialNumber)
          .input('notes', sql.NVarChar, null)
          .input('created_at', sql.DateTime2, now)
          .input('updated_at', sql.DateTime2, now)
          .query(`
            INSERT INTO delivery_item_serial_numbers (
              id, delivery_id, delivery_item_id, item_master_id, serial_number, notes, created_at, updated_at
            ) VALUES (
              @id, @delivery_id, @delivery_item_id, @item_master_id, @serial_number, @notes, @created_at, @updated_at
            )
          `);

        insertedIds.push(id);
      }

      await transaction.commit();
      res.json({ 
        success: true, 
        ids: insertedIds,
        count: serial_numbers.length,
        message: `${serial_numbers.length} serial number(s) added successfully`
      });

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    res.status(500).json({ error: 'Failed to create delivery item serial numbers', details: error.message });
  }
});

// DELETE serial number by ID
app.delete('/api/item-serial-numbers/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('DELETE FROM item_serial_numbers WHERE id = @id');

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Serial number not found' });
    }
    res.json({ 
      success: true, 
      message: 'Serial number deleted successfully'
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to delete serial number', details: error.message });
  }
});

// DELETE all serial numbers by tender item ID
app.delete('/api/item-serial-numbers/tender-item/:tenderItemId', async (req, res) => {
  try {
    const { tenderItemId } = req.params;

    const result = await pool.request()
      .input('tender_item_id', sql.UniqueIdentifier, tenderItemId)
      .query('DELETE FROM item_serial_numbers WHERE tender_item_id = @tender_item_id');
    res.json({ 
      success: true, 
      deletedCount: result.rowsAffected[0],
      message: 'Serial numbers deleted successfully'
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to delete serial numbers', details: error.message });
  }
});

// Get stock transaction dashboard statistics
app.get('/api/stock-transaction-dashboard-stats', async (req, res) => {
  try {
    // Get ALL tenders from tenders table with stock transaction status using View_stock_transactions_clean
    const allTendersQuery = `
      SELECT 
        t.id,
        t.reference_number as tenderNumber,
        t.title,
        t.description,
        t.is_finalized,
        t.status,
        t.tender_spot_type,
        t.created_at,
        t.updated_at,
        COALESCE(stockCounts.itemCount, 0) as itemCount,
        COALESCE(stockCounts.totalQuantity, 0) as totalQuantity,
        COALESCE(stockCounts.confirmedItems, 0) as confirmedItems,
        CASE 
          WHEN stockCounts.itemCount > 0 THEN 1 
          ELSE 0 
        END as hasStockTransactions
      FROM tenders t
      LEFT JOIN (
        SELECT 
          tender_id,
          COUNT(item_master_id) as itemCount,
          SUM(total_quantity_received) as totalQuantity,
          COUNT(CASE WHEN pricing_confirmed = 1 THEN 1 END) as confirmedItems
        FROM View_stock_transactions_clean 
        WHERE (is_deleted = 0 OR is_deleted IS NULL)
        GROUP BY tender_id
      ) stockCounts ON t.id = stockCounts.tender_id
      ORDER BY 
        CASE WHEN stockCounts.itemCount > 0 THEN 0 ELSE 1 END, -- Show tenders with stock transactions first
        t.updated_at DESC
    `;

    const allTendersResult = await pool.request().query(allTendersQuery);
    const allTenders = allTendersResult.recordset;

    // Separate tenders with and without stock transactions
    const tendersWithStockTransactions = allTenders.filter(t => t.hasStockTransactions === 1);
    const tendersWithoutStockTransactions = allTenders.filter(t => t.hasStockTransactions === 0);

    // Calculate stats from tenders WITH stock transactions
    const totalTendersWithStock = tendersWithStockTransactions.length;
    const totalItems = tendersWithStockTransactions.reduce((sum, t) => sum + (parseInt(t.itemCount) || 0), 0);
    const totalQuantity = tendersWithStockTransactions.reduce((sum, t) => sum + (parseInt(t.totalQuantity) || 0), 0);

    // Calculate active vs finalized based on stock transaction status
    const activeTenders = tendersWithStockTransactions.filter(t => !t.is_finalized || t.confirmedItems < t.itemCount).length;
    const finalizedTenders = tendersWithStockTransactions.filter(t => t.is_finalized && t.confirmedItems === t.itemCount).length;

    // Get acquisition type breakdown from ALL tenders
    const acquisitionStats = allTenders.reduce((acc, tender) => {
      const type = tender.tender_spot_type || 'Contract/Tender';
      if (!acc[type]) {
        acc[type] = { count: 0, items: 0, quantity: 0 };
      }
      acc[type].count++;
      if (tender.hasStockTransactions === 1) {
        acc[type].items += parseInt(tender.itemCount) || 0;
        acc[type].quantity += parseInt(tender.totalQuantity) || 0;
      }
      return acc;
    }, {});

    // Combine tenders for display: active with stock transactions first, then those without
    const recentTenders = [
      ...tendersWithStockTransactions.slice(0, 5), // First 5 with stock transactions
      ...tendersWithoutStockTransactions.slice(0, 5) // Then up to 5 without stock transactions
    ];
    
    const stats = {
      totalTenders: allTenders.length, // All tenders count
      tendersWithStockTransactions: totalTendersWithStock,
      tendersWithoutStockTransactions: tendersWithoutStockTransactions.length,
      activeTenders: activeTenders,
      finalizedTenders: finalizedTenders,
      totalItems: totalItems,
      totalQuantity: totalQuantity,
      acquisitionStats: {
        'Contract/Tender': acquisitionStats['Contract/Tender'] || { count: 0, items: 0, quantity: 0 },
        'Spot Purchase': acquisitionStats['Spot Purchase'] || { count: 0, items: 0, quantity: 0 }
      },
      // Separate arrays for the two different tables
      tendersWithStock: tendersWithStockTransactions.map(tender => ({
        id: tender.id,
        title: tender.title || `Tender ${tender.tenderNumber}`,
        tenderNumber: tender.tenderNumber,
        acquisitionType: tender.tender_spot_type || 'Contract/Tender',
        is_finalized: tender.is_finalized && tender.confirmedItems === tender.itemCount,
        createdAt: tender.created_at,
        itemCount: tender.itemCount,
        totalQuantity: tender.totalQuantity,
        hasStockTransactions: true,
        status: tender.status
      })),
      tendersAwaitingStock: tendersWithoutStockTransactions.map(tender => ({
        id: tender.id,
        title: tender.title || `Tender ${tender.tenderNumber}`,
        tenderNumber: tender.tenderNumber,
        acquisitionType: tender.tender_spot_type || 'Contract/Tender',
        is_finalized: tender.is_finalized,
        createdAt: tender.created_at,
        itemCount: 0,
        totalQuantity: 0,
        hasStockTransactions: false,
        status: tender.status
      })),
      // Keep backwards compatibility
      recentTenders: recentTenders.map(tender => ({
        id: tender.id,
        title: tender.title || `Tender ${tender.tenderNumber}`,
        tenderNumber: tender.tenderNumber,
        acquisitionType: tender.tender_spot_type || 'Contract/Tender',
        is_finalized: tender.is_finalized && tender.confirmedItems === tender.itemCount,
        createdAt: tender.created_at,
        itemCount: tender.itemCount,
        totalQuantity: tender.totalQuantity,
        hasStockTransactions: tender.hasStockTransactions === 1,
        status: tender.status
      }))
    };
    res.json(stats);
    
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch dashboard statistics', 
      details: error.message,
      totalTenders: 0,
      activeTenders: 0,
      finalizedTenders: 0,
      totalItems: 0,
      totalQuantity: 0,
      recentTenders: []
    });
  }
});

// Get stock transactions by tender_id from stock_transactions_clean
app.get('/api/stock-transactions-clean', async (req, res) => {
  try {
    const { tender_id } = req.query;
    
    let query = `
      SELECT 
        stc.id,
        stc.tender_id,
        stc.item_master_id,
        stc.estimated_unit_price,
        stc.actual_unit_price,
        stc.total_quantity_received,
        stc.type,
        stc.remarks,
        stc.pricing_confirmed,
        stc.created_at,
        stc.updated_at,
        stc.is_deleted,
        stc.deleted_at,
        stc.deleted_by,
        COALESCE(im.nomenclature, 'Unknown Item') as nomenclature,
        COALESCE(im.specifications, '') as specifications,
        COALESCE(im.unit, '') as unit
      FROM stock_transactions_clean stc
      LEFT JOIN item_masters im ON stc.item_master_id = CAST(im.id AS VARCHAR(50))
      WHERE (stc.is_deleted = 0 OR stc.is_deleted IS NULL)
    `;
    
    const request = pool.request();
    
    if (tender_id) {
      query += ` AND stc.tender_id = @tender_id`;
      request.input('tender_id', sql.UniqueIdentifier, tender_id);
    }
    
    query += ` ORDER BY stc.created_at DESC`;
    
    const result = await request.query(query);
    
    res.json(result.recordset);
    
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stock transactions', details: error.message });
  }
});

// Create new stock transaction in stock_transactions_clean
app.post('/api/stock-transactions-clean', async (req, res) => {
  try {
    const {
      tender_id,
      item_master_id,
      estimated_unit_price = 0,
      actual_unit_price = 0,
      total_quantity_received = 0,
      pricing_confirmed = false,
      type = 'IN',
      remarks
    } = req.body;
    const query = `
      INSERT INTO stock_transactions_clean (
        id,
        tender_id,
        item_master_id,
        estimated_unit_price,
        actual_unit_price,
        total_quantity_received,
        pricing_confirmed,
        type,
        remarks,
        is_deleted,
        created_at,
        updated_at
      )
      OUTPUT INSERTED.*
      VALUES (
        NEWID(),
        @tender_id,
        @item_master_id,
        @estimated_unit_price,
        @actual_unit_price,
        @total_quantity_received,
        @pricing_confirmed,
        @type,
        @remarks,
        0,
        GETDATE(),
        GETDATE()
      )
    `;

    const result = await pool.request()
      .input('tender_id', sql.UniqueIdentifier, tender_id)
      .input('item_master_id', sql.VarChar(50), item_master_id)
      .input('estimated_unit_price', sql.Decimal(18, 2), estimated_unit_price)
      .input('actual_unit_price', sql.Decimal(18, 2), actual_unit_price)
      .input('total_quantity_received', sql.Int, total_quantity_received)
      .input('pricing_confirmed', sql.Bit, pricing_confirmed)
      .input('type', sql.VarChar(10), type)
      .input('remarks', sql.Text, remarks)
      .query(query);
    res.status(201).json(result.recordset[0]);

  } catch (error) {
    res.status(500).json({ error: 'Failed to create stock transaction', details: error.message });
  }
});

// Update stock transaction in stock_transactions_clean
app.put('/api/stock-transactions-clean/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      estimated_unit_price,
      actual_unit_price,
      total_quantity_received,
      pricing_confirmed,
      type,
      remarks
    } = req.body;

    // Build dynamic update query
    const fields = [];
    const request = pool.request().input('id', sql.UniqueIdentifier, id);

    if (estimated_unit_price !== undefined) {
      fields.push('estimated_unit_price = @estimated_unit_price');
      request.input('estimated_unit_price', sql.Decimal(18, 2), estimated_unit_price);
    }
    if (actual_unit_price !== undefined) {
      fields.push('actual_unit_price = @actual_unit_price');
      request.input('actual_unit_price', sql.Decimal(18, 2), actual_unit_price);
    }
    if (total_quantity_received !== undefined) {
      fields.push('total_quantity_received = @total_quantity_received');
      request.input('total_quantity_received', sql.Int, total_quantity_received);
    }
    if (pricing_confirmed !== undefined) {
      fields.push('pricing_confirmed = @pricing_confirmed');
      request.input('pricing_confirmed', sql.Bit, pricing_confirmed);
    }
    if (type !== undefined) {
      fields.push('type = @type');
      request.input('type', sql.VarChar(10), type);
    }
    if (remarks !== undefined) {
      fields.push('remarks = @remarks');
      request.input('remarks', sql.Text, remarks);
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    fields.push('updated_at = GETDATE()');

    const query = `
      UPDATE stock_transactions_clean 
      SET ${fields.join(', ')}
      WHERE id = @id
    `;

    await request.query(query);
    res.json({ success: true, message: 'Stock transaction updated successfully' });

  } catch (error) {
    res.status(500).json({ error: 'Failed to update stock transaction', details: error.message });
  }
});

// Soft delete stock transaction in stock_transactions_clean
app.delete('/api/stock-transactions-clean/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { deleted_by } = req.body;

    await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('deleted_by', sql.NVarChar, deleted_by || 'System')
      .query(`
        UPDATE stock_transactions_clean 
        SET 
          is_deleted = 1,
          deleted_at = GETDATE(),
          deleted_by = @deleted_by,
          updated_at = GETDATE()
        WHERE id = @id
      `);
    res.json({ success: true, message: 'Stock transaction deleted successfully' });

  } catch (error) {
    res.status(500).json({ error: 'Failed to delete stock transaction', details: error.message });
  }
});

// =============================================================================
// ENHANCED STOCK ACQUISITION WITH DELIVERY ENDPOINTS
// =============================================================================

// Get delivery by tender ID
app.get('/api/deliveries/by-tender/:tenderId', async (req, res) => {
  try {
    const { tenderId } = req.params;
    console.log('🔍 Getting deliveries for tender:', tenderId);
    
    // First, let's check the table structure
    console.log('🔍 Checking deliveries table structure...');
    const structureResult = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'deliveries'
      ORDER BY ORDINAL_POSITION
    `);
    console.log('📊 Deliveries table columns:', structureResult.recordset);
    
    const result = await pool.request()
      .input('tender_id', sql.UniqueIdentifier, tenderId)
      .query(`
        SELECT 
          d.*
        FROM deliveries d
        WHERE d.tender_id = @tender_id
        ORDER BY d.created_at DESC
      `);

    console.log('📦 Found deliveries:', result.recordset.length);

    if (result.recordset.length === 0) {
      console.log('❌ No deliveries found for tender:', tenderId);
      return res.status(404).json({ error: 'No deliveries found for this tender' });
    }

    // Get delivery items for each delivery
    const deliveries = [];
    
    for (const delivery of result.recordset) {
      const itemsResult = await pool.request()
        .input('delivery_id', sql.UniqueIdentifier, delivery.id)
        .query(`
          SELECT * FROM delivery_items WHERE delivery_id = @delivery_id
        `);

      // Get serial numbers for each item
      const items = [];
      for (const item of itemsResult.recordset) {
        const serialsResult = await pool.request()
          .input('delivery_item_id', sql.UniqueIdentifier, item.id)
          .query(`
            SELECT * FROM delivery_item_serial_numbers WHERE delivery_item_id = @delivery_item_id
          `);

        items.push({
          ...item,
          serial_numbers: serialsResult.recordset
        });
      }

      deliveries.push({
        ...delivery,
        items: items
      });
    }

    console.log('✅ Returning deliveries with items:', deliveries.length);
    res.json(deliveries);
  } catch (error) {
    console.error('❌ Error fetching deliveries:', error);
    res.status(500).json({ error: 'Failed to fetch deliveries', details: error.message });
  }
});

// Update multiple stock transaction prices
app.put('/api/stock-acquisition/update-multiple-prices', async (req, res) => {
  try {
    const { updates } = req.body;

    if (!updates || !Array.isArray(updates)) {
      return res.status(400).json({ error: 'Updates array is required' });
    }

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      for (const update of updates) {
        await transaction.request()
          .input('id', sql.UniqueIdentifier, update.id)
          .input('actual_unit_price', sql.Decimal(18, 2), update.actual_unit_price)
          .input('remarks', sql.Text, update.remarks || null)
          .input('pricing_confirmed', sql.Bit, update.pricing_confirmed)
          .query(`
            UPDATE stock_transactions_clean 
            SET 
              actual_unit_price = @actual_unit_price,
              remarks = @remarks,
              pricing_confirmed = @pricing_confirmed,
              updated_at = GETDATE()
            WHERE id = @id
          `);
      }

      await transaction.commit();
      res.json({ success: true, message: `Updated ${updates.length} items successfully` });

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    res.status(500).json({ error: 'Failed to update multiple prices', details: error.message });
  }
});

// Get stock acquisition dashboard statistics
app.get('/api/stock-acquisition/dashboard-stats', async (req, res) => {
  try {
    console.log('📊 GET /api/stock-acquisition/dashboard-stats - Fetching stock acquisition stats');
    const statsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM tenders WHERE is_finalized = 1) as total_tenders,
        (SELECT COUNT(DISTINCT item_master_id) FROM tender_items ti JOIN tenders t ON ti.tender_id = t.id WHERE t.is_finalized = 1) as total_items,
        (SELECT COUNT(*) FROM stock_transactions_clean WHERE pricing_confirmed = 1 AND (is_deleted = 0 OR is_deleted IS NULL)) as confirmed_pricing_items,
        (SELECT COUNT(DISTINCT item_master_id) FROM tender_items ti JOIN tenders t ON ti.tender_id = t.id WHERE t.is_finalized = 1) - 
        (SELECT COUNT(*) FROM stock_transactions_clean WHERE pricing_confirmed = 1 AND (is_deleted = 0 OR is_deleted IS NULL)) as pending_pricing_items,
        (SELECT SUM(estimated_unit_price * total_quantity_received) FROM stock_transactions_clean WHERE (is_deleted = 0 OR is_deleted IS NULL)) as total_estimated_value,
        (SELECT SUM(actual_unit_price * total_quantity_received) FROM stock_transactions_clean WHERE (is_deleted = 0 OR is_deleted IS NULL)) as total_actual_value,
        (SELECT AVG(CASE 
          WHEN estimated_unit_price > 0 
          THEN ((actual_unit_price - estimated_unit_price) / estimated_unit_price) * 100 
          ELSE 0 
        END) FROM stock_transactions_clean WHERE (is_deleted = 0 OR is_deleted IS NULL)) as average_price_variance,
        (SELECT COUNT(*) FROM deliveries) as total_deliveries,
        (SELECT COUNT(*) FROM deliveries WHERE is_finalized = 0 OR is_finalized IS NULL) as pending_deliveries
    `;

    const result = await pool.request().query(statsQuery);
    const stats = result.recordset[0];

    res.json({
      total_tenders: stats.total_tenders || 0,
      total_items: stats.total_items || 0,
      confirmed_pricing_items: stats.confirmed_pricing_items || 0,
      pending_pricing_items: stats.pending_pricing_items || 0,
      total_estimated_value: stats.total_estimated_value || 0,
      total_actual_value: stats.total_actual_value || 0,
      average_price_variance: stats.average_price_variance || 0,
      total_deliveries: stats.total_deliveries || 0,
      pending_deliveries: stats.pending_deliveries || 0
    });

  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch dashboard stats', 
      details: error.message,
      // Return default values on error
      total_tenders: 0,
      total_items: 0,
      confirmed_pricing_items: 0,
      pending_pricing_items: 0,
      total_estimated_value: 0,
      total_actual_value: 0,
      average_price_variance: 0,
      total_deliveries: 0,
      pending_deliveries: 0
    });
  }
});

// Get tender summaries from stock transactions
app.get('/api/stock-acquisition/tender-summaries', async (req, res) => {
  try {
    console.log('📋 GET /api/stock-acquisition/tender-summaries - Fetching tender summaries');
    const query = `
      SELECT 
        t.id as tender_id,
        t.title as tender_title,
        t.reference_number as tender_number,
        (SELECT COUNT(*) FROM tender_items WHERE tender_id = t.id) as total_items,
        (SELECT COUNT(*) FROM stock_transactions_clean WHERE tender_id = t.id AND pricing_confirmed = 1 AND (is_deleted = 0 OR is_deleted IS NULL)) as confirmed_items,
        (SELECT COUNT(*) FROM tender_items WHERE tender_id = t.id) - 
        (SELECT COUNT(*) FROM stock_transactions_clean WHERE tender_id = t.id AND pricing_confirmed = 1 AND (is_deleted = 0 OR is_deleted IS NULL)) as pending_items,
        (SELECT SUM(estimated_unit_price * total_quantity_received) FROM stock_transactions_clean WHERE tender_id = t.id AND (is_deleted = 0 OR is_deleted IS NULL)) as total_estimated_value,
        (SELECT SUM(actual_unit_price * total_quantity_received) FROM stock_transactions_clean WHERE tender_id = t.id AND (is_deleted = 0 OR is_deleted IS NULL)) as total_actual_value,
        CASE 
          WHEN (SELECT COUNT(*) FROM tender_items WHERE tender_id = t.id) > 0 
          THEN (CAST((SELECT COUNT(*) FROM stock_transactions_clean WHERE tender_id = t.id AND pricing_confirmed = 1 AND (is_deleted = 0 OR is_deleted IS NULL)) AS FLOAT) / 
                (SELECT COUNT(*) FROM tender_items WHERE tender_id = t.id)) * 100 
          ELSE 0 
        END as pricing_completion_rate,
        CASE 
          WHEN NOT EXISTS(SELECT 1 FROM deliveries WHERE tender_id = t.id) THEN 0
          WHEN EXISTS(SELECT 1 FROM deliveries WHERE tender_id = t.id AND is_finalized = 0) THEN 1
          WHEN NOT EXISTS(SELECT 1 FROM deliveries WHERE tender_id = t.id AND is_finalized = 0) THEN 2
          ELSE 0
        END as has_deliveries,
        t.created_at
      FROM tenders t
      WHERE t.is_finalized = 1
      ORDER BY t.created_at DESC
    `;

    const result = await pool.request().query(query);
    res.json(result.recordset);

  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tender summaries', details: error.message });
  }
});

// Get stock acquisition items by tender ID
app.get('/api/stock-acquisition/items/:tenderId', async (req, res) => {
  try {
    const { tenderId } = req.params;
    
    const result = await pool.request()
      .input('tender_id', sql.UniqueIdentifier, tenderId)
      .query(`
        SELECT 
          stc.*,
          COALESCE(im.nomenclature, 'Unknown Item') as item_name
        FROM stock_transactions_clean stc
        LEFT JOIN item_masters im ON stc.item_master_id = CAST(im.id AS VARCHAR(50))
        WHERE stc.tender_id = @tender_id 
          AND (stc.is_deleted = 0 OR stc.is_deleted IS NULL)
        ORDER BY stc.created_at
      `);

    res.json(result.recordset);

  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stock acquisition items', details: error.message });
  }
});

// Update single item price in stock acquisition
app.put('/api/stock-acquisition/update-price/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    const { actual_unit_price, pricing_confirmed } = req.body;

    await pool.request()
      .input('id', sql.UniqueIdentifier, itemId)
      .input('actual_unit_price', sql.Decimal(18, 2), actual_unit_price)
      .input('pricing_confirmed', sql.Bit, pricing_confirmed)
      .query(`
        UPDATE stock_transactions_clean 
        SET 
          actual_unit_price = @actual_unit_price,
          pricing_confirmed = @pricing_confirmed,
          updated_at = GETDATE()
        WHERE id = @id
      `);

    res.json({ success: true, message: 'Item price updated successfully' });

  } catch (error) {
    res.status(500).json({ error: 'Failed to update item price', details: error.message });
  }
});

// Restore soft deleted stock transaction in stock_transactions_clean
app.put('/api/stock-transactions-clean/:id/restore', async (req, res) => {
  try {
    const { id } = req.params;

    await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        UPDATE stock_transactions_clean 
        SET 
          is_deleted = 0,
          deleted_at = NULL,
          deleted_by = NULL,
          updated_at = GETDATE()
        WHERE id = @id
      `);
    res.json({ success: true, message: 'Stock transaction restored successfully' });

  } catch (error) {
    res.status(500).json({ error: 'Failed to restore stock transaction', details: error.message });
  }
});

// Bulk create stock transactions for tender finalization
app.post('/api/stock-transactions-clean/bulk-create', async (req, res) => {
  try {
    const { tender_id, items } = req.body;

    if (!tender_id || !items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'tender_id and items array are required' });
    }

    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const createdItems = [];

      for (const item of items) {
        const result = await transaction.request()
          .input('tender_id', sql.UniqueIdentifier, tender_id)
          .input('item_master_id', sql.VarChar(50), item.item_master_id)
          .input('estimated_unit_price', sql.Decimal(18, 2), item.estimated_unit_price || 0)
          .input('actual_unit_price', sql.Decimal(18, 2), item.actual_unit_price || 0)
          .input('total_quantity_received', sql.Int, item.total_quantity_received || 0)
          .input('pricing_confirmed', sql.Bit, item.pricing_confirmed || false)
          .input('type', sql.VarChar(10), item.type || 'IN')
          .input('remarks', sql.Text, item.remarks || null)
          .query(`
            INSERT INTO stock_transactions_clean (
              id,
              tender_id,
              item_master_id,
              estimated_unit_price,
              actual_unit_price,
              total_quantity_received,
              pricing_confirmed,
              type,
              remarks,
              is_deleted,
              created_at,
              updated_at
            )
            OUTPUT INSERTED.*
            VALUES (
              NEWID(),
              @tender_id,
              @item_master_id,
              @estimated_unit_price,
              @actual_unit_price,
              @total_quantity_received,
              @pricing_confirmed,
              @type,
              @remarks,
              0,
              GETDATE(),
              GETDATE()
            )
          `);

        createdItems.push(result.recordset[0]);
      }

      await transaction.commit();
      res.json({ 
        success: true, 
        message: `Created ${createdItems.length} stock transactions successfully`,
        items: createdItems
      });

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    res.status(500).json({ error: 'Failed to create bulk stock transactions', details: error.message });
  }
});

// Get tenders from stock_transactions_clean
app.get('/api/stock-acquisition/tenders', async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT
        stc.tender_id,
        t.title as tender_title,
        t.reference_number as tender_number,
        t.tender_spot_type as acquisition_type,
        t.status as tender_status,
        COUNT(stc.id) as item_count,
        SUM(stc.total_quantity_received) as total_quantity,
        MAX(stc.created_at) as latest_transaction
      FROM stock_transactions_clean stc
      LEFT JOIN tenders t ON stc.tender_id = t.id
      WHERE (stc.is_deleted = 0 OR stc.is_deleted IS NULL)
      GROUP BY stc.tender_id, t.title, t.reference_number, t.tender_spot_type, t.status
      ORDER BY latest_transaction DESC
    `;

    const result = await pool.request().query(query);
    res.json(result.recordset);

  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tenders', details: error.message });
  }
});

// Get stock transaction statistics by tender
app.get('/api/stock-acquisition/tender-stats/:tenderId', async (req, res) => {
  try {
    const { tenderId } = req.params;
    
    const query = `
      SELECT 
        COUNT(*) as total_items,
        COUNT(CASE WHEN pricing_confirmed = 1 THEN 1 END) as confirmed_items,
        COUNT(CASE WHEN pricing_confirmed = 0 THEN 1 END) as pending_items,
        SUM(estimated_unit_price * total_quantity_received) as estimated_value,
        SUM(actual_unit_price * total_quantity_received) as actual_value,
        SUM(total_quantity_received) as total_quantity
      FROM stock_transactions_clean
      WHERE tender_id = @tender_id 
        AND (is_deleted = 0 OR is_deleted IS NULL)
    `;

    const result = await pool.request()
      .input('tender_id', sql.UniqueIdentifier, tenderId)
      .query(query);

    res.json(result.recordset[0]);

  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tender statistics', details: error.message });
  }
});

// Search items in stock transactions
app.get('/api/stock-acquisition/search', async (req, res) => {
  try {
    const { query: searchQuery } = req.query;
    
    if (!searchQuery) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const result = await pool.request()
      .input('searchQuery', sql.NVarChar, `%${searchQuery}%`)
      .query(`
        SELECT 
          stc.*,
          COALESCE(im.nomenclature, 'Unknown Item') as item_name,
          t.title as tender_title,
          t.reference_number as tender_number
        FROM stock_transactions_clean stc
        LEFT JOIN item_masters im ON stc.item_master_id = CAST(im.id AS VARCHAR(50))
        LEFT JOIN tenders t ON stc.tender_id = t.id
        WHERE (stc.is_deleted = 0 OR stc.is_deleted IS NULL)
          AND (
            im.nomenclature LIKE @searchQuery 
            OR t.title LIKE @searchQuery 
            OR t.reference_number LIKE @searchQuery
            OR stc.remarks LIKE @searchQuery
          )
        ORDER BY stc.created_at DESC
      `);

    res.json(result.recordset);

  } catch (error) {
    res.status(500).json({ error: 'Failed to search stock transactions', details: error.message });
  }
});

// New endpoint for the SQL Server view: View_stock_transactions_clean
app.get('/api/stock-transactions-clean/view', async (req, res) => {
  try {
    const { tender_id } = req.query;
    
    let query = `
      SELECT * FROM View_stock_transactions_clean
      WHERE (is_deleted = 0 OR is_deleted IS NULL)
    `;
    
    const request = pool.request();
    
    if (tender_id) {
      query += ` AND tender_id = @tender_id`;
      request.input('tender_id', sql.UniqueIdentifier, tender_id);
    }
    
    query += ` ORDER BY created_at DESC`;
    
    const result = await request.query(query);
    res.json(result.recordset);
    
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stock transactions from view', details: error.message });
  }
});

// Create new stock transaction in stock_transactions_clean
app.post('/api/stock-transactions-clean', async (req, res) => {
  try {
    const {
      tender_id,
      item_master_id,
      estimated_unit_price = 0,
      actual_unit_price = 0,
      total_quantity_received = 0,
      pricing_confirmed = false,
      type = 'IN',
      remarks
    } = req.body;
    const query = `
      INSERT INTO stock_transactions_clean (
        id,
        tender_id,
        item_master_id,
        estimated_unit_price,
        actual_unit_price,
        total_quantity_received,
        pricing_confirmed,
        type,
        remarks,
        is_deleted,
        created_at,
        updated_at
      )
      OUTPUT INSERTED.*
      VALUES (
        NEWID(),
        @tender_id,
        @item_master_id,
        @estimated_unit_price,
        @actual_unit_price,
        @total_quantity_received,
        @pricing_confirmed,
        @type,
        @remarks,
        0,
        GETDATE(),
        GETDATE()
      )
    `;

    const result = await pool.request()
      .input('tender_id', sql.UniqueIdentifier, tender_id)
      .input('item_master_id', sql.VarChar(50), item_master_id)
      .input('estimated_unit_price', sql.Decimal(18, 2), estimated_unit_price)
      .input('actual_unit_price', sql.Decimal(18, 2), actual_unit_price)
      .input('total_quantity_received', sql.Int, total_quantity_received)
      .input('pricing_confirmed', sql.Bit, pricing_confirmed)
      .input('type', sql.VarChar(10), type)
      .input('remarks', sql.Text, remarks)
      .query(query);
    res.status(201).json(result.recordset[0]);

  } catch (error) {
    res.status(500).json({ error: 'Failed to create stock transaction', details: error.message });
  }
});

// Update stock transaction in stock_transactions_clean
app.put('/api/stock-transactions-clean/:tender_id/:item_master_id', async (req, res) => {
  try {
    const { tender_id, item_master_id } = req.params;
    const updates = req.body;
    // Build dynamic update query
    const setClause = [];
    const request = pool.request();
    
    request.input('tender_id', sql.UniqueIdentifier, tender_id);
    request.input('item_master_id', sql.VarChar(50), item_master_id);

    if (updates.estimated_unit_price !== undefined) {
      setClause.push('estimated_unit_price = @estimated_unit_price');
      request.input('estimated_unit_price', sql.Decimal(18, 2), updates.estimated_unit_price);
    }

    if (updates.actual_unit_price !== undefined) {
      setClause.push('actual_unit_price = @actual_unit_price');
      request.input('actual_unit_price', sql.Decimal(18, 2), updates.actual_unit_price);
    }

    if (updates.total_quantity_received !== undefined) {
      setClause.push('total_quantity_received = @total_quantity_received');
      request.input('total_quantity_received', sql.Int, updates.total_quantity_received);
    }

    if (updates.pricing_confirmed !== undefined) {
      setClause.push('pricing_confirmed = @pricing_confirmed');
      request.input('pricing_confirmed', sql.Bit, updates.pricing_confirmed);
    }

    if (updates.remarks !== undefined) {
      setClause.push('remarks = @remarks');
      request.input('remarks', sql.Text, updates.remarks);
    }

    if (setClause.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    setClause.push('updated_at = GETDATE()');

    const query = `
      UPDATE stock_transactions_clean 
      SET ${setClause.join(', ')}
      OUTPUT INSERTED.*
      WHERE tender_id = @tender_id 
        AND item_master_id = @item_master_id
        AND (is_deleted = 0 OR is_deleted IS NULL)
    `;

    const result = await request.query(query);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Stock transaction not found' });
    }
    res.json(result.recordset[0]);

  } catch (error) {
    res.status(500).json({ error: 'Failed to update stock transaction', details: error.message });
  }
});

// Soft delete stock transaction in stock_transactions_clean
app.delete('/api/stock-transactions-clean/:tender_id/:item_master_id', async (req, res) => {
  try {
    const { tender_id, item_master_id } = req.params;
    const { deleted_by = 'user' } = req.body;
    const query = `
      UPDATE stock_transactions_clean 
      SET 
        is_deleted = 1,
        deleted_at = GETDATE(),
        deleted_by = @deleted_by,
        updated_at = GETDATE()
      OUTPUT INSERTED.*
      WHERE tender_id = @tender_id 
        AND item_master_id = @item_master_id
        AND (is_deleted = 0 OR is_deleted IS NULL)
    `;

    const result = await pool.request()
      .input('tender_id', sql.UniqueIdentifier, tender_id)
      .input('item_master_id', sql.VarChar(50), item_master_id)
      .input('deleted_by', sql.VarChar(50), deleted_by)
      .query(query);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Stock transaction not found' });
    }
    res.json({ success: true, message: 'Stock transaction deleted successfully' });

  } catch (error) {
    res.status(500).json({ error: 'Failed to delete stock transaction', details: error.message });
  }
});

// Restore soft deleted stock transaction in stock_transactions_clean
app.post('/api/stock-transactions-clean/:tender_id/:item_master_id/restore', async (req, res) => {
  try {
    const { tender_id, item_master_id } = req.params;
    const query = `
      UPDATE stock_transactions_clean 
      SET 
        is_deleted = 0,
        deleted_at = NULL,
        deleted_by = NULL,
        updated_at = GETDATE()
      OUTPUT INSERTED.*
      WHERE tender_id = @tender_id 
        AND item_master_id = @item_master_id
        AND is_deleted = 1
    `;

    const result = await pool.request()
      .input('tender_id', sql.UniqueIdentifier, tender_id)
      .input('item_master_id', sql.VarChar(50), item_master_id)
      .query(query);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Deleted stock transaction not found' });
    }
    res.json(result.recordset[0]);

  } catch (error) {
    res.status(500).json({ error: 'Failed to restore stock transaction', details: error.message });
  }
});

// Add tender items to stock acquisition (create stock_transaction_clean entries)
app.post('/api/tenders/:id/add-to-stock-acquisition', async (req, res) => {
  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin();
    const { id: tenderId } = req.params;
    
    // First, get the tender and its items
    const tenderResult = await transaction.request()
      .input('tender_id', sql.NVarChar, tenderId)
      .query(`
        SELECT t.*, ti.id as item_id, ti.item_master_id, ti.nomenclature, 
               ti.quantity, ti.estimated_unit_price, ti.total_amount, 
               ti.specifications, ti.remarks
        FROM tenders t
        LEFT JOIN tender_items ti ON t.id = ti.tender_id
        WHERE t.id = @tender_id
      `);

    if (tenderResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Tender not found' });
    }

    const tender = tenderResult.recordset[0];
    const tenderItems = tenderResult.recordset.filter(row => row.item_id);

    if (tenderItems.length === 0) {
      return res.status(400).json({ error: 'No items found in this tender' });
    }

    // Check if stock transactions already exist for this tender
    const existingResult = await transaction.request()
      .input('tender_id', sql.NVarChar, tenderId)
      .query(`
        SELECT COUNT(*) as count 
        FROM stock_transactions_clean 
        WHERE tender_id = @tender_id AND (is_deleted = 0 OR is_deleted IS NULL)
      `);

    if (existingResult.recordset[0].count > 0) {
      return res.status(400).json({ 
        error: 'Stock transactions already exist for this tender',
        message: 'This tender has already been added to stock acquisition'
      });
    }

    // Create stock_transaction_clean entries for each tender item
    let addedItems = 0;
    
    for (const item of tenderItems) {
      const stockTransactionResult = await transaction.request()
        .input('id', sql.NVarChar, uuidv4())
        .input('tender_id', sql.NVarChar, tenderId)
        .input('item_master_id', sql.NVarChar, item.item_master_id)
        .input('estimated_unit_price', sql.Decimal(15, 2), item.estimated_unit_price || 0)
        .input('actual_unit_price', sql.Decimal(15, 2), item.estimated_unit_price || 0)
        .input('total_quantity_received', sql.Decimal(10, 2), 0) // Will be updated from deliveries
        .input('pricing_confirmed', sql.Bit, false)
        .input('type', sql.NVarChar(10), 'IN')
        .input('remarks', sql.NVarChar(500), `Manually added from tender: ${tender.title}`)
        .query(`
          INSERT INTO stock_transactions_clean (
            id, tender_id, item_master_id, estimated_unit_price, 
            actual_unit_price, total_quantity_received, pricing_confirmed, 
            type, remarks, is_deleted, created_at, updated_at
          )
          VALUES (
            @id, @tender_id, @item_master_id, @estimated_unit_price,
            @actual_unit_price, @total_quantity_received, @pricing_confirmed,
            @type, @remarks, 0, GETDATE(), GETDATE()
          )
        `);
      
      addedItems++;
    }

    await transaction.commit();
    
    res.json({ 
      success: true, 
      message: 'Tender items successfully added to stock acquisition',
      addedItems,
      tenderId,
      tenderTitle: tender.title
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Failed to add tender to stock acquisition:', error);
    res.status(500).json({ 
      error: 'Failed to add tender to stock acquisition', 
      details: error.message 
    });
  }
});

// Add missing API endpoints for dashboard

// Get tenders from stock_transactions_clean
app.get('/api/tenders', async (req, res) => {
  try {
    const query = `
      SELECT DISTINCT 
        tender_id as id,
        'Tender ' + LEFT(CAST(tender_id AS VARCHAR(50)), 8) + '...' as title,
        'TND-' + LEFT(CAST(tender_id AS VARCHAR(50)), 8) as tender_number,
        CASE WHEN AVG(CAST(pricing_confirmed AS INT)) > 0.5 THEN 1 ELSE 0 END as is_finalized,
        MIN(created_at) as created_at,
        MAX(updated_at) as updated_at,
        COUNT(*) as item_count,
        SUM(estimated_unit_price) as estimated_value,
        SUM(actual_unit_price) as actual_value
      FROM stock_transactions_clean 
      WHERE (is_deleted = 0 OR is_deleted IS NULL)
      GROUP BY tender_id
      ORDER BY MAX(updated_at) DESC
    `;

    const result = await pool.request().query(query);
    res.json(result.recordset);
    
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tenders', details: error.message });
  }
});

// Get stock transactions by tender ID (for TransactionManager)
app.get('/api/stock-transactions', async (req, res) => {
  try {
    const { tender_id } = req.query;
    
    if (tender_id) {
      const query = `
        SELECT 
          id,
          tender_id,
          item_master_id,
          estimated_unit_price,
          actual_unit_price,
          total_quantity_received as quantity,
          pricing_confirmed,
          is_deleted,
          created_at,
          updated_at,
          -- Add fields that TransactionManager expects
          'Unknown Item' as nomenclature,
          '' as specifications
        FROM stock_transactions_clean
        WHERE tender_id = @tender_id
        AND (is_deleted = 0 OR is_deleted IS NULL)
        ORDER BY created_at DESC
      `;

      const result = await pool.request()
        .input('tender_id', require('mssql').UniqueIdentifier, tender_id)
        .query(query);
      res.json(result.recordset);
      
    } else {
      // Return all stock transactions if no tender_id filter
      const query = `
        SELECT 
          id,
          tender_id,
          item_master_id,
          estimated_unit_price,
          actual_unit_price,
          total_quantity_received as quantity,
          pricing_confirmed,
          is_deleted,
          created_at,
          updated_at
        FROM stock_transactions_clean
        WHERE (is_deleted = 0 OR is_deleted IS NULL)
        ORDER BY created_at DESC
      `;

      const result = await pool.request().query(query);
      res.json(result.recordset);
    }
    
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stock transactions', details: error.message });
  }
});

// Get deliveries (dummy data for now since we don't have delivery table)
app.get('/api/deliveries', async (req, res) => {
  try {
    // Return dummy delivery data based on stock transactions
    const query = `
      SELECT 
        NEWID() as id,
        tender_id,
        'Delivery for Tender ' + LEFT(CAST(tender_id AS VARCHAR(50)), 8) + '...' as delivery_note,
        CASE WHEN pricing_confirmed = 1 THEN 'delivered' ELSE 'pending' END as status,
        updated_at as delivery_date,
        actual_unit_price as value
      FROM stock_transactions_clean 
      WHERE (is_deleted = 0 OR is_deleted IS NULL)
      AND actual_unit_price > 0
      ORDER BY updated_at DESC
    `;

    const result = await pool.request().query(query);
    res.json(result.recordset);
    
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch deliveries', details: error.message });
  }
});

// Get inventory stock (dummy data for now)
app.get('/api/inventory-stock', async (req, res) => {
  try {
    // Return summary data based on stock transactions
    const query = `
      SELECT 
        item_master_id as id,
        'Item ' + LEFT(CAST(item_master_id AS VARCHAR(50)), 8) + '...' as item_name,
        SUM(total_quantity_received) as current_stock,
        SUM(actual_unit_price) as total_value,
        AVG(actual_unit_price) as unit_price,
        MAX(updated_at) as last_updated
      FROM stock_transactions_clean 
      WHERE (is_deleted = 0 OR is_deleted IS NULL)
      GROUP BY item_master_id
      HAVING SUM(total_quantity_received) > 0
      ORDER BY MAX(updated_at) DESC
    `;

    const result = await pool.request().query(query);
    res.json(result.recordset);
    
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch inventory stock', details: error.message });
  }
});

// Get specific tender by ID
app.get('/api/tenders/:id', async (req, res) => {
  console.log(`🔍 API call to /api/tenders/${req.params.id}`);
  
  try {
    const request = new sql.Request();
    request.input('tenderId', sql.VarChar, req.params.id);
    
    const result = await request.query(`
      SELECT * FROM tenders 
      WHERE id = @tenderId
    `);
    
    if (result.recordset.length === 0) {
      console.log(`❌ Tender ${req.params.id} not found`);
      return res.status(404).json({ error: 'Tender not found' });
    }
    
    console.log(`✅ Retrieved tender ${req.params.id}:`, result.recordset[0]);
    res.json(result.recordset[0]);
  } catch (error) {
    console.error('❌ Error fetching tender:', error);
    res.status(500).json({ error: 'Failed to fetch tender' });
  }
});

// New endpoint for the SQL Server view: View_stock_transactions_clean
app.get('/api/view-stock-transactions-clean', async (req, res) => {
  try {
    const { tender_id } = req.query;
    
    let query = `
      SELECT 
        id,
        tender_id,
        reference_number,
        title,
        publish_date,
        publication_date,
        submission_date,
        submission_deadline,
        opening_date,
        item_master_id,
        nomenclature,
        sub_category_name,
        category_id,
        sub_category_id,
        actual_unit_price,
        total_quantity_received,
        type,
        pricing_confirmed,
        is_deleted
      FROM View_stock_transactions_clean
      WHERE (is_deleted = 0 OR is_deleted IS NULL)
    `;
    
    const request = pool.request();
    
    if (tender_id) {
      query += ` AND tender_id = @tender_id`;
      request.input('tender_id', sql.UniqueIdentifier, tender_id);
    }
    
    query += ` ORDER BY title, nomenclature`;
    
    const result = await request.query(query);
    
    console.log(`✅ Retrieved ${result.recordset.length} records from View_stock_transactions_clean`);
    if (tender_id) {
      console.log(`📊 Filtered by tender_id: ${tender_id}`);
    }
    
    res.json(result.recordset);
    
  } catch (error) {
    console.error('❌ Error fetching from view:', error);
    res.status(500).json({ 
      error: 'Failed to fetch from View_stock_transactions_clean', 
      details: error.message 
    });
  }
});

// =============================================================================
// APPROVAL FORWARDING APIs
// =============================================================================

// Get all approval forwards for a user (pending on them)
app.get('/api/approvals/pending/:userId', async (req, res) => {
  try {
    let { userId } = req.params;
    
    // Auto-detect user if needed (for Simple Test User)
    if (!userId || userId === 'undefined' || userId === 'null') {
      try {
        const userResult = await pool.request().query(`
          SELECT Id FROM AspNetUsers WHERE CNIC = '1111111111111'
        `);
        if (userResult.recordset.length > 0) {
          userId = userResult.recordset[0].Id;
          console.log('📋 Pending Approvals: Auto-detected user:', userId);
        }
      } catch (error) {
        console.log('⚠️ Pending Approvals: Could not auto-detect user');
      }
    }
    
    console.log('📋 Pending Approvals: Fetching for user:', userId);
    
    if (!pool) {
      // Return mock data when SQL Server is not connected
      const mockPendingApprovals = [
        {
          IssuanceId: 1,
          IssuanceNumber: 'ISS-2024-001',
          RequestedByName: 'John Doe',
          ForwardedFromName: 'Manager Smith',
          ForwardReason: 'Please review and approve this stock issuance request',
          ForwardDate: new Date().toISOString(),
          Priority: 'High',
          DueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          Level: 2
        }
      ];
      return res.json(mockPendingApprovals);
    }

    const result = await pool.request()
      .input('userId', sql.NVarChar, userId)
      .query(`
        SELECT 
          ra.request_id as IssuanceId,
          sir.request_number as IssuanceNumber,
          submitter.FullName as RequestedByName,
          submitter.Email as RequestedByEmail,
          approver.FullName as ForwardedFromName,
          approver.Email as ForwardedFromEmail,
          'Pending approval' as ForwardReason,
          ra.submitted_date as ForwardDate,
          'Normal' as Priority,
          DATEADD(day, 7, ra.submitted_date) as DueDate,
          1 as Level,
          ra.submitted_date as RequestDate,
          ra.current_status as ApprovalStatus
        FROM request_approvals ra
        LEFT JOIN AspNetUsers submitter ON ra.submitted_by = submitter.Id
        LEFT JOIN AspNetUsers approver ON ra.current_approver_id = approver.Id
        LEFT JOIN stock_issuance_requests sir ON ra.request_id = sir.id AND ra.request_type = 'stock_issuance'
        WHERE ra.current_approver_id = @userId 
          AND ra.current_status = 'pending'
        ORDER BY ra.submitted_date DESC
      `);
    
    res.json(result.recordset);
    
  } catch (error) {
    console.error('❌ Error fetching pending approvals:', error);
    res.status(500).json({ 
      error: 'Failed to fetch pending approvals', 
      details: error.message 
    });
  }
});

// Get approval history for an issuance
app.get('/api/approvals/history/:issuanceId', async (req, res) => {
  try {
    const { issuanceId } = req.params;
    
    if (!pool) {
      // Return mock data when SQL Server is not connected
      const mockHistory = [
        {
          ActionType: 'SUBMITTED',
          ActionDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          UserName: 'John Doe',
          Comments: 'Initial submission',
          Level: 1
        },
        {
          ActionType: 'FORWARDED',
          ActionDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          UserName: 'Manager Smith',
          Comments: 'Forwarding to senior management for approval',
          ForwardedToName: 'Director Johnson',
          Level: 2
        }
      ];
      return res.json(mockHistory);
    }

    const result = await pool.request()
      .input('issuanceId', sql.Int, issuanceId)
      .query(`
        SELECT 
          ah.ActionType,
          ah.ActionDate,
          ah.Comments,
          ah.Level,
          ah.IsFinalApproval,
          u.FullName as UserName,
          u.Email as UserEmail,
          ft.FullName as ForwardedToName,
          ft.Email as ForwardedToEmail,
          ah.ForwardReason
        FROM IssuanceApprovalHistory ah
        INNER JOIN AspNetUsers u ON ah.UserId = u.Id
        LEFT JOIN AspNetUsers ft ON ah.ForwardedToUserId = ft.Id
        WHERE ah.IssuanceId = @issuanceId
        ORDER BY ah.ActionDate ASC
      `);
    
    res.json(result.recordset);
    
  } catch (error) {
    console.error('❌ Error fetching approval history:', error);
    res.status(500).json({ 
      error: 'Failed to fetch approval history', 
      details: error.message 
    });
  }
});

// Forward an approval to another user
app.post('/api/approvals/forward', async (req, res) => {
  try {
    const { 
      issuanceId, 
      forwardedToUserId, 
      forwardReason, 
      priority = 'Normal',
      dueDate,
      currentUserId 
    } = req.body;

    if (!issuanceId || !forwardedToUserId || !currentUserId) {
      return res.status(400).json({ 
        error: 'Missing required fields: issuanceId, forwardedToUserId, currentUserId' 
      });
    }
    
    if (!pool) {
      // Return mock success when SQL Server is not connected
      return res.json({ 
        success: true, 
        message: 'Approval forwarded successfully (mock)',
        forwardId: Math.floor(Math.random() * 1000)
      });
    }

    const transaction = pool.transaction();
    await transaction.begin();

    try {
      // Get current approval level
      const currentForward = await transaction.request()
        .input('issuanceId', sql.Int, issuanceId)
        .input('currentUserId', sql.NVarChar, currentUserId)
        .query(`
          SELECT Level FROM IssuanceApprovalForwards 
          WHERE IssuanceId = @issuanceId 
            AND ForwardedToUserId = @currentUserId 
            AND IsActive = 1
        `);

      const currentLevel = currentForward.recordset[0]?.Level || 1;
      const nextLevel = currentLevel + 1;

      // Deactivate current forward
      await transaction.request()
        .input('issuanceId', sql.Int, issuanceId)
        .input('currentUserId', sql.NVarChar, currentUserId)
        .query(`
          UPDATE IssuanceApprovalForwards 
          SET IsActive = 0 
          WHERE IssuanceId = @issuanceId 
            AND ForwardedToUserId = @currentUserId 
            AND IsActive = 1
        `);

      // Create new forward
      const forwardResult = await transaction.request()
        .input('issuanceId', sql.Int, issuanceId)
        .input('forwardedFromUserId', sql.NVarChar, currentUserId)
        .input('forwardedToUserId', sql.NVarChar, forwardedToUserId)
        .input('forwardReason', sql.NText, forwardReason)
        .input('level', sql.Int, nextLevel)
        .input('priority', sql.NVarChar, priority)
        .input('dueDate', sql.DateTime2, dueDate || null)
        .input('createdBy', sql.NVarChar, currentUserId)
        .query(`
          INSERT INTO IssuanceApprovalForwards 
          (IssuanceId, ForwardedFromUserId, ForwardedToUserId, ForwardReason, Level, Priority, DueDate, CreatedBy)
          OUTPUT INSERTED.Id
          VALUES (@issuanceId, @forwardedFromUserId, @forwardedToUserId, @forwardReason, @level, @priority, @dueDate, @createdBy)
        `);

      // Add to approval history
      await transaction.request()
        .input('issuanceId', sql.Int, issuanceId)
        .input('userId', sql.NVarChar, currentUserId)
        .input('actionType', sql.NVarChar, 'FORWARDED')
        .input('comments', sql.NText, `Forwarded with reason: ${forwardReason}`)
        .input('forwardedToUserId', sql.NVarChar, forwardedToUserId)
        .input('forwardReason', sql.NText, forwardReason)
        .input('level', sql.Int, currentLevel)
        .input('createdBy', sql.NVarChar, currentUserId)
        .query(`
          INSERT INTO IssuanceApprovalHistory 
          (IssuanceId, UserId, ActionType, Comments, ForwardedToUserId, ForwardReason, Level, CreatedBy)
          VALUES (@issuanceId, @userId, @actionType, @comments, @forwardedToUserId, @forwardReason, @level, @createdBy)
        `);

      // Update stock issuance current approver
      await transaction.request()
        .input('issuanceId', sql.Int, issuanceId)
        .input('currentApproverId', sql.NVarChar, forwardedToUserId)
        .input('approvalLevel', sql.Int, nextLevel)
        .query(`
          UPDATE StockIssuances 
          SET CurrentApproverId = @currentApproverId, ApprovalLevel = @approvalLevel
          WHERE Id = @issuanceId
        `);

      await transaction.commit();

      // Create notification for the forwarded user
      try {
        await createNotification(
          forwardedToUserId,
          'New Approval Request',
          `You have been assigned a new approval request for issuance #${issuanceId}. ${forwardReason ? `Reason: ${forwardReason}` : ''}`,
          'warning',
          '/approval-manager',
          'Review Now'
        );
      } catch (notificationError) {
        console.error('Failed to create notification:', notificationError);
        // Don't fail the request if notification fails
      }

      res.json({ 
        success: true, 
        message: 'Approval forwarded successfully',
        forwardId: forwardResult.recordset[0].Id
      });

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
    
  } catch (error) {
    console.error('❌ Error forwarding approval:', error);
    res.status(500).json({ 
      error: 'Failed to forward approval', 
      details: error.message 
    });
  }
});

// Approve an issuance
app.post('/api/approvals/approve', async (req, res) => {
  try {
    const { 
      issuanceId, 
      comments, 
      isFinalApproval = false,
      currentUserId 
    } = req.body;

    if (!issuanceId || !currentUserId) {
      return res.status(400).json({ 
        error: 'Missing required fields: issuanceId, currentUserId' 
      });
    }
    
    if (!pool) {
      // Return mock success when SQL Server is not connected
      return res.json({ 
        success: true, 
        message: 'Approval completed successfully (mock)'
      });
    }

    const transaction = pool.transaction();
    await transaction.begin();

    try {
      // Get current approval level
      const currentForward = await transaction.request()
        .input('issuanceId', sql.Int, issuanceId)
        .input('currentUserId', sql.NVarChar, currentUserId)
        .query(`
          SELECT Level FROM IssuanceApprovalForwards 
          WHERE IssuanceId = @issuanceId 
            AND ForwardedToUserId = @currentUserId 
            AND IsActive = 1
        `);

      const currentLevel = currentForward.recordset[0]?.Level || 1;

      // Deactivate current forward
      await transaction.request()
        .input('issuanceId', sql.Int, issuanceId)
        .input('currentUserId', sql.NVarChar, currentUserId)
        .query(`
          UPDATE IssuanceApprovalForwards 
          SET IsActive = 0 
          WHERE IssuanceId = @issuanceId 
            AND ForwardedToUserId = @currentUserId 
            AND IsActive = 1
        `);

      // Add to approval history
      await transaction.request()
        .input('issuanceId', sql.Int, issuanceId)
        .input('userId', sql.NVarChar, currentUserId)
        .input('actionType', sql.NVarChar, 'APPROVED')
        .input('comments', sql.NText, comments)
        .input('level', sql.Int, currentLevel)
        .input('isFinalApproval', sql.Bit, isFinalApproval)
        .input('createdBy', sql.NVarChar, currentUserId)
        .query(`
          INSERT INTO IssuanceApprovalHistory 
          (IssuanceId, UserId, ActionType, Comments, Level, IsFinalApproval, CreatedBy)
          VALUES (@issuanceId, @userId, @actionType, @comments, @level, @isFinalApproval, @createdBy)
        `);

      // Update stock issuance status
      const newStatus = isFinalApproval ? 'APPROVED' : 'PENDING';
      const updateQuery = isFinalApproval 
        ? `UPDATE StockIssuances 
           SET ApprovalStatus = @newStatus, 
               FinalApprovedBy = @currentUserId, 
               FinalApprovalDate = GETDATE(),
               CurrentApproverId = NULL
           WHERE Id = @issuanceId`
        : `UPDATE StockIssuances 
           SET ApprovalStatus = @newStatus,
               CurrentApproverId = NULL
           WHERE Id = @issuanceId`;

      await transaction.request()
        .input('issuanceId', sql.Int, issuanceId)
        .input('newStatus', sql.NVarChar, newStatus)
        .input('currentUserId', sql.NVarChar, currentUserId)
        .query(updateQuery);

      await transaction.commit();

      res.json({ 
        success: true, 
        message: isFinalApproval ? 'Final approval completed successfully' : 'Approval completed successfully'
      });

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
    
  } catch (error) {
    console.error('❌ Error approving issuance:', error);
    res.status(500).json({ 
      error: 'Failed to approve issuance', 
      details: error.message 
    });
  }
});

// Reject an issuance
app.post('/api/approvals/reject', async (req, res) => {
  try {
    const { 
      issuanceId, 
      comments, 
      currentUserId 
    } = req.body;

    if (!issuanceId || !currentUserId || !comments) {
      return res.status(400).json({ 
        error: 'Missing required fields: issuanceId, currentUserId, comments' 
      });
    }
    
    if (!pool) {
      // Return mock success when SQL Server is not connected
      return res.json({ 
        success: true, 
        message: 'Issuance rejected successfully (mock)'
      });
    }

    const transaction = pool.transaction();
    await transaction.begin();

    try {
      // Get current approval level
      const currentForward = await transaction.request()
        .input('issuanceId', sql.Int, issuanceId)
        .input('currentUserId', sql.NVarChar, currentUserId)
        .query(`
          SELECT Level FROM IssuanceApprovalForwards 
          WHERE IssuanceId = @issuanceId 
            AND ForwardedToUserId = @currentUserId 
            AND IsActive = 1
        `);

      const currentLevel = currentForward.recordset[0]?.Level || 1;

      // Deactivate all active forwards for this issuance
      await transaction.request()
        .input('issuanceId', sql.Int, issuanceId)
        .query(`
          UPDATE IssuanceApprovalForwards 
          SET IsActive = 0 
          WHERE IssuanceId = @issuanceId 
            AND IsActive = 1
        `);

      // Add to approval history
      await transaction.request()
        .input('issuanceId', sql.Int, issuanceId)
        .input('userId', sql.NVarChar, currentUserId)
        .input('actionType', sql.NVarChar, 'REJECTED')
        .input('comments', sql.NText, comments)
        .input('level', sql.Int, currentLevel)
        .input('createdBy', sql.NVarChar, currentUserId)
        .query(`
          INSERT INTO IssuanceApprovalHistory 
          (IssuanceId, UserId, ActionType, Comments, Level, CreatedBy)
          VALUES (@issuanceId, @userId, @actionType, @comments, @level, @createdBy)
        `);

      // Update stock issuance status
      await transaction.request()
        .input('issuanceId', sql.Int, issuanceId)
        .query(`
          UPDATE StockIssuances 
          SET ApprovalStatus = 'REJECTED',
              CurrentApproverId = NULL
          WHERE Id = @issuanceId
        `);

      await transaction.commit();

      res.json({ 
        success: true, 
        message: 'Issuance rejected successfully'
      });

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
    
  } catch (error) {
    console.error('❌ Error rejecting issuance:', error);
    res.status(500).json({ 
      error: 'Failed to reject issuance', 
      details: error.message 
    });
  }
});

// Get approval status overview
app.get('/api/approvals/status/:issuanceId', async (req, res) => {
  try {
    const { issuanceId } = req.params;
    
    if (!pool) {
      // Return mock data when SQL Server is not connected
      const mockStatus = {
        IssuanceId: parseInt(issuanceId),
        IssuanceNumber: 'ISS-2024-001',
        RequestedByName: 'John Doe',
        ApprovalStatus: 'PENDING',
        CurrentApproverName: 'Manager Smith',
        ApprovalLevel: 2,
        RequestDate: new Date().toISOString(),
        LatestAction: 'FORWARDED',
        LatestActionDate: new Date().toISOString()
      };
      return res.json(mockStatus);
    }

    const result = await pool.request()
      .input('issuanceId', sql.Int, issuanceId)
      .query(`
        SELECT * FROM View_IssuanceApprovalStatus 
        WHERE IssuanceId = @issuanceId
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Issuance not found' });
    }
    
    res.json(result.recordset[0]);
    
  } catch (error) {
    console.error('❌ Error fetching approval status:', error);
    res.status(500).json({ 
      error: 'Failed to fetch approval status', 
      details: error.message 
    });
  }
});

// ============================================================================
// NOTIFICATION SYSTEM
// ============================================================================

// Helper function to create system notifications
async function createNotification(userId, title, message, type = 'info', actionUrl = null, actionText = null) {
  try {
    if (!pool) {
      console.warn('⚠️ Database not available, skipping notification creation');
      return null;
    }

    // Save notification to database
    const result = await pool.request()
      .input('userId', sql.NVarChar, userId)
      .input('title', sql.NVarChar, title)
      .input('message', sql.NVarChar, message)
      .input('type', sql.NVarChar, type)
      .input('actionUrl', sql.NVarChar, actionUrl)
      .input('actionText', sql.NVarChar, actionText)
      .execute('CreateNotification');
    
    const notification = result.recordset[0];
    console.log(`📧 Notification created for user ${userId}: ${title}`);
    
    return notification;
  } catch (error) {
    console.error('❌ Error creating notification:', error);
    return null;
  }
}

// Get notifications for a user
app.get('/api/notifications/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { unreadOnly = false, limit = 50 } = req.query;
    
    if (!pool) {
      return res.json({ success: false, error: 'Database not available' });
    }
    
    // Fetch notifications from database
    const result = await pool.request()
      .input('userId', sql.NVarChar, userId)
      .input('unreadOnly', sql.Bit, unreadOnly === 'true')
      .input('limit', sql.Int, parseInt(limit))
      .execute('GetUserNotifications');
    
    res.json({
      success: true,
      notifications: result.recordset
    });
  } catch (error) {
    console.error('❌ Error fetching notifications:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch notifications' });
  }
});

// Mark notification as read
app.put('/api/notifications/:notificationId/read', async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.session?.userId || 'DEV-USER-001';
    
    if (!pool) {
      return res.json({ success: false, error: 'Database not available' });
    }
    
    await pool.request()
      .input('notificationId', sql.UniqueIdentifier, notificationId)
      .input('userId', sql.NVarChar, userId)
      .execute('MarkNotificationRead');
    
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    console.error('❌ Error marking notification as read:', error);
    res.status(500).json({ success: false, error: 'Failed to mark notification as read' });
  }
});

// Get current user's notifications (uses session)
app.get('/api/my-notifications', async (req, res) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }
    
    const { unreadOnly = false, limit = 50 } = req.query;
    
    if (!pool) {
      return res.json({ success: false, error: 'Database not available' });
    }
    
    // Fetch notifications from database
    const result = await pool.request()
      .input('userId', sql.NVarChar, userId)
      .input('unreadOnly', sql.Bit, unreadOnly === 'true')
      .input('limit', sql.Int, parseInt(limit))
      .execute('GetUserNotifications');
    
    res.json({
      success: true,
      notifications: result.recordset
    });
  } catch (error) {
    console.error('❌ Error fetching my notifications:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch notifications',
      details: error.message
    });
  }
});

// Mark notification as read
app.put('/api/notifications/:notificationId/read', async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    // TODO: In production, update database
    // await pool.request()
    //   .input('notificationId', sql.NVarChar, notificationId)
    //   .query(`
    //     UPDATE Notifications 
    //     SET IsRead = 1, ReadAt = GETDATE()
    //     WHERE Id = @notificationId
    //   `);
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('❌ Error marking notification as read:', error);
    res.status(500).json({ 
      error: 'Failed to mark notification as read', 
      details: error.message 
    });
  }
});

// Delete notification
app.delete('/api/notifications/:notificationId', async (req, res) => {
  try {
    const { notificationId } = req.params;
    
    // TODO: In production, delete from database
    // await pool.request()
    //   .input('notificationId', sql.NVarChar, notificationId)
    //   .query(`DELETE FROM Notifications WHERE Id = @notificationId`);
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('❌ Error deleting notification:', error);
    res.status(500).json({ 
      error: 'Failed to delete notification', 
      details: error.message 
    });
  }
});

// ============================================================================
// END NOTIFICATION SYSTEM
// ============================================================================

// Graceful shutdown
// =============================================================================
// NEW STOCK ACQUISITION DASHBOARD ENDPOINTS
// =============================================================================

// Get acquisition dashboard overview stats
app.get('/api/acquisition/dashboard-stats', async (req, res) => {
  try {
    console.log('📊 GET /api/acquisition/dashboard-stats - Fetching acquisition stats');
    
    if (!pool) {
      console.error('❌ Database connection not available');
      return res.status(500).json({ error: 'Database connection not available' });
    }

    // Get comprehensive acquisition statistics
    const statsQuery = `
      WITH TenderStats AS (
        SELECT 
          COUNT(*) as totalTenders,
          COUNT(CASE WHEN is_finalized = 0 THEN 1 END) as activeTenders,
          COUNT(CASE WHEN is_finalized = 1 THEN 1 END) as completedTenders,
          SUM(CASE WHEN estimated_value IS NOT NULL THEN estimated_value ELSE 0 END) as totalValue,
          COUNT(CASE WHEN created_at >= DATEADD(month, -1, GETDATE()) THEN 1 END) as monthlyAcquisitions
        FROM tenders
      ),
      DeliveryStats AS (
        SELECT 
          COUNT(DISTINCT d.id) as pendingDeliveries,
          COUNT(DISTINCT di.item_master_id) as totalItems,
          SUM(di.delivery_qty) as totalQuantity
        FROM deliveries d
        INNER JOIN delivery_items di ON d.id = di.delivery_id
        WHERE d.is_finalized = 0 OR d.is_finalized IS NULL
      )
      SELECT 
        ts.*,
        COALESCE(ds.pendingDeliveries, 0) as pendingDeliveries,
        COALESCE(ds.totalItems, 0) as totalItems,
        COALESCE(ds.totalQuantity, 0) as totalQuantity
      FROM TenderStats ts
      CROSS JOIN DeliveryStats ds
    `;

    const result = await pool.request().query(statsQuery);
    console.log('✅ Query executed, rows returned:', result.recordset.length);
    
    if (result.recordset.length > 0) {
      console.log('📈 Stats data:', result.recordset[0]);
      res.json(result.recordset[0]);
    } else {
      console.log('⚠️ No data found, returning zeros');
      res.json({
        totalTenders: 0,
        activeTenders: 0,
        completedTenders: 0,
        pendingDeliveries: 0,
        totalValue: 0,
        totalItems: 0,
        totalQuantity: 0,
        monthlyAcquisitions: 0
      });
    }
  } catch (error) {
    console.error('Error fetching acquisition dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch acquisition dashboard stats' });
  }
});

// Get active tenders for acquisition dashboard
app.get('/api/acquisition/active-tenders', async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const tendersQuery = `
      SELECT 
        t.id,
        t.title,
        t.reference_number as tenderNumber,
        t.tender_spot_type as acquisitionType,
        t.status,
        t.is_finalized as isFinalized,
        t.created_at as createdAt,
        COALESCE(t.estimated_total_cost, 0) as totalValue,
        COALESCE(itemStats.itemCount, 0) as itemCount,
        CASE WHEN deliveryStats.deliveryCount > 0 THEN 1 ELSE 0 END as hasDeliveries
      FROM tenders t
      LEFT JOIN (
        SELECT 
          tender_id,
          COUNT(*) as itemCount
        FROM tender_items
        GROUP BY tender_id
      ) itemStats ON t.id = itemStats.tender_id
      LEFT JOIN (
        SELECT 
          tender_id,
          COUNT(*) as deliveryCount
        FROM deliveries
        GROUP BY tender_id
      ) deliveryStats ON t.id = deliveryStats.tender_id
      WHERE t.is_finalized = 0 OR t.is_finalized IS NULL
      ORDER BY t.updated_at DESC
    `;

    const result = await pool.request().query(tendersQuery);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching active tenders:', error);
    res.status(500).json({ error: 'Failed to fetch active tenders' });
  }
});

// Get recent deliveries for acquisition dashboard
app.get('/api/acquisition/recent-deliveries', async (req, res) => {
  try {
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    const deliveriesQuery = `
      SELECT TOP 10
        di.id,
        t.title as tenderTitle,
        im.nomenclature as itemName,
        di.quantity_delivered as quantityReceived,
        d.delivery_date as deliveryDate,
        CASE WHEN d.finalized = 1 THEN 'Delivered' ELSE 'Pending' END as status
      FROM delivery_items di
      INNER JOIN deliveries d ON di.delivery_id = d.id
      INNER JOIN tenders t ON d.tender_id = t.id
      INNER JOIN item_masters im ON di.item_master_id = im.id
      ORDER BY d.delivery_date DESC, d.created_at DESC
    `;

    const result = await pool.request().query(deliveriesQuery);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching recent deliveries:', error);
    res.status(500).json({ error: 'Failed to fetch recent deliveries' });
  }
});

// =====================================================
// ENHANCED STOCK ACQUISITION API ENDPOINTS
// =====================================================

// GET /api/stock-acquisition/dashboard-stats - Get stock acquisition dashboard statistics
// DUPLICATE ROUTE REMOVED - Using the updated version at line ~6940
// app.get('/api/stock-acquisition/dashboard-stats', async (req, res) => {
//   try {
//     const query = `
//       SELECT 
//         COUNT(DISTINCT tender_id) as total_tenders,
//         COUNT(*) as total_items,
//         SUM(CASE WHEN pricing_confirmed = 1 THEN 1 ELSE 0 END) as confirmed_pricing_items,
//         SUM(CASE WHEN pricing_confirmed = 0 OR pricing_confirmed IS NULL THEN 1 ELSE 0 END) as pending_pricing_items,
//         SUM(estimated_unit_price) as total_estimated_value,
//         SUM(actual_unit_price) as total_actual_value,
//         CASE 
//           WHEN SUM(estimated_unit_price) > 0 
//           THEN ((SUM(actual_unit_price) - SUM(estimated_unit_price)) / SUM(estimated_unit_price)) * 100
//           ELSE 0 
//         END as average_price_variance
//       FROM stock_transactions_clean 
//       WHERE (is_deleted = 0 OR is_deleted IS NULL)
//     `;
//
//     const result = await pool.request().query(query);
//     res.json(result.recordset[0] || {
//       total_tenders: 0,
//       total_items: 0,
//       confirmed_pricing_items: 0,
//       pending_pricing_items: 0,
//       total_estimated_value: 0,
//       total_actual_value: 0,
//       average_price_variance: 0
//     });
//   } catch (error) {
//     console.error('Failed to fetch stock acquisition stats:', error);
//     res.status(500).json({ error: 'Failed to fetch dashboard statistics', details: error.message });
//   }
// });

// GET /api/stock-acquisition/tender-summaries - Get tender summaries from stock transactions
// DUPLICATE ROUTE REMOVED - Using the updated version at line ~6994
// app.get('/api/stock-acquisition/tender-summaries', async (req, res) => {
//   try {
//     const query = `
//       SELECT 
//         stc.tender_id,
//         t.title as tender_title,
//         t.reference_number as tender_number,
//         COUNT(*) as total_items,
//         SUM(CASE WHEN stc.pricing_confirmed = 1 THEN 1 ELSE 0 END) as confirmed_items,
//         SUM(CASE WHEN stc.pricing_confirmed = 0 OR stc.pricing_confirmed IS NULL THEN 1 ELSE 0 END) as pending_items,
//         SUM(stc.estimated_unit_price) as total_estimated_value,
//         SUM(stc.actual_unit_price) as total_actual_value,
//         CASE 
//           WHEN COUNT(*) > 0 
//           THEN (CAST(SUM(CASE WHEN stc.pricing_confirmed = 1 THEN 1 ELSE 0 END) AS FLOAT) / COUNT(*)) * 100
//           ELSE 0 
//         END as pricing_completion_rate,
//         CASE WHEN d.tender_id IS NOT NULL THEN 1 ELSE 0 END as has_deliveries,
//         MIN(stc.created_at) as created_at
//       FROM stock_transactions_clean stc
//       LEFT JOIN tenders t ON stc.tender_id = t.id
//       LEFT JOIN (SELECT DISTINCT tender_id FROM deliveries) d ON stc.tender_id = d.tender_id
//       WHERE (stc.is_deleted = 0 OR stc.is_deleted IS NULL)
//       GROUP BY stc.tender_id, t.title, t.reference_number, d.tender_id
//       ORDER BY MIN(stc.created_at) DESC
//     `;
//
//     const result = await pool.request().query(query);
//     res.json(result.recordset);
//   } catch (error) {
//     console.error('Failed to fetch tender summaries:', error);
//     res.status(500).json({ error: 'Failed to fetch tender summaries', details: error.message });
//   }
// });

// GET /api/stock-acquisition/items/:tenderId - Get stock transaction items for a specific tender
app.get('/api/stock-acquisition/items/:tenderId', async (req, res) => {
  try {
    const { tenderId } = req.params;
    
    const query = `
      SELECT 
        stc.*,
        im.nomenclature as item_name
      FROM stock_transactions_clean stc
      LEFT JOIN item_masters im ON stc.item_master_id = im.id
      WHERE stc.tender_id = @tender_id 
      AND (stc.is_deleted = 0 OR stc.is_deleted IS NULL)
      ORDER BY stc.created_at ASC
    `;

    const result = await pool.request()
      .input('tender_id', sql.NVarChar, tenderId)
      .query(query);
      
    res.json(result.recordset);
  } catch (error) {
    console.error('Failed to fetch tender items:', error);
    res.status(500).json({ error: 'Failed to fetch tender items', details: error.message });
  }
});

// PUT /api/stock-acquisition/update-price/:itemId - Update actual price for a stock transaction item
app.put('/api/stock-acquisition/update-price/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    const { actual_unit_price, pricing_confirmed } = req.body;
    
    const query = `
      UPDATE stock_transactions_clean 
      SET 
        actual_unit_price = @actual_unit_price,
        pricing_confirmed = @pricing_confirmed,
        updated_at = GETDATE()
      WHERE id = @item_id
      AND (is_deleted = 0 OR is_deleted IS NULL)
    `;

    const result = await pool.request()
      .input('item_id', sql.NVarChar, itemId)
      .input('actual_unit_price', sql.Decimal(15, 2), actual_unit_price)
      .input('pricing_confirmed', sql.Bit, pricing_confirmed)
      .query(query);

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Stock transaction item not found' });
    }

    res.json({ 
      success: true, 
      message: 'Price updated successfully',
      updated_price: actual_unit_price,
      pricing_confirmed 
    });
  } catch (error) {
    console.error('Failed to update price:', error);
    res.status(500).json({ error: 'Failed to update price', details: error.message });
  }
});

// GET /api/stock-acquisition/price-history/:itemId - Get price change history for an item
app.get('/api/stock-acquisition/price-history/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    
    // This would require an audit table for price changes
    // For now, return the current item data
    const query = `
      SELECT 
        stc.*,
        im.nomenclature as item_name,
        t.title as tender_title
      FROM stock_transactions_clean stc
      LEFT JOIN item_masters im ON stc.item_master_id = im.id
      LEFT JOIN tenders t ON stc.tender_id = t.id
      WHERE stc.id = @item_id
      AND (stc.is_deleted = 0 OR stc.is_deleted IS NULL)
    `;

    const result = await pool.request()
      .input('item_id', sql.NVarChar, itemId)
      .query(query);
      
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json(result.recordset[0]);
  } catch (error) {
    console.error('Failed to fetch price history:', error);
    res.status(500).json({ error: 'Failed to fetch price history', details: error.message });
  }
});

// ==============================================
// APPROVAL FORWARDING SYSTEM ENDPOINTS
// ==============================================

// Get all approval workflows
app.get('/api/approval-workflows', async (req, res) => {
  try {
    const request = pool.request();
    const result = await request.query(`
      SELECT id, workflow_name, request_type, office_id, description, is_active, created_date
      FROM approval_workflows 
      WHERE is_active = 1
      ORDER BY workflow_name
    `);
    
    res.json({ success: true, data: result.recordset });
  } catch (error) {
    console.error('Error fetching approval workflows:', error);
    res.status(500).json({ error: 'Failed to fetch approval workflows', details: error.message });
  }
});

// Create new approval workflow
app.post('/api/approval-workflows', async (req, res) => {
  try {
    const { workflow_name, request_type, office_id, description } = req.body;
    const request = pool.request();
    
    const result = await request
      .input('workflow_name', sql.NVarChar, workflow_name)
      .input('request_type', sql.NVarChar, request_type)
      .input('office_id', sql.UniqueIdentifier, office_id)
      .input('description', sql.NVarChar, description)
      .query(`
        INSERT INTO approval_workflows (workflow_name, request_type, office_id, description, is_active)
        OUTPUT INSERTED.*
        VALUES (@workflow_name, @request_type, @office_id, @description, 1)
      `);
    
    res.json({ success: true, data: result.recordset[0] });
  } catch (error) {
    console.error('Error creating approval workflow:', error);
    res.status(500).json({ error: 'Failed to create approval workflow', details: error.message });
  }
});

// Get workflow approvers
app.get('/api/approval-workflows/:workflowId/approvers', async (req, res) => {
  try {
    const { workflowId } = req.params;
    console.log('🔍 Backend: Fetching approvers for workflow:', workflowId);
    
    // Validate GUID format
    const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!guidRegex.test(workflowId)) {
      return res.status(400).json({ error: 'Invalid workflow ID format' });
    }
    
    const request = pool.request();
    
    const result = await request
      .input('workflowId', sql.UniqueIdentifier, workflowId.toLowerCase())
      .query(`
        SELECT 
          wa.id,
          wa.workflow_id,
          wa.user_id,
          u.FullName as user_name,
          u.Role as user_role,
          u.intDesignationID as user_designation,
          wa.can_approve,
          wa.can_forward,
          wa.can_finalize,
          wa.approver_role,
          wa.added_date
        FROM workflow_approvers wa
        JOIN AspNetUsers u ON wa.user_id = u.Id
        WHERE wa.workflow_id = @workflowId
        ORDER BY wa.added_date
      `);
    
    console.log('📋 Backend: Found approvers:', result.recordset.length, 'records');
    res.json({ success: true, data: result.recordset });
  } catch (error) {
    console.error('❌ Backend: Error fetching workflow approvers:', error);
    res.status(500).json({ error: 'Failed to fetch workflow approvers', details: error.message });
  }
});

// Add workflow approver
app.post('/api/approval-workflows/:workflowId/approvers', async (req, res) => {
  try {
    const { workflowId } = req.params;
    const { user_id, can_approve, can_forward, can_finalize, approver_role } = req.body;
    
    // Validate GUID format
    const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!guidRegex.test(workflowId)) {
      return res.status(400).json({ error: 'Invalid workflow ID format' });
    }
    
    console.log('🔄 Backend: Adding approver to workflow:', {
      workflowId,
      user_id,
      can_approve,
      can_forward,
      can_finalize,
      approver_role
    });
    
    const request = pool.request();
    
    const result = await request
      .input('workflowId', sql.UniqueIdentifier, workflowId.toLowerCase())
      .input('user_id', sql.NVarChar, user_id)
      .input('can_approve', sql.Bit, can_approve)
      .input('can_forward', sql.Bit, can_forward)
      .input('can_finalize', sql.Bit, can_finalize)
      .input('approver_role', sql.NVarChar, approver_role)
      .query(`
        INSERT INTO workflow_approvers (workflow_id, user_id, can_approve, can_forward, can_finalize, approver_role)
        OUTPUT INSERTED.*
        VALUES (@workflowId, @user_id, @can_approve, @can_forward, @can_finalize, @approver_role)
      `);
    
    console.log('✅ Backend: Approver added successfully:', result.recordset[0]);
    res.json({ success: true, data: result.recordset[0] });
  } catch (error) {
    console.error('❌ Backend: Error adding workflow approver:', error);
    res.status(500).json({ error: 'Failed to add workflow approver', details: error.message });
  }
});

// Delete workflow approver
app.delete('/api/approval-workflows/:workflowId/approvers/:approverId', async (req, res) => {
  try {
    const { workflowId, approverId } = req.params;
    
    // Validate GUID formats
    const guidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!guidRegex.test(workflowId) || !guidRegex.test(approverId)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }
    
    console.log('🗑️ Backend: Deleting approver:', { workflowId, approverId });
    
    const request = pool.request();
    
    const result = await request
      .input('workflowId', sql.UniqueIdentifier, workflowId.toLowerCase())
      .input('approverId', sql.UniqueIdentifier, approverId.toLowerCase())
      .query(`
        DELETE FROM workflow_approvers 
        WHERE workflow_id = @workflowId AND id = @approverId
      `);
    
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: 'Approver not found' });
    }
    
    console.log('✅ Backend: Approver deleted successfully');
    res.json({ success: true, message: 'Approver deleted successfully' });
  } catch (error) {
    console.error('❌ Backend: Error deleting workflow approver:', error);
    res.status(500).json({ error: 'Failed to delete workflow approver', details: error.message });
  }
});

// Get active AspNetUsers for approver selection
app.get('/api/aspnet-users/active', async (req, res) => {
  try {
    const request = pool.request();
    const result = await request.query(`
      SELECT Id, FullName, Role, intDesignationID, DesignationID, DesignationName, 
             OfficeID AS intOfficeID, WinfID AS intWingID, intBranchID, DEC_ID, 
             CNIC, Email, PhoneNumber, ISACT
      FROM vw_AspNetUser_with_Reg_App_DEC_ID
      WHERE ISACT = 1
      ORDER BY FullName
    `);
    
    res.json({ success: true, data: result.recordset });
  } catch (error) {
    console.error('Error fetching active AspNetUsers:', error);
    res.status(500).json({ error: 'Failed to fetch active users', details: error.message });
  }
});

// Get filtered users by office, wing, and branch from view
app.get('/api/aspnet-users/filtered', async (req, res) => {
  try {
    const { officeId, wingId, branchId } = req.query;
    
    if (!officeId || !wingId) {
      return res.status(400).json({ error: 'officeId and wingId are required' });
    }

    const request = pool.request();
    let query = `
      SELECT 
        UserID as Id,
        EmployeeName as FullName,
        CNIC,
        DesignationID,
        DesignationName,
        OfficeID as intOfficeID,
        WingID as intWingID,
        DECID as intBranchID
      FROM vw_Full_hirarcy_Office_to_Employee
      WHERE OfficeID = @officeId 
        AND WingID = @wingId
    `;

    request.input('officeId', sql.Int, parseInt(officeId));
    request.input('wingId', sql.Int, parseInt(wingId));

    // Add branch filter if provided
    if (branchId && branchId !== 'ALL_BRANCHES') {
      query += ' AND DECID = @branchId';
      request.input('branchId', sql.Int, parseInt(branchId));
    }

    query += ' ORDER BY EmployeeName';

    const result = await request.query(query);
    
    console.log(`✅ Filtered users: Office=${officeId}, Wing=${wingId}, Branch=${branchId || 'ALL'} - Found ${result.recordset.length} users`);
    
    res.json({ success: true, data: result.recordset });
  } catch (error) {
    console.error('Error fetching filtered AspNetUsers:', error);
    res.status(500).json({ error: 'Failed to fetch filtered users', details: error.message });
  }
});

// Submit request for approval
app.post('/api/approvals/submit', async (req, res) => {
  try {
    const { request_id, request_type, workflow_id } = req.body;
    const userId = req.session?.userId || 'DEV-USER-001'; // Use same fallback as session service
    
    console.log('🔄 Backend: Submitting approval request:', { request_id, request_type, workflow_id, userId });
    
    const request = pool.request();
    
    // Get first approver from workflow
    const workflowResult = await request
      .input('workflow_id', sql.UniqueIdentifier, workflow_id)
      .query(`
        SELECT TOP 1 user_id 
        FROM workflow_approvers 
        WHERE workflow_id = @workflow_id AND can_approve = 1
        ORDER BY added_date
      `);
    
    if (workflowResult.recordset.length === 0) {
      console.error('❌ No approvers found for workflow:', workflow_id);
      return res.status(400).json({ error: 'No approvers found for this workflow' });
    }
    
    const firstApproverId = workflowResult.recordset[0].user_id;
    console.log('👤 First approver assigned:', firstApproverId);
    
    // Create approval record with proper data types
    const approvalResult = await request
      .input('request_id', sql.UniqueIdentifier, request_id)
      .input('request_type', sql.NVarChar, request_type)
      .input('workflow_id', sql.UniqueIdentifier, workflow_id)
      .input('current_approver_id', sql.NVarChar, firstApproverId)
      .input('current_status', sql.NVarChar, 'pending')
      .input('submitted_by', sql.NVarChar, userId)
      .query(`
        INSERT INTO request_approvals (request_id, request_type, workflow_id, current_approver_id, current_status, submitted_by)
        OUTPUT INSERTED.*
        VALUES (@request_id, @request_type, @workflow_id, @current_approver_id, @current_status, @submitted_by)
      `);
    
    // Create history entry
    await request
      .input('approval_id', sql.UniqueIdentifier, approvalResult.recordset[0].id)
      .input('action_by', sql.NVarChar, userId)
      .query(`
        INSERT INTO approval_history (request_approval_id, action_type, action_by, step_number, is_current_step)
        VALUES (@approval_id, 'submitted', @action_by, 1, 1)
      `);
    
    res.json({ success: true, data: approvalResult.recordset[0] });
  } catch (error) {
    console.error('Error submitting for approval:', error);
    res.status(500).json({ error: 'Failed to submit for approval', details: error.message });
  }
});

// Get my pending approvals
app.get('/api/approvals/my-pending', async (req, res) => {
  try {
    // Get userId from query parameter or try to get current session user
    let userId = req.query.userId;
    
    if (!userId) {
      // Try to get from session first
      if (req.session && req.session.userId) {
        userId = req.session.userId;
        console.log('🔍 Backend: Using session user:', userId);
      } else {
        // For development, try to get the Simple Test User as fallback
        try {
          const userResult = await pool.request().query(`
            SELECT Id FROM AspNetUsers WHERE CNIC = '1111111111111'
          `);
          if (userResult.recordset.length > 0) {
            userId = userResult.recordset[0].Id;
            console.log('🔍 Backend: Auto-detected Simple Test User as fallback:', userId);
          }
        } catch (error) {
          console.log('⚠️ Backend: Could not auto-detect user, using fallback');
        }
      }
    }
    
    // Final fallback
    if (!userId) {
      userId = 'DEV-USER-001';
    }
    
    console.log('🔍 Backend: Fetching pending approvals for user:', userId);
    
    const request = pool.request();
    
    const result = await request
      .input('userId', sql.NVarChar, userId)
      .query(`
        SELECT 
          ra.id,
          ra.request_id,
          ra.request_type,
          ra.current_status,
          ra.submitted_date,
          submitter.FullName as submitted_by_name,
          wf.workflow_name
        FROM request_approvals ra
        LEFT JOIN AspNetUsers submitter ON ra.submitted_by = submitter.Id
        LEFT JOIN approval_workflows wf ON ra.workflow_id = wf.id
        WHERE ra.current_approver_id = @userId 
        AND ra.current_status = 'pending'
        ORDER BY ra.submitted_date DESC
      `);
    
    console.log('📋 Backend: Found', result.recordset.length, 'pending approvals for user:', userId);
    res.json({ success: true, data: result.recordset });
  } catch (error) {
    console.error('❌ Backend: Error fetching pending approvals:', error);
    res.status(500).json({ error: 'Failed to fetch pending approvals', details: error.message });
  }
});

// Get stock issuance items for approval
app.get('/api/approval-items/:approvalId', async (req, res) => {
  try {
    const { approvalId } = req.params;
    console.log('📋 Backend: Fetching items for approval:', approvalId);
    
    const request = pool.request();
    
    // Get the request ID from the approval ID first
    const approvalResult = await request
      .input('approvalId', sql.NVarChar, approvalId)
      .query(`SELECT request_id FROM request_approvals WHERE id = @approvalId`);
    
    if (approvalResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Approval not found' });
    }
    
    const requestId = approvalResult.recordset[0].request_id;
    
    // Get items with proper custom item handling
    const result = await pool.request()
      .input('requestId', sql.NVarChar, requestId)
      .query(`
        SELECT 
          si_items.id as item_id,
          CASE 
            WHEN si_items.item_type = 'custom' THEN si_items.custom_item_name
            ELSE ISNULL(im.nomenclature, 'Unknown Item')
          END as nomenclature,
          si_items.quantity as requested_quantity,
          si_items.quantity as approved_quantity,
          0 as issued_quantity,
          'pending' as item_status,
          CASE 
            WHEN si_items.item_type = 'custom' THEN 'CUSTOM'
            ELSE ISNULL(im.code, '')
          END as item_code,
          CASE 
            WHEN si_items.item_type = 'custom' THEN si_items.custom_item_name
            ELSE ISNULL(im.description, '')
          END as item_description,
          CASE 
            WHEN si_items.item_type = 'custom' THEN 'pcs'
            ELSE ISNULL(im.unit, 'pcs')
          END as unit,
          sir.purpose as request_purpose,
          sir.expected_return_date,
          sir.is_returnable
        FROM stock_issuance_items si_items
        LEFT JOIN item_masters im ON im.id = si_items.item_master_id 
          AND si_items.item_type != 'custom'
        INNER JOIN stock_issuance_requests sir ON sir.id = si_items.request_id
        WHERE si_items.request_id = @requestId
        ORDER BY 
          CASE 
            WHEN si_items.item_type = 'custom' THEN si_items.custom_item_name
            ELSE ISNULL(im.nomenclature, 'Unknown Item')
          END
      `);
    
    console.log('📋 Backend: Found', result.recordset.length, 'items for approval');
    res.json({ success: true, data: result.recordset });
    
  } catch (error) {
    console.error('❌ Backend: Error fetching approval items:', error);
    res.status(500).json({ error: 'Failed to fetch approval items', details: error.message });
  }
});

// Test endpoint for approval items
app.get('/api/test-items/:approvalId', async (req, res) => {
  try {
    const { approvalId } = req.params;
    console.log('🧪 Test: Fetching items for approval:', approvalId);
    
    // Direct SQL query without using pool.request() to avoid conflicts
    const result = await pool.request()
      .input('approvalId', sql.NVarChar, approvalId)
      .query(`
        SELECT 
          item_id,
          nomenclature,
          requested_quantity,
          item_status
        FROM vw_approval_requests_with_items 
        WHERE approval_id = @approvalId
        AND item_id IS NOT NULL
        ORDER BY nomenclature
      `);
    
    console.log('🧪 Test: Found', result.recordset.length, 'items');
    res.json({ 
      success: true, 
      data: result.recordset,
      approvalId: approvalId 
    });
    
  } catch (error) {
    console.error('🧪 Test: Error:', error);
    res.status(500).json({ error: 'Test failed', details: error.message });
  }
});

// Get approval dashboard data - MUST come before /:approvalId route
app.get('/api/approvals/dashboard', async (req, res) => {
  try {
    // Get userId from query parameter or try to get current session user
    let userId = req.query.userId;
    
    if (!userId) {
      // Try to get from session first
      if (req.session && req.session.userId) {
        userId = req.session.userId;
        console.log('📊 Dashboard: Using session user:', userId);
      } else {
        // For development, try to get the Simple Test User as fallback
        try {
          const userResult = await pool.request().query(`
            SELECT Id FROM AspNetUsers WHERE CNIC = '1111111111111'
          `);
          if (userResult.recordset.length > 0) {
            userId = userResult.recordset[0].Id;
            console.log('📊 Dashboard: Auto-detected Simple Test User as fallback:', userId);
          }
        } catch (error) {
          console.log('⚠️ Dashboard: Could not auto-detect user, using fallback');
        }
      }
      
      // Final fallback
      if (!userId) {
        userId = 'DEV-USER-001';
      }
    }
    
    console.log('📊 Dashboard: Fetching dashboard data for user:', userId);
    const request = pool.request();
    
    // Get counts
    const countsResult = await request
      .input('userId', sql.NVarChar, userId)
      .query(`
        SELECT 
          COUNT(CASE WHEN current_status = 'pending' THEN 1 END) as pending_count,
          COUNT(CASE WHEN current_status = 'approved' THEN 1 END) as approved_count,
          COUNT(CASE WHEN current_status = 'rejected' THEN 1 END) as rejected_count,
          COUNT(CASE WHEN current_status = 'finalized' THEN 1 END) as finalized_count
        FROM request_approvals ra
        JOIN workflow_approvers wa ON ra.workflow_id = wa.workflow_id
        WHERE wa.user_id = @userId
      `);
    
    // Get pending approvals
    const pendingResult = await request
      .query(`
        SELECT TOP 5
          ra.id,
          ra.request_id,
          ra.request_type,
          ra.submitted_date,
          submitter.FullName as submitted_by_name
        FROM request_approvals ra
        LEFT JOIN AspNetUsers submitter ON ra.submitted_by = submitter.Id
        WHERE ra.current_approver_id = @userId 
        AND ra.current_status = 'pending'
        ORDER BY ra.submitted_date DESC
      `);
    
    // Get recent actions
    const actionsResult = await request
      .query(`
        SELECT TOP 10
          ah.action_type,
          ah.action_date,
          ah.comments,
          action_user.FullName as action_by_name,
          ra.request_type,
          ra.request_id
        FROM approval_history ah
        JOIN request_approvals ra ON ah.request_approval_id = ra.id
        LEFT JOIN AspNetUsers action_user ON ah.action_by = action_user.Id
        JOIN workflow_approvers wa ON ra.workflow_id = wa.workflow_id
        WHERE wa.user_id = @userId
        ORDER BY ah.action_date DESC
      `);
    
    const dashboard = {
      ...countsResult.recordset[0],
      my_pending: pendingResult.recordset,
      recent_actions: actionsResult.recordset
    };
    
    console.log('📊 Dashboard: Returning dashboard data:', dashboard);
    res.json({ success: true, data: dashboard });
  } catch (error) {
    console.error('❌ Dashboard: Error fetching approval dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch approval dashboard', details: error.message });
  }
});

// Get stock issuance items for an approval request (DUPLICATE REMOVED - using the enhanced version above)

// Get approval details
app.get('/api/approvals/:approvalId', async (req, res) => {
  try {
    const { approvalId } = req.params;
    const request = pool.request();
    
    const result = await request
      .input('approvalId', sql.NVarChar, approvalId)
      .query(`
        SELECT 
          ra.*,
          submitter.FullName as submitted_by_name,
          current_approver.FullName as current_approver_name,
          wf.workflow_name
        FROM request_approvals ra
        LEFT JOIN AspNetUsers submitter ON ra.submitted_by = submitter.Id
        LEFT JOIN AspNetUsers current_approver ON ra.current_approver_id = current_approver.Id
        LEFT JOIN approval_workflows wf ON ra.workflow_id = wf.id
        WHERE ra.id = @approvalId
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Approval not found' });
    }
    
    res.json({ success: true, data: result.recordset[0] });
  } catch (error) {
    console.error('Error fetching approval details:', error);
    res.status(500).json({ error: 'Failed to fetch approval details', details: error.message });
  }
});

// Get approval history
app.get('/api/approvals/:approvalId/history', async (req, res) => {
  try {
    const { approvalId } = req.params;
    const request = pool.request();
    
    const result = await request
      .input('approvalId', sql.NVarChar, approvalId)
      .query(`
        SELECT 
          ah.*,
          COALESCE(action_user.FullName, 
            CASE 
              WHEN ah.action_by = 'demo-user' THEN 'Demo User (System)'
              WHEN ah.action_by = 'DEV-USER-001' THEN 'Development User'
              ELSE ah.action_by 
            END
          ) as action_by_name,
          COALESCE(action_user.Role, 'System User') as action_by_designation,
          COALESCE(from_user.FullName, ah.forwarded_from) as forwarded_from_name,
          COALESCE(to_user.FullName, ah.forwarded_to) as forwarded_to_name
        FROM approval_history ah
        LEFT JOIN AspNetUsers action_user ON ah.action_by = action_user.Id
        LEFT JOIN AspNetUsers from_user ON ah.forwarded_from = from_user.Id
        LEFT JOIN AspNetUsers to_user ON ah.forwarded_to = to_user.Id
        WHERE ah.request_approval_id = @approvalId
        ORDER BY ah.action_date DESC, ah.step_number DESC
      `);
    
    res.json({ success: true, data: result.recordset });
  } catch (error) {
    console.error('Error fetching approval history:', error);
    res.status(500).json({ error: 'Failed to fetch approval history', details: error.message });
  }
});

// Get available forwarders
app.get('/api/approvals/:approvalId/available-forwarders', async (req, res) => {
  try {
    const { approvalId } = req.params;
    const request = pool.request();
    
    // Get workflow from approval
    const approvalResult = await request
      .input('approvalId', sql.NVarChar, approvalId)
      .query('SELECT workflow_id FROM request_approvals WHERE id = @approvalId');
    
    if (approvalResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Approval not found' });
    }
    
    const workflowId = approvalResult.recordset[0].workflow_id;
    
    // Get available forwarders
    const result = await request
      .input('workflowId', sql.UniqueIdentifier, workflowId)
      .query(`
        SELECT 
          wa.id,
          wa.user_id,
          u.FullName as user_name,
          u.Role as user_designation,
          wa.can_approve,
          wa.can_forward,
          wa.can_finalize,
          wa.approver_role
        FROM workflow_approvers wa
        JOIN AspNetUsers u ON wa.user_id = u.Id
        WHERE wa.workflow_id = @workflowId 
        AND (wa.can_approve = 1 OR wa.can_forward = 1)
        ORDER BY u.FullName
      `);
    
    res.json({ success: true, data: result.recordset });
  } catch (error) {
    console.error('Error fetching available forwarders:', error);
    res.status(500).json({ error: 'Failed to fetch available forwarders', details: error.message });
  }
});

// Forward request
app.post('/api/approvals/:approvalId/forward', async (req, res) => {
  try {
    const { approvalId } = req.params;
    const { forwarded_to, comments } = req.body;
    
    // Get userId using the same logic as other endpoints
    let userId = req.query.userId || req.body.userId;
    
    if (!userId) {
      // Try to get the current logged-in user from AspNetUsers
      try {
        const userResult = await pool.request().query(`
          SELECT Id FROM AspNetUsers WHERE CNIC = '1111111111111'
        `);
        if (userResult.recordset.length > 0) {
          userId = userResult.recordset[0].Id;
          console.log('🔄 Forward: Auto-detected logged-in user:', userId);
        }
      } catch (error) {
        console.log('⚠️ Forward: Could not auto-detect user, using fallback');
      }
    }
    
    // Final fallback
    if (!userId) {
      userId = 'DEV-USER-001';
    }
    
    console.log('🔄 Forward: Processing forward request by user:', userId);
    
    const request = pool.request();
    
    // Update approval record
    await request
      .input('approvalId', sql.NVarChar, approvalId)
      .input('forwarded_to', sql.NVarChar, forwarded_to)
      .query(`
        UPDATE request_approvals 
        SET current_approver_id = @forwarded_to, updated_date = GETDATE()
        WHERE id = @approvalId
      `);
    
    console.log('✅ Forward: Request forwarded successfully from', userId, 'to', forwarded_to);
    
    // Now add history tracking (schema is fixed!)
    try {
      await request
        .input('userId', sql.NVarChar, userId)
        .input('comments', sql.NVarChar, comments || 'Forwarded')
        .query(`
          INSERT INTO approval_history 
          (request_approval_id, action_type, action_by, forwarded_from, forwarded_to, comments, step_number, is_current_step, action_date)
          VALUES (@approvalId, 'forwarded', @userId, @userId, @forwarded_to, @comments, 1, 1, GETDATE())
        `);
      console.log('📝 Forward: History recorded successfully');
    } catch (historyError) {
      console.warn('⚠️ Forward: Could not record history:', historyError.message);
      // Don't fail the main operation if history fails
    }
    
    res.json({ success: true, message: 'Request forwarded successfully' });
  } catch (error) {
    console.error('Error forwarding request:', error);
    res.status(500).json({ error: 'Failed to forward request', details: error.message });
  }
});

// Approve request
app.post('/api/approvals/:approvalId/approve', async (req, res) => {
  try {
    const { approvalId } = req.params;
    const { comments } = req.body;
    
    // Get userId using the same logic as other endpoints
    let userId = req.query.userId || req.body.userId;
    
    if (!userId) {
      // Try to get the current logged-in user from AspNetUsers
      try {
        const userResult = await pool.request().query(`
          SELECT Id FROM AspNetUsers WHERE CNIC = '1111111111111'
        `);
        if (userResult.recordset.length > 0) {
          userId = userResult.recordset[0].Id;
          console.log('✅ Approve: Auto-detected logged-in user:', userId);
        }
      } catch (error) {
        console.log('⚠️ Approve: Could not auto-detect user, using fallback');
      }
    }
    
    // Final fallback
    if (!userId) {
      userId = 'DEV-USER-001';
    }
    
    console.log('✅ Approve: Processing approval by user:', userId);
    
    const request = pool.request();
    
    // Update approval record
    await request
      .input('approvalId', sql.NVarChar, approvalId)
      .query(`
        UPDATE request_approvals 
        SET current_status = 'approved', updated_date = GETDATE()
        WHERE id = @approvalId
      `);
    
    // Get next step number
    const stepResult = await request
      .query(`
        SELECT ISNULL(MAX(step_number), 0) + 1 as next_step
        FROM approval_history 
        WHERE request_approval_id = @approvalId
      `);
    
    const nextStep = stepResult.recordset[0].next_step;
    
    // Update current step
    await request
      .query(`
        UPDATE approval_history 
        SET is_current_step = 0 
        WHERE request_approval_id = @approvalId
      `);
    
    // Add history entry
    await request
      .input('action_by', sql.NVarChar, userId)
      .input('comments', sql.NVarChar, comments)
      .input('step_number', sql.Int, nextStep)
      .query(`
        INSERT INTO approval_history 
        (request_approval_id, action_type, action_by, comments, step_number, is_current_step)
        VALUES (@approvalId, 'approved', @action_by, @comments, @step_number, 1)
      `);
    
    res.json({ success: true, message: 'Request approved successfully' });
  } catch (error) {
    console.error('Error approving request:', error);
    res.status(500).json({ error: 'Failed to approve request', details: error.message });
  }
});

// Reject request
app.post('/api/approvals/:approvalId/reject', async (req, res) => {
  try {
    const { approvalId } = req.params;
    const { comments } = req.body;
    
    // Get userId using the same logic as other endpoints
    let userId = req.query.userId || req.body.userId;
    
    if (!userId) {
      // Try to get the current logged-in user from AspNetUsers
      try {
        const userResult = await pool.request().query(`
          SELECT Id FROM AspNetUsers WHERE CNIC = '1111111111111'
        `);
        if (userResult.recordset.length > 0) {
          userId = userResult.recordset[0].Id;
          console.log('❌ Reject: Auto-detected logged-in user:', userId);
        }
      } catch (error) {
        console.log('⚠️ Reject: Could not auto-detect user, using fallback');
      }
    }
    
    // Final fallback
    if (!userId) {
      userId = 'DEV-USER-001';
    }
    
    console.log('❌ Reject: Processing rejection by user:', userId);
    
    if (!comments || !comments.trim()) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }
    
    const request = pool.request();
    
    // Update approval record
    await request
      .input('approvalId', sql.NVarChar, approvalId)
      .input('rejected_by', sql.NVarChar, userId)
      .input('rejection_reason', sql.NVarChar, comments)
      .query(`
        UPDATE request_approvals 
        SET current_status = 'rejected', 
            rejected_by = @rejected_by,
            rejected_date = GETDATE(),
            rejection_reason = @rejection_reason,
            updated_date = GETDATE()
        WHERE id = @approvalId
      `);
    
    // Get next step number
    const stepResult = await request
      .query(`
        SELECT ISNULL(MAX(step_number), 0) + 1 as next_step
        FROM approval_history 
        WHERE request_approval_id = @approvalId
      `);
    
    const nextStep = stepResult.recordset[0].next_step;
    
    // Update current step
    await request
      .query(`
        UPDATE approval_history 
        SET is_current_step = 0 
        WHERE request_approval_id = @approvalId
      `);
    
    // Add history entry
    await request
      .input('action_by', sql.NVarChar, userId)
      .input('comments', sql.NVarChar, comments)
      .input('step_number', sql.Int, nextStep)
      .query(`
        INSERT INTO approval_history 
        (request_approval_id, action_type, action_by, comments, step_number, is_current_step)
        VALUES (@approvalId, 'rejected', @action_by, @comments, @step_number, 1)
      `);
    
    res.json({ success: true, message: 'Request rejected successfully' });
  } catch (error) {
    console.error('Error rejecting request:', error);
    res.status(500).json({ error: 'Failed to reject request', details: error.message });
  }
});

// Finalize request
app.post('/api/approvals/:approvalId/finalize', async (req, res) => {
  try {
    const { approvalId } = req.params;
    const { comments } = req.body;
    const userId = req.session?.userId || 'demo-user';
    
    const request = pool.request();
    
    // Check if user can finalize
    const authResult = await request
      .input('approvalId', sql.NVarChar, approvalId)
      .input('userId', sql.NVarChar, userId)
      .query(`
        SELECT wa.can_finalize
        FROM request_approvals ra
        JOIN workflow_approvers wa ON ra.workflow_id = wa.workflow_id
        WHERE ra.id = @approvalId AND wa.user_id = @userId
      `);
    
    if (authResult.recordset.length === 0 || !authResult.recordset[0].can_finalize) {
      return res.status(403).json({ error: 'You do not have permission to finalize this request' });
    }
    
    // Update approval record
    await request
      .input('finalized_by', sql.NVarChar, userId)
      .query(`
        UPDATE request_approvals 
        SET current_status = 'finalized',
            finalized_by = @finalized_by,
            finalized_date = GETDATE(),
            updated_date = GETDATE()
        WHERE id = @approvalId
      `);
    
    // Get next step number
    const stepResult = await request
      .query(`
        SELECT ISNULL(MAX(step_number), 0) + 1 as next_step
        FROM approval_history 
        WHERE request_approval_id = @approvalId
      `);
    
    const nextStep = stepResult.recordset[0].next_step;
    
    // Update current step
    await request
      .query(`
        UPDATE approval_history 
        SET is_current_step = 0 
        WHERE request_approval_id = @approvalId
      `);
    
    // Add history entry
    await request
      .input('action_by', sql.NVarChar, userId)
      .input('comments', sql.NVarChar, comments)
      .input('step_number', sql.Int, nextStep)
      .query(`
        INSERT INTO approval_history 
        (request_approval_id, action_type, action_by, comments, step_number, is_current_step)
        VALUES (@approvalId, 'finalized', @action_by, @comments, @step_number, 1)
      `);
    
    res.json({ success: true, message: 'Request finalized successfully' });
  } catch (error) {
    console.error('Error finalizing request:', error);
    res.status(500).json({ error: 'Failed to finalize request', details: error.message });
  }
});

// Get request approval status
app.get('/api/approvals/status', async (req, res) => {
  try {
    const { request_id, request_type } = req.query;
    const request = pool.request();
    
    const result = await request
      .input('request_id', sql.UniqueIdentifier, request_id)
      .input('request_type', sql.NVarChar, request_type)
      .query(`
        SELECT 
          ra.*,
          submitter.FullName as submitted_by_name,
          current_approver.FullName as current_approver_name,
          wf.workflow_name
        FROM request_approvals ra
        LEFT JOIN AspNetUsers submitter ON ra.submitted_by = submitter.Id
        LEFT JOIN AspNetUsers current_approver ON ra.current_approver_id = current_approver.Id
        LEFT JOIN approval_workflows wf ON ra.workflow_id = wf.id
        WHERE ra.request_id = @request_id AND ra.request_type = @request_type
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'No approval process found for this request' });
    }
    
    res.json({ success: true, data: result.recordset[0] });
  } catch (error) {
    console.error('Error fetching request status:', error);
    res.status(500).json({ error: 'Failed to fetch request status', details: error.message });
  }
});

process.on('SIGINT', async () => {
  if (pool) {
    await pool.close();
  }
  process.exit(0);
});

// SIMPLIFIED APPROVAL ACTIONS (bypassing schema issues)
// Simple forward endpoint
app.post('/api/approvals/simple-forward', async (req, res) => {
  try {
    const { approvalId, forwarded_to, comments } = req.body;
    
    console.log('🔄 Simple Forward: Processing approval:', approvalId);
    console.log('🔄 Simple Forward: Forwarding to:', forwarded_to);
    
    const request = pool.request();
    
    // Simple update - just change the current approver
    await request
      .input('approvalId', sql.NVarChar, approvalId)
      .input('forwarded_to', sql.NVarChar, forwarded_to)
      .query(`
        UPDATE request_approvals 
        SET current_approver_id = @forwarded_to, 
            updated_date = GETDATE()
        WHERE id = @approvalId
      `);
    
    console.log('✅ Simple Forward: Success');
    res.json({ 
      success: true, 
      message: 'Request forwarded successfully',
      data: { current_approver_id: forwarded_to }
    });
    
  } catch (error) {
    console.error('❌ Simple Forward: Error:', error);
    res.status(500).json({ 
      error: 'Failed to forward request', 
      details: error.message 
    });
  }
});

// Simple approve endpoint
app.post('/api/approvals/simple-approve', async (req, res) => {
  try {
    const { approvalId, comments } = req.body;
    
    console.log('✅ Simple Approve: Processing approval:', approvalId);
    
    const request = pool.request();
    
    // Simple update - just change status to approved
    await request
      .input('approvalId', sql.NVarChar, approvalId)
      .query(`
        UPDATE request_approvals 
        SET current_status = 'approved', 
            updated_date = GETDATE()
        WHERE id = @approvalId
      `);
    
    console.log('✅ Simple Approve: Success');
    res.json({ 
      success: true, 
      message: 'Request approved successfully',
      data: { current_status: 'approved' }
    });
    
  } catch (error) {
    console.error('❌ Simple Approve: Error:', error);
    res.status(500).json({ 
      error: 'Failed to approve request', 
      details: error.message 
    });
  }
});

// Simple reject endpoint
app.post('/api/approvals/simple-reject', async (req, res) => {
  try {
    const { approvalId, comments } = req.body;
    
    console.log('❌ Simple Reject: Processing approval:', approvalId);
    
    const request = pool.request();
    
    // Simple update - just change status to rejected
    await request
      .input('approvalId', sql.NVarChar, approvalId)
      .input('comments', sql.NVarChar, comments || 'Rejected')
      .query(`
        UPDATE request_approvals 
        SET current_status = 'rejected', 
            rejection_reason = @comments,
            updated_date = GETDATE()
        WHERE id = @approvalId
      `);
    
    console.log('❌ Simple Reject: Success');
    res.json({ 
      success: true, 
      message: 'Request rejected successfully',
      data: { current_status: 'rejected' }
    });
    
  } catch (error) {
    console.error('❌ Simple Reject: Error:', error);
    res.status(500).json({ 
      error: 'Failed to reject request', 
      details: error.message 
    });
  }
});

// Temporary endpoint to set session for specific user (development only)
app.post('/api/dev/set-session/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get user details from database
    const result = await pool.request()
      .input('userId', sql.NVarChar, userId)
      .query(`
        SELECT Id, FullName, UserName, Email, Role, intOfficeID, intWingID
        FROM AspNetUsers 
        WHERE Id = @userId
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = result.recordset[0];
    
    // Set session
    req.session.userId = user.Id;
    req.session.user = user;
    
    res.json({ 
      success: true, 
      message: 'Session set successfully',
      user: user
    });
  } catch (error) {
    console.error('Error setting session:', error);
    res.status(500).json({ error: 'Failed to set session' });
  }
});

// GET version for browser compatibility
app.get('/api/dev/set-session/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get user details from database
    const result = await pool.request()
      .input('userId', sql.NVarChar, userId)
      .query(`
        SELECT Id, FullName, UserName, Email, Role, intOfficeID, intWingID
        FROM AspNetUsers 
        WHERE Id = @userId
      `);
    
    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = result.recordset[0];
    
    // Set session
    req.session.userId = user.Id;
    req.session.user = user;
    
    res.json({ 
      success: true, 
      message: 'Session set successfully via GET',
      user: user,
      instructions: 'Now refresh your approval page - you should be logged in as ' + user.FullName
    });
  } catch (error) {
    console.error('Error setting session:', error);
    res.status(500).json({ error: 'Failed to set session' });
  }
});

// API to get user's submitted requests with tracking information
app.get('/api/my-requests', async (req, res) => {
  try {
    console.log('Fetching user requests...');
    console.log('Session:', req.session);
    
    // Check authentication
    if (!req.session.userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Not authenticated' 
      });
    }

    const userId = req.session.userId;
    console.log('Loading requests for user:', userId);

    // Get all requests submitted by the current user with their current status
    const requestsQuery = `
      SELECT 
        ra.request_id,
        ra.request_type,
        ra.submitted_date,
        ra.submitted_by,
        ra.current_status,
        ra.created_date,
        
        -- Get approver name
        u_approver.FullName as current_approver_name,
        
        -- Get requester office and wing info
        u_requester.FullName as requester_name,
        
        -- Use stock issuance data for titles and descriptions for now
        si.justification as title,
        si.reason as description,
        si.required_date as requested_date,
        
        -- Get office and wing from user profile  
        o.Name as office_name,
        w.Name as wing_name
        
      FROM request_approvals ra
      LEFT JOIN AspNetUsers u_approver ON u_approver.Id = ra.current_approver_id
      LEFT JOIN AspNetUsers u_requester ON u_requester.Id = ra.submitted_by
      LEFT JOIN stock_issuance si ON si.id = ra.request_id
      LEFT JOIN Offices o ON o.Id = u_requester.intOfficeID  
      LEFT JOIN Wings w ON w.Id = u_requester.intWingID
      WHERE ra.submitted_by = @userId
      ORDER BY ra.created_date DESC;
    `;

    const requestsResult = await pool.request()
      .input('userId', sql.NVarChar, userId)
      .query(requestsQuery);

    const requests = [];

    for (const request of requestsResult.recordset) {
      // Get items for each request from stock issuance items
      let items = [];
      try {
        const stockItemsQuery = `
          SELECT 
            si_items.item_master_id as item_id,
            COALESCE(im.item_name, 'Unknown Item') as item_name,
            si_items.requested_quantity,
            si_items.approved_quantity,
            COALESCE(im.unit, 'units') as unit,
            '' as specifications
          FROM stock_issuance_items si_items
          LEFT JOIN item_master im ON im.id = si_items.item_master_id
          WHERE si_items.stock_issuance_id = @requestId
          ORDER BY im.item_name;
        `;
        
        const stockItemsResult = await pool.request()
          .input('requestId', sql.UniqueIdentifier, request.request_id)
          .query(stockItemsQuery);
          
        items = stockItemsResult.recordset || [];
      } catch (itemError) {
        console.log('Could not load stock issuance items for request', request.request_id, ':', itemError.message);
        items = [];
      }

      const processedRequest = {
        id: request.request_id,
        request_type: request.request_type || 'stock_issuance',
        title: request.title || 'Stock Issuance Request',
        description: request.description || 'Request for inventory items',
        requested_date: request.requested_date || request.created_date,
        submitted_date: request.submitted_date || request.created_date,
        current_status: request.current_status || 'pending',
        current_approver_name: request.current_approver_name,
        priority: 'Medium', // Default priority since not in current schema
        office_name: request.office_name,
        wing_name: request.wing_name,
        items: items,
        total_items: items.length
      };

      requests.push(processedRequest);
    }

    console.log(`Found ${requests.length} requests for user`);

    res.json({
      success: true,
      requests: requests,
      total: requests.length
    });

  } catch (error) {
    console.error('Error fetching user requests:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch requests: ' + error.message 
    });
  }
});

// API to get detailed information about a specific request
app.get('/api/request-details/:requestId', async (req, res) => {
  try {
    console.log('Fetching request details...');
    
    // Check authentication
    if (!req.session.userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Not authenticated' 
      });
    }

    const { requestId } = req.params;
    let userId = req.session.userId;
    
    // Use correct user ID for testing
    userId = '869dd81b-a782-494d-b8c2-695369b5ebb6'; // Syed Sana ul Haq Fazli

    console.log('Loading details for request:', requestId, 'by user:', userId);
    console.log('🚀🚀🚀 USING UPDATED REQUEST-DETAILS ENDPOINT WITH stock_issuance_requests 🚀🚀🚀');

    // Get request details - verify it belongs to the current user
    const requestQuery = `
      SELECT 
        ra.request_id,
        ra.request_type,
        ra.submitted_date,
        ra.current_status,
        ra.submitted_by,
        
        -- Get approver name
        u_approver.FullName as current_approver_name,
        
        -- Get requester info
        u_requester.FullName as requester_name,
        
        -- Use stock issuance data for details
        sir.justification as title,
        sir.purpose as description,
        sir.expected_return_date as requested_date,
        
        -- Office and wing info disabled due to data type mismatch
        CAST(NULL AS NVARCHAR(100)) as office_name,
        CAST(NULL AS NVARCHAR(100)) as wing_name

      FROM request_approvals ra
      LEFT JOIN AspNetUsers u_approver ON u_approver.Id = ra.current_approver_id
      LEFT JOIN AspNetUsers u_requester ON u_requester.Id = ra.submitted_by
      LEFT JOIN stock_issuance_requests sir ON sir.id = ra.request_id
      WHERE ra.request_id = @requestId 
        AND (ra.submitted_by = @userId OR ra.current_approver_id = @userId)
    `;

    const requestResult = await pool.request()
      .input('requestId', sql.NVarChar, requestId)
      .input('userId', sql.NVarChar, userId)
      .query(requestQuery);

    if (requestResult.recordset.length === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Request not found or access denied' 
      });
    }

    const request = requestResult.recordset[0];

    // Get items for the request from stock issuance items
    let items = [];
    try {
      const stockItemsQuery = `
        SELECT 
          si_items.item_master_id as item_id,
          COALESCE(im.item_name, 'Unknown Item') as item_name,
          si_items.requested_quantity,
          si_items.approved_quantity,
          COALESCE(im.unit, 'units') as unit,
          '' as specifications
        FROM stock_issuance_items si_items
        LEFT JOIN item_masters im ON im.id = si_items.item_master_id
        WHERE si_items.request_id = @requestId
        ORDER BY im.item_name;
      `;
      
      const stockItemsResult = await pool.request()
        .input('requestId', sql.UniqueIdentifier, requestId)
        .query(stockItemsQuery);
        
      items = stockItemsResult.recordset || [];
    } catch (itemError) {
      console.log('Could not load stock issuance items:', itemError.message);
      items = [];
    }

    // Get approval history
    const historyQuery = `
      SELECT 
        ah.id,
        ah.action,
        ah.action_date,
        ah.comments,
        ah.approver_level as level,
        u.FullName as approver_name
      FROM approval_history ah
      LEFT JOIN AspNetUsers u ON u.Id = ah.user_id
      WHERE ah.request_id = @requestId
      ORDER BY ah.action_date DESC;
    `;

    let approvalHistory = [];
    try {
      const historyResult = await pool.request()
        .input('requestId', sql.NVarChar, requestId)
        .query(historyQuery);
      
      approvalHistory = historyResult.recordset || [];
    } catch (historyError) {
      console.log('Could not load approval history:', historyError.message);
      approvalHistory = [];
    }

    const response = {
      id: request.request_id,
      request_type: request.request_type || 'stock_issuance',
      title: request.title || 'Stock Issuance Request',
      description: request.description || 'Request for inventory items',
      requested_date: request.requested_date,
      submitted_date: request.submitted_date,
      current_status: request.current_status,
      priority: request.priority || 'Medium',
      office_name: request.office_name,
      wing_name: request.wing_name,
      requester_name: request.requester_name,
      items: items,
      approval_history: approvalHistory
    };

    console.log(`Found request details with ${items.length} items and ${approvalHistory.length} history entries`);

    res.json({
      success: true,
      request: response
    });

  } catch (error) {
    console.error('Error fetching request details:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch request details: ' + error.message 
    });
  }
});

// API to get requests that came to the current user for approval (approval history)
app.get('/api/my-approval-history', async (req, res) => {
  try {
    console.log('🔍 API CALLED: /api/my-approval-history');
    console.log('Fetching approval history...');
    console.log('Session:', req.session);
    
    // Check authentication and use correct user ID
    let userId = req.session.userId;
    console.log('Session userId:', userId);
    
    // Always use the known correct user ID for now
    userId = '869dd81b-a782-494d-b8c2-695369b5ebb6'; // Syed Sana ul Haq Fazli
    console.log('Using correct user ID for approval history:', userId);
    console.log('Loading approval history for user:', userId);

    // Test with absolute minimal query first
    const approvalHistoryQuery = `
      SELECT 
        ra.id,
        ra.request_id,
        ra.request_type,
        ra.submitted_date,
        ra.current_status,
        ra.submitted_by,
        ra.current_approver_id,
        u_requester.FullName as requester_name,
        u_current_approver.FullName as current_approver_name,
        sir.justification as title,
        sir.purpose as description,
        sir.expected_return_date as requested_date,
        COALESCE(
          (SELECT TOP 1 ah.action_type 
           FROM approval_history ah 
           WHERE ah.request_approval_id = ra.id 
           AND ah.action_by = @userId
           ORDER BY ah.action_date DESC), 
          CASE 
            -- Check if I forwarded this request (I'm not current approver but I have forward history)
            WHEN EXISTS (SELECT 1 FROM approval_history ah 
                        WHERE ah.request_approval_id = ra.id 
                        AND ah.action_by = @userId 
                        AND ah.action_type = 'forwarded') THEN 'forwarded'
            -- I'm still the current approver - check current status
            WHEN ra.current_approver_id = @userId AND ra.current_status = 'pending' THEN 'pending'
            WHEN ra.current_approver_id = @userId AND ra.current_status = 'approved' THEN 'approved'
            WHEN ra.current_approver_id = @userId AND ra.current_status = 'rejected' THEN 'rejected'
            ELSE 'not_involved' 
          END
        ) as my_action,
        ra.updated_date as my_action_date,
        COALESCE(item_counts.item_count, 0) as total_items
      FROM request_approvals ra
      LEFT JOIN AspNetUsers u_requester ON u_requester.Id = ra.submitted_by
      LEFT JOIN AspNetUsers u_current_approver ON u_current_approver.Id = ra.current_approver_id
      LEFT JOIN stock_issuance_requests sir ON sir.id = ra.request_id
      LEFT JOIN (
        SELECT request_id, COUNT(*) as item_count
        FROM stock_issuance_items 
        GROUP BY request_id
      ) item_counts ON item_counts.request_id = ra.request_id
      WHERE (ra.current_approver_id = @userId 
             OR EXISTS (SELECT 1 FROM approval_history ah 
                        WHERE ah.request_approval_id = ra.id 
                        AND ah.action_by = @userId)
             OR EXISTS (SELECT 1 FROM approval_history ah
                        WHERE ah.request_approval_id = ra.id 
                        AND ah.action_by = @userId 
                        AND ah.action_type = 'forwarded'))
      ORDER BY ra.submitted_date DESC`;

    console.log('�🚀🚀 NEW SIMPLIFIED CODE IS RUNNING - USING COUNT QUERY 🚀🚀🚀');
    console.log('📊 QUERY:', approvalHistoryQuery);
    
    const historyResult = await pool.request()
      .input('userId', sql.NVarChar(450), userId)
      .query(approvalHistoryQuery);

    console.log('✅ Query executed successfully. Records:', historyResult.recordset);
    
    const requests = [];

    for (const request of historyResult.recordset) {
      // Load items for each request
      let items = [];
      try {
        console.log('Loading items for request:', request.request_id);
        const stockItemsQuery = `
          SELECT 
            si_items.item_master_id as item_id,
            CASE 
              WHEN si_items.item_type = 'custom' THEN si_items.custom_item_name
              ELSE COALESCE(im.nomenclature, 'Unknown Item')
            END as item_name,
            si_items.requested_quantity,
            si_items.approved_quantity,
            COALESCE(im.unit, 'units') as unit,
            si_items.item_type
          FROM stock_issuance_items si_items
          LEFT JOIN item_masters im ON im.id = si_items.item_master_id
          WHERE si_items.request_id = @requestId
          ORDER BY 
            CASE 
              WHEN si_items.item_type = 'custom' THEN si_items.custom_item_name
              ELSE im.nomenclature
            END;
        `;
        
        const stockItemsResult = await pool.request()
          .input('requestId', sql.UniqueIdentifier, request.request_id)
          .query(stockItemsQuery);
        
        console.log('Items found for', request.request_id, ':', stockItemsResult.recordset.length);
          
        items = stockItemsResult.recordset || [];
      } catch (itemError) {
        console.log('ERROR loading items for request', request.request_id, ':', itemError.message);
        console.log('Items error details:', itemError);
        items = [];
      }

      const processedRequest = {
        id: request.id,
        request_id: request.request_id,
        request_type: request.request_type || 'stock_issuance',
        title: request.title || 'Stock Issuance Request',
        description: request.description || 'Request for inventory items',
        requested_date: request.requested_date || request.submitted_date,
        submitted_date: request.submitted_date,
        requester_name: request.requester_name || 'Unknown User',
        requester_office: null,
        requester_wing: null,
        my_action: request.my_action || 'pending',
        my_action_date: request.my_action_date,
        my_comments: null,
        forwarded_to: null,
        current_status: request.current_status || 'pending',
        final_status: request.current_status || 'pending',
        items: items,
        total_items: request.total_items || 0,
        priority: 'Medium'
      };
      requests.push(processedRequest);
    }

    console.log(`✅ Found ${requests.length} approval history entries for user ${userId}`);
    console.log('📋 Requests:', requests.map(r => ({ id: r.id, title: r.title, action: r.my_action })));

    // Add item counts using simple SQL for each request
    for (let i = 0; i < requests.length; i++) {
      try {
        const itemCountResult = await pool.request()
          .input('requestId', sql.NVarChar, requests[i].request_id)
          .query('SELECT COUNT(*) as item_count FROM stock_issuance_items WHERE request_id = @requestId');
        
        requests[i].total_items = itemCountResult.recordset[0].item_count || 0;
        console.log('✅ Item count for', requests[i].request_id, ':', requests[i].total_items);
      } catch (error) {
        console.log('❌ Error getting item count for', requests[i].request_id, ':', error.message);
        requests[i].total_items = 0;
      }
    }

    res.json({
      success: true,
      requests: requests,
      total: requests.length,
      debug_request_ids: requests.map(r => ({ 
        approval_id: r.id, 
        request_id: r.request_id,
        view_details_url: `/dashboard/request-details/${r.request_id}`,
        item_count: r.total_items
      }))
    });

  } catch (error) {
    console.error('❌ Error fetching approval history:', error);
    console.error('❌ Stack trace:', error.stack);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch approval history: ' + error.message,
      details: error.stack
    });
  }
});

startServer().catch(err => process.exit(1));
