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
  origin: ['http://localhost:8080', 'http://localhost:8081', 'http://localhost:8082', 'http://localhost:4173'],
  credentials: true
}));
app.use(express.json());

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

// SQL Server configuration - Using exact server name from SSMS
const sqlConfig = {
  server: 'SYED-FAZLI-LAPT', // Exact server name as used in SSMS
  database: 'InventoryManagementDB',
  user: 'inventoryuser',
  password: '1978Jupiter87@#',
  port: 1433,
  options: {
    encrypt: false,
    trustServerCertificate: true,
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
app.get('/api/session', (req, res) => {
  // For now, always return the default session
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
      WHERE IS_ACT = 1
      ORDER BY DECName
    `);
    res.json(result.recordset);
  } catch (error) {
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

    // Get comprehensive inventory statistics
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
      MovementStats AS (
        SELECT 
          0 as issues_last_month,
          0 as returns_last_month,
          0 as total_issued_last_month,
          0 as total_returned_last_month
        -- Temporarily disable movement stats until we confirm table exists
        -- FROM stock_movement_log
        -- WHERE movement_date >= DATEADD(month, -1, GETDATE())
      ),
      CategoryStats AS (
        SELECT 
          COUNT(DISTINCT c.id) as total_categories,
          COUNT(DISTINCT sc.id) as total_subcategories
        FROM categories c
        LEFT JOIN sub_categories sc ON c.id = sc.category_id
      )
      SELECT 
        inv.*,
        mov.*,
        cat.*
      FROM InventoryStats inv
      CROSS JOIN MovementStats mov
      CROSS JOIN CategoryStats cat
    `);

    const stats = statsResult.recordset[0];

    // Get top moving items
    const topMovingResult = await pool.request().query(`
      SELECT TOP 10
        im.nomenclature,
        SUM(CASE WHEN sml.movement_type = 'Issue' THEN sml.quantity ELSE 0 END) as total_issued,
        SUM(CASE WHEN sml.movement_type = 'Return' THEN sml.quantity ELSE 0 END) as total_returned,
        cis.current_quantity,
        cis.available_quantity
      FROM stock_movement_log sml
      INNER JOIN item_masters im ON sml.item_master_id = im.id
      LEFT JOIN current_inventory_stock cis ON im.id = cis.item_master_id
      WHERE sml.movement_date >= DATEADD(month, -3, GETDATE())
      GROUP BY im.id, im.nomenclature, cis.current_quantity, cis.available_quantity
      ORDER BY (SUM(CASE WHEN sml.movement_type = 'Issue' THEN sml.quantity ELSE 0 END)) DESC
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
          total_subcategories: stats.total_subcategories
        }
      },
      top_moving_items: topMovingResult.recordset,
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
        currentQuantity = existingStockResult.recordset[0].current_quantity || 0;
        operationType = 'UPDATE';
        
        // Update existing record
        await transaction.request()
          .input('stockId', sql.UniqueIdentifier, existingStockResult.recordset[0].id)
          .input('newQuantity', sql.Int, quantity)
          .input('setupBy', sql.NVarChar, setupBy)
          .query(`
            UPDATE current_inventory_stock 
            SET 
              current_quantity = @newQuantity,
              available_quantity = @newQuantity - ISNULL(reserved_quantity, 0),
              last_updated = GETDATE(),
              updated_by = @setupBy
            WHERE id = @stockId
          `);
      } else {
        // Insert new record
        await transaction.request()
          .input('itemMasterId', sql.UniqueIdentifier, ItemMasterID)
          .input('quantity', sql.Int, quantity)
          .input('setupBy', sql.NVarChar, setupBy)
          .query(`
            INSERT INTO current_inventory_stock (
              id, item_master_id, current_quantity, available_quantity, reserved_quantity,
              minimum_stock_level, maximum_stock_level, reorder_point,
              created_at, last_updated, updated_by
            ) VALUES (
              NEWID(), @itemMasterId, @quantity, @quantity, 0,
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
        ItemDescription: itemMaster.nomenclature,
        Unit: itemMaster.unit,
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
app.post('/api/tenders', async (req, res) => {
  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin();
    const tenderId = uuidv4();
    const now = new Date();

    const { items, ...tenderData } = req.body;

    // Insert into tenders table
    const tenderRequest = transaction.request();
    tenderRequest.input('id', sql.UniqueIdentifier, tenderId);
    
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
          sqlType = sql.Int;
          value = value ? parseInt(value, 10) : null;
        } else if (field.endsWith('_id')) {
          sqlType = sql.UniqueIdentifier;
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
        itemRequest.input('id', sql.UniqueIdentifier, uuidv4());
        itemRequest.input('tender_id', sql.UniqueIdentifier, tenderId);
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
              sqlType = sql.Int;
              value = value ? parseInt(value, 10) : null;
            } else if (field === 'item_master_id') {
              sqlType = sql.VarChar(50);
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
      .input('id', sql.UniqueIdentifier, id)
      .query('SELECT * FROM tenders WHERE id = @id');

    if (tenderResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Tender not found' });
    }

    const itemsResult = await pool.request()
      .input('tender_id', sql.UniqueIdentifier, id)
      .query('SELECT * FROM tender_items WHERE tender_id = @tender_id');

    const tender = tenderResult.recordset[0];
    tender.items = itemsResult.recordset;

    res.json(tender);
  } catch (error) {
    console.error('Failed to fetch tender:', error);
    res.status(500).json({ error: 'Failed to fetch tender', details: error.message });
  }
});

// PUT /api/tenders/:id - Update a tender and its items
app.put('/api/tenders/:id', async (req, res) => {
  const { id } = req.params;
  const transaction = new sql.Transaction(pool);
  try {
    await transaction.begin();
    const now = new Date();

    const { items, ...tenderData } = req.body;

    // Update tenders table
    const tenderRequest = transaction.request();
    tenderRequest.input('id', sql.UniqueIdentifier, id);
    tenderRequest.input('updated_at', sql.DateTime, now);

    let updateQuery = 'UPDATE tenders SET updated_at = @updated_at';

    const tenderFields = [
      'reference_number', 'title', 'description', 'estimated_value', 'publish_date',
      'publication_date', 'submission_date', 'submission_deadline', 'opening_date',
      'status', 'document_path', 'created_by', 'advertisement_date', 'procedure_adopted',
      'procurement_method', 'publication_daily', 'contract_file_path', 'loi_file_path',
      'noting_file_path', 'po_file_path', 'rfp_file_path', 'tender_number', 'tender_type',
      'office_ids', 'wing_ids', 'dec_ids', 'tender_spot_type', 'vendor_id', 'tender_status',
      'individual_total', 'actual_price_total', 'is_finalized', 'finalized_at', 'finalized_by'
    ];

    for (const field of tenderFields) {
        if (tenderData[field] !== undefined) {
            updateQuery += `, ${field} = @${field}`;
            
            let value = tenderData[field];
            let sqlType = sql.NVarChar; // Default

            if (field.endsWith('_date') || field.endsWith('_deadline') || field === 'finalized_at') {
                sqlType = sql.DateTime;
                value = value ? new Date(value) : null;
            } else if (field.endsWith('_value') || field.endsWith('_total')) {
                sqlType = sql.Int;
                value = value ? parseInt(value, 10) : null;
            } else if (field.endsWith('_id')) {
                sqlType = sql.UniqueIdentifier;
            } else if (field === 'is_finalized') {
                sqlType = sql.Bit;
            }

            tenderRequest.input(field, sqlType, value);
        }
    }

    updateQuery += ' WHERE id = @id';
    await tenderRequest.query(updateQuery);

    // Delete existing items and re-insert them
    await transaction.request()
      .input('tender_id', sql.UniqueIdentifier, id)
      .query('DELETE FROM tender_items WHERE tender_id = @tender_id');

    if (items && Array.isArray(items) && items.length > 0) {
        for (const item of items) {
            const itemRequest = transaction.request();
            itemRequest.input('id', sql.UniqueIdentifier, item.id || uuidv4());
            itemRequest.input('tender_id', sql.UniqueIdentifier, id);
            itemRequest.input('created_at', sql.DateTime2, item.created_at ? new Date(item.created_at) : now);
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
                        sqlType = sql.Int;
                        value = value ? parseInt(value, 10) : null;
                    } else if (field === 'item_master_id') {
                        sqlType = sql.VarChar(50);
                    }
                    
                    itemRequest.input(field, sqlType, value);
                }
            }
            
            itemInsertQuery += ') ' + itemValuesQuery + ')';
            await itemRequest.query(itemInsertQuery);
        }
    }

    await transaction.commit();
    res.json({ success: true, message: 'Tender updated successfully' });

  } catch (error) {
    await transaction.rollback();
    console.error('Failed to update tender:', error);
    res.status(500).json({ error: 'Failed to update tender', details: error.message });
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

// PUT /api/tenders/:id/finalize - Finalize a tender
app.put('/api/tenders/:id/finalize', async (req, res) => {
    const { id } = req.params;
    const { finalized_by } = req.body;
    try {
        const now = new Date();
        const result = await pool.request()
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

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Tender not found or already finalized.' });
        }
        res.json({ success: true, message: 'Tender finalized successfully.' });
    } catch (error) {
        console.error('Failed to finalize tender:', error);
        res.status(500).json({ error: 'Failed to finalize tender', details: error.message });
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

    // Check if tender is finalized or delivery is finalized
    const checkResult = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        SELECT d.is_finalized, t.is_finalized as tender_is_finalized
        FROM deliveries d
        LEFT JOIN tenders t ON d.tender_id = t.id
        WHERE d.id = @id
      `);

    if (checkResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Delivery not found' });
    }

    const { is_finalized, tender_is_finalized } = checkResult.recordset[0];
    
    if (tender_is_finalized) {
      return res.status(400).json({ 
        error: 'Cannot update acquisition - tender is finalized',
        reason: 'tender_finalized'
      });
    }

    if (is_finalized) {
      return res.status(400).json({ 
        error: 'Cannot update acquisition - delivery is finalized',
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

    // Check if tender is finalized or delivery is finalized
    const checkResult = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query(`
        SELECT d.is_finalized, t.is_finalized as tender_is_finalized
        FROM deliveries d
        LEFT JOIN tenders t ON d.tender_id = t.id
        WHERE d.id = @id
      `);

    if (checkResult.recordset.length === 0) {
      return res.status(404).json({ error: 'Delivery not found' });
    }

    const { is_finalized, tender_is_finalized } = checkResult.recordset[0];
    
    if (tender_is_finalized) {
      return res.status(400).json({ 
        error: 'Cannot delete acquisition - tender is finalized',
        reason: 'tender_finalized'
      });
    }

    if (is_finalized) {
      return res.status(400).json({ 
        error: 'Cannot delete acquisition - delivery is finalized',
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
    if (!pool) {
      // Return mock data when SQL Server is not connected
      const mockItemMasters = [
        { id: '1', nomenclature: 'Desktop Computer', item_code: 'IT001', unit: 'Unit', category_id: '1', specifications: 'Intel i5, 8GB RAM, 500GB HDD' },
        { id: '2', nomenclature: 'Office Chair', item_code: 'FUR001', unit: 'Unit', category_id: '2', specifications: 'Ergonomic design, adjustable height' },
        { id: '3', nomenclature: 'A4 Paper', item_code: 'STA001', unit: 'Ream', category_id: '3', specifications: '80GSM, white, 500 sheets' }
      ];
      return res.json(mockItemMasters);
    }

    const result = await pool.request().query(`
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
      WHERE status != 'Deleted'
      ORDER BY nomenclature
    `);
    res.json(result.recordset);
  } catch (error) {
    // Fallback to mock data on any error
    const mockItemMasters = [
      { id: '1', nomenclature: 'Desktop Computer', item_code: 'IT001', unit: 'Unit', category_id: '1', specifications: 'Intel i5, 8GB RAM, 500GB HDD' },
      { id: '2', nomenclature: 'Office Chair', item_code: 'FUR001', unit: 'Unit', category_id: '2', specifications: 'Ergonomic design, adjustable height' },
      { id: '3', nomenclature: 'A4 Paper', item_code: 'STA001', unit: 'Ream', category_id: '3', specifications: '80GSM, white, 500 sheets' }
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
    res.json({ 
      success: true, 
      id: id,
      message: 'Item master updated successfully'
    });

  } catch (error) {
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
        { id: 1, category_name: 'Information Technology', description: 'IT equipment and software', status: 'Active' },
        { id: 2, category_name: 'Furniture', description: 'Office furniture and fixtures', status: 'Active' },
        { id: 3, category_name: 'Stationery', description: 'Office supplies and stationery', status: 'Active' },
        { id: 4, category_name: 'Vehicles', description: 'Government vehicles and transport', status: 'Active' },
        { id: 5, category_name: 'Medical Equipment', description: 'Medical and healthcare equipment', status: 'Active' }
      ];
      return res.json(mockCategories);
    }

    const result = await pool.request().query(`
      SELECT 
        intOfficeID as id,
        strCategoryName as category_name,
        strDescription as description,
        CASE WHEN IS_ACT = 1 THEN 'Active' ELSE 'Inactive' END as status,
        dtCreated as created_at,
        dtLastUpdated as updated_at
      FROM Category_MST 
      WHERE IS_ACT = 1
      ORDER BY strCategoryName
    `);
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching categories:', error);
    // Fallback to mock data on any error
    const mockCategories = [
      { id: 1, category_name: 'Information Technology', description: 'IT equipment and software', status: 'Active' },
      { id: 2, category_name: 'Furniture', description: 'Office furniture and fixtures', status: 'Active' },
      { id: 3, category_name: 'Stationery', description: 'Office supplies and stationery', status: 'Active' },
      { id: 4, category_name: 'Vehicles', description: 'Government vehicles and transport', status: 'Active' },
      { id: 5, category_name: 'Medical Equipment', description: 'Medical and healthcare equipment', status: 'Active' }
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

// ==============================================
// INVENTORY DASHBOARD ENDPOINTS
// ==============================================

// Get inventory dashboard data
app.get('/api/inventory/dashboard', async (req, res) => {
  try {
    if (!pool) {
      // Return mock data when SQL Server is not connected
      return res.json({
        success: true,
        data: {
          items: [],
          stats: {
            totalItems: 0,
            totalStockValue: 0,
            lowStockItems: 0,
            outOfStockItems: 0,
            normalStockItems: 0,
            overstockItems: 0
          }
        }
      });
    }

    // Get all inventory items with proper joins
    const result = await pool.request().query(`
      SELECT TOP 1000
        im.id,
        im.nomenclature as itemName,
        im.item_code as itemCode,
        COALESCE(cis.current_quantity, 0) as currentStock,
        COALESCE(im.minimum_stock_level, 0) as minimumStock,
        COALESCE(im.maximum_stock_level, 0) as maximumStock,
        COALESCE(im.reorder_point, 0) as reorderLevel,
        im.unit,
        COALESCE(s.store_name, 'Main Store') as location,
        COALESCE(c.category_name, 'General') as category,
        COALESCE(sc.sub_category_name, 'General') as subCategory,
        COALESCE(cis.last_updated, im.updated_at, GETDATE()) as lastUpdated,
        'Active' as status
      FROM item_masters im
      LEFT JOIN current_inventory_stock cis ON im.id = cis.item_master_id
      LEFT JOIN stores s ON cis.store_id = s.id
      LEFT JOIN categories c ON im.category_id = c.id
      LEFT JOIN sub_categories sc ON im.sub_category_id = sc.id
      WHERE im.is_active = 1
      ORDER BY COALESCE(cis.current_quantity, 0) DESC
    `);

    const items = result.recordset.map(item => ({
      ...item,
      lastUpdated: new Date(item.lastUpdated).toISOString()
    }));

    // Calculate statistics
    const stats = {
      totalItems: items.length,
      totalStockValue: items.reduce((sum, item) => sum + (item.currentStock * 100), 0), // Mock value calculation
      lowStockItems: items.filter(item => 
        item.currentStock <= item.minimumStock && item.minimumStock > 0
      ).length,
      outOfStockItems: items.filter(item => item.currentStock <= 0).length,
      normalStockItems: items.filter(item => 
        item.currentStock > item.minimumStock && 
        item.currentStock <= (item.maximumStock || 999999)
      ).length,
      overstockItems: items.filter(item => 
        item.maximumStock > 0 && item.currentStock > item.maximumStock
      ).length
    };

    res.json({
      success: true,
      data: { items, stats }
    });

  } catch (error) {
    console.error('❌ Error fetching inventory dashboard data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inventory dashboard data',
      error: error.message
    });
  }
});

// Get low stock items
app.get('/api/inventory/low-stock', async (req, res) => {
  try {
    if (!pool) {
      return res.json({ success: true, data: [] });
    }

    const result = await pool.request().query(`
      SELECT TOP 50
        im.id,
        im.nomenclature as itemName,
        im.item_code as itemCode,
        COALESCE(cis.current_quantity, 0) as currentStock,
        COALESCE(im.minimum_stock_level, 0) as minimumStock,
        COALESCE(im.reorder_point, 0) as reorderLevel,
        im.unit,
        COALESCE(s.store_name, 'Main Store') as location,
        'Active' as status
      FROM item_masters im
      LEFT JOIN current_inventory_stock cis ON im.id = cis.item_master_id
      LEFT JOIN stores s ON cis.store_id = s.id
      WHERE im.is_active = 1 
        AND (
          COALESCE(cis.current_quantity, 0) <= COALESCE(im.minimum_stock_level, 0)
          OR COALESCE(cis.current_quantity, 0) <= COALESCE(im.reorder_point, 0)
        )
        AND COALESCE(im.minimum_stock_level, 0) > 0
      ORDER BY COALESCE(cis.current_quantity, 0) ASC
    `);

    res.json({
      success: true,
      data: result.recordset
    });

  } catch (error) {
    console.error('❌ Error fetching low stock items:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch low stock items',
      error: error.message
    });
  }
});

// Get items needing reorder
app.get('/api/inventory/reorder', async (req, res) => {
  try {
    if (!pool) {
      return res.json({ success: true, data: [] });
    }

    const result = await pool.request().query(`
      SELECT TOP 50
        im.id,
        im.nomenclature as itemName,
        im.item_code as itemCode,
        COALESCE(cis.current_quantity, 0) as currentStock,
        COALESCE(im.minimum_stock_level, 0) as minimumStock,
        COALESCE(im.reorder_point, 0) as reorderLevel,
        im.unit,
        COALESCE(s.store_name, 'Main Store') as location,
        'Active' as status
      FROM item_masters im
      LEFT JOIN current_inventory_stock cis ON im.id = cis.item_master_id
      LEFT JOIN stores s ON cis.store_id = s.id
      WHERE im.is_active = 1 
        AND COALESCE(im.reorder_point, 0) > 0
        AND COALESCE(cis.current_quantity, 0) <= COALESCE(im.reorder_point, 0)
      ORDER BY COALESCE(cis.current_quantity, 0) ASC
    `);

    res.json({
      success: true,
      data: result.recordset
    });

  } catch (error) {
    console.error('❌ Error fetching reorder items:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reorder items',
      error: error.message
    });
  }
});

// Get top items by stock quantity
app.get('/api/inventory/top-items', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    if (!pool) {
      return res.json({ success: true, data: [] });
    }

    const result = await pool.request()
      .input('limit', sql.Int, parseInt(limit))
      .query(`
        SELECT TOP (@limit)
          im.id,
          im.nomenclature as itemName,
          im.item_code as itemCode,
          COALESCE(cis.current_quantity, 0) as currentStock,
          im.unit,
          COALESCE(s.store_name, 'Main Store') as location,
          'Active' as status
        FROM item_masters im
        LEFT JOIN current_inventory_stock cis ON im.id = cis.item_master_id
        LEFT JOIN stores s ON cis.store_id = s.id
        WHERE im.is_active = 1
        ORDER BY COALESCE(cis.current_quantity, 0) DESC
      `);

    res.json({
      success: true,
      data: result.recordset
    });

  } catch (error) {
    console.error('❌ Error fetching top items:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch top items',
      error: error.message
    });
  }
});

// ===================================
// INVENTORY DASHBOARD ENDPOINTS
// ===================================

// Get inventory dashboard data
app.get('/api/inventory/dashboard', async (req, res) => {
  try {
    if (!pool) {
      return res.json({
        success: false,
        message: 'Database not connected',
        data: { items: [], stats: { totalItems: 0, totalStockValue: 0, lowStockItems: 0, outOfStockItems: 0, normalStockItems: 0, overstockItems: 0 } }
      });
    }

    // Get inventory items with stock information
    const result = await pool.request().query(`
      SELECT 
        im.intOfficeID as id,
        im.strItemMaster as itemName,
        im.strItemCode as itemCode,
        ISNULL(cs.intCurrentStock, 0) as currentStock,
        ISNULL(im.intMinimumStockLevel, 0) as minimumStock,
        ISNULL(im.intMaximumStockLevel, 0) as maximumStock,
        ISNULL(im.intReorderPoint, 0) as reorderLevel,
        im.strUnit as unit,
        ISNULL(store.strStoreName, 'Main Store') as location,
        ISNULL(cat.strCategoryName, 'General') as category,
        ISNULL(subcat.strSubCategoryName, 'General') as subCategory,
        im.dtLastUpdated as lastUpdated,
        CASE 
          WHEN im.IS_ACT = 1 THEN 'Active'
          ELSE 'Inactive'
        END as status
      FROM Item_MST im
      LEFT JOIN Current_Stock cs ON im.intOfficeID = cs.intItemMasterID
      LEFT JOIN Store_MST store ON cs.intStoreID = store.intOfficeID
      LEFT JOIN Category_MST cat ON im.intCategoryID = cat.intOfficeID
      LEFT JOIN Sub_Category_MST subcat ON im.intSubCategoryID = subcat.intOfficeID
      WHERE im.IS_ACT = 1
      ORDER BY im.strItemMaster
    `);

    const items = result.recordset.map(item => ({
      ...item,
      currentStock: parseInt(item.currentStock) || 0,
      minimumStock: parseInt(item.minimumStock) || 0,
      maximumStock: parseInt(item.maximumStock) || 0,
      reorderLevel: parseInt(item.reorderLevel) || 0,
      lastUpdated: item.lastUpdated?.toISOString() || new Date().toISOString()
    }));

    // Calculate statistics
    const totalItems = items.length;
    const lowStockItems = items.filter(item => 
      item.currentStock <= item.minimumStock && item.minimumStock > 0
    ).length;
    const outOfStockItems = items.filter(item => item.currentStock <= 0).length;
    const normalStockItems = items.filter(item => 
      item.currentStock > item.minimumStock && 
      (item.maximumStock === 0 || item.currentStock <= item.maximumStock)
    ).length;
    const overstockItems = items.filter(item => 
      item.maximumStock > 0 && item.currentStock > item.maximumStock
    ).length;

    const stats = {
      totalItems,
      totalStockValue: 0, // Would need price data to calculate
      lowStockItems,
      outOfStockItems,
      normalStockItems,
      overstockItems
    };

    res.json({
      success: true,
      data: { items, stats }
    });

  } catch (error) {
    console.error('Error fetching inventory dashboard data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inventory data',
      data: { items: [], stats: { totalItems: 0, totalStockValue: 0, lowStockItems: 0, outOfStockItems: 0, normalStockItems: 0, overstockItems: 0 } }
    });
  }
});

// Get low stock items
app.get('/api/inventory/low-stock', async (req, res) => {
  try {
    if (!pool) {
      return res.json({ success: true, data: [] });
    }

    const result = await pool.request().query(`
      SELECT TOP 15
        im.intOfficeID as id,
        im.strItemMaster as itemName,
        im.strItemCode as itemCode,
        ISNULL(cs.intCurrentStock, 0) as currentStock,
        ISNULL(im.intMinimumStockLevel, 0) as minimumStock,
        im.strUnit as unit,
        ISNULL(store.strStoreName, 'Main Store') as location,
        'Low Stock' as status
      FROM Item_MST im
      LEFT JOIN Current_Stock cs ON im.intOfficeID = cs.intItemMasterID
      LEFT JOIN Store_MST store ON cs.intStoreID = store.intOfficeID
      WHERE im.IS_ACT = 1 
        AND im.intMinimumStockLevel > 0
        AND ISNULL(cs.intCurrentStock, 0) <= im.intMinimumStockLevel
      ORDER BY cs.intCurrentStock ASC
    `);

    const items = result.recordset.map(item => ({
      ...item,
      currentStock: parseInt(item.currentStock) || 0,
      minimumStock: parseInt(item.minimumStock) || 0,
      lastUpdated: new Date().toISOString()
    }));

    res.json({ success: true, data: items });

  } catch (error) {
    console.error('Error fetching low stock items:', error);
    res.json({ success: true, data: [] });
  }
});

// Get items needing reorder
app.get('/api/inventory/reorder', async (req, res) => {
  try {
    if (!pool) {
      return res.json({ success: true, data: [] });
    }

    const result = await pool.request().query(`
      SELECT TOP 12
        im.intOfficeID as id,
        im.strItemMaster as itemName,
        im.strItemCode as itemCode,
        ISNULL(cs.intCurrentStock, 0) as currentStock,
        ISNULL(im.intReorderPoint, 0) as reorderLevel,
        im.strUnit as unit,
        ISNULL(store.strStoreName, 'Main Store') as location,
        'Reorder' as status
      FROM Item_MST im
      LEFT JOIN Current_Stock cs ON im.intOfficeID = cs.intItemMasterID
      LEFT JOIN Store_MST store ON cs.intStoreID = store.intOfficeID
      WHERE im.IS_ACT = 1 
        AND im.intReorderPoint > 0
        AND ISNULL(cs.intCurrentStock, 0) <= im.intReorderPoint
      ORDER BY cs.intCurrentStock ASC
    `);

    const items = result.recordset.map(item => ({
      ...item,
      currentStock: parseInt(item.currentStock) || 0,
      reorderLevel: parseInt(item.reorderLevel) || 0,
      lastUpdated: new Date().toISOString()
    }));

    res.json({ success: true, data: items });

  } catch (error) {
    console.error('Error fetching reorder items:', error);
    res.json({ success: true, data: [] });
  }
});

// Get top items by stock quantity
app.get('/api/inventory/top-items', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    if (!pool) {
      return res.json({ success: true, data: [] });
    }

    const result = await pool.request()
      .input('limit', sql.Int, limit)
      .query(`
        SELECT TOP (@limit)
          im.intOfficeID as id,
          im.strItemMaster as itemName,
          im.strItemCode as itemCode,
          ISNULL(cs.intCurrentStock, 0) as currentStock,
          im.strUnit as unit,
          ISNULL(store.strStoreName, 'Main Store') as location,
          'Active' as status
        FROM Item_MST im
        LEFT JOIN Current_Stock cs ON im.intOfficeID = cs.intItemMasterID
        LEFT JOIN Store_MST store ON cs.intStoreID = store.intOfficeID
        WHERE im.IS_ACT = 1
        ORDER BY cs.intCurrentStock DESC
      `);

    const items = result.recordset.map(item => ({
      ...item,
      currentStock: parseInt(item.currentStock) || 0,
      lastUpdated: new Date().toISOString()
    }));

    res.json({ success: true, data: items });

  } catch (error) {
    console.error('Error fetching top items:', error);
    res.json({ success: true, data: [] });
  }
});

// Get current stock for all items
app.get('/api/inventory/current-stock', async (req, res) => {
  try {
    if (!pool) {
      return res.json({ success: false, message: 'Database not connected', data: [] });
    }

    const result = await pool.request().query(`
      SELECT 
        cs.intOfficeID as id,
        cs.intItemMasterID as item_master_id,
        ISNULL(cs.intCurrentStock, 0) as current_quantity,
        cs.dtLastUpdated as last_updated,
        im.strItemMaster as item_name,
        im.strUnit as unit
      FROM Current_Stock cs
      INNER JOIN Item_MST im ON cs.intItemMasterID = im.intOfficeID
      WHERE cs.IS_ACT = 1 AND im.IS_ACT = 1
      ORDER BY im.strItemMaster
    `);

    const stockData = result.recordset.map(item => ({
      ...item,
      current_quantity: parseInt(item.current_quantity) || 0,
      last_updated: item.last_updated?.toISOString() || new Date().toISOString()
    }));

    res.json({ success: true, data: stockData });

  } catch (error) {
    console.error('Error fetching current stock:', error);
    res.json({ success: false, message: 'Failed to fetch current stock', data: [] });
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
      console.log('📊 Inventory Dashboard endpoints added!');
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
    const { userId } = req.params;
    
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
          af.IssuanceId,
          si.IssuanceNumber,
          ru.FullName as RequestedByName,
          ru.Email as RequestedByEmail,
          ff.FullName as ForwardedFromName,
          ff.Email as ForwardedFromEmail,
          af.ForwardReason,
          af.ForwardDate,
          af.Priority,
          af.DueDate,
          af.Level,
          si.CreatedDate as RequestDate,
          si.ApprovalStatus
        FROM IssuanceApprovalForwards af
        INNER JOIN StockIssuances si ON af.IssuanceId = si.Id
        INNER JOIN AspNetUsers ru ON si.RequestedBy = ru.Id
        INNER JOIN AspNetUsers ff ON af.ForwardedFromUserId = ff.Id
        WHERE af.ForwardedToUserId = @userId 
          AND af.IsActive = 1
        ORDER BY af.ForwardDate DESC
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
    // In a real application, you would store notifications in the database
    // For now, we'll just log them and return the notification object
    const notification = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      userId,
      title,
      message,
      type,
      actionUrl,
      actionText,
      isRead: false,
      createdAt: new Date().toISOString()
    };
    
    console.log(`📧 Notification created for user ${userId}:`, notification);
    
    // TODO: In production, save to database
    // await pool.request()
    //   .input('userId', sql.NVarChar, userId)
    //   .input('title', sql.NVarChar, title)
    //   .input('message', sql.NVarChar, message)
    //   .input('type', sql.NVarChar, type)
    //   .input('actionUrl', sql.NVarChar, actionUrl)
    //   .input('actionText', sql.NVarChar, actionText)
    //   .query(`
    //     INSERT INTO Notifications (UserId, Title, Message, Type, ActionUrl, ActionText, IsRead, CreatedAt)
    //     VALUES (@userId, @title, @message, @type, @actionUrl, @actionText, 0, GETDATE())
    //   `);
    
    return notification;
  } catch (error) {
    console.error('❌ Error creating notification:', error);
  }
}

// Get notifications for a user
app.get('/api/notifications/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // TODO: In production, fetch from database
    // const result = await pool.request()
    //   .input('userId', sql.NVarChar, userId)
    //   .query(`
    //     SELECT * FROM Notifications 
    //     WHERE UserId = @userId 
    //     ORDER BY CreatedAt DESC
    //   `);
    
    // For now, return empty array (frontend uses localStorage)
    res.json([]);
    
  } catch (error) {
    console.error('❌ Error fetching notifications:', error);
    res.status(500).json({ 
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
    if (!pool) {
      return res.status(500).json({ error: 'Database connection not available' });
    }

    // Get comprehensive acquisition statistics
    const statsQuery = `
      WITH TenderStats AS (
        SELECT 
          COUNT(*) as totalTenders,
          COUNT(CASE WHEN is_finalized = 0 THEN 1 END) as activeTenders,
          COUNT(CASE WHEN is_finalized = 1 THEN 1 END) as completedTenders,
          SUM(CASE WHEN estimated_total_cost IS NOT NULL THEN estimated_total_cost ELSE 0 END) as totalValue,
          COUNT(CASE WHEN created_at >= DATEADD(month, -1, GETDATE()) THEN 1 END) as monthlyAcquisitions
        FROM tenders
      ),
      DeliveryStats AS (
        SELECT 
          COUNT(DISTINCT d.id) as pendingDeliveries,
          COUNT(DISTINCT di.item_master_id) as totalItems,
          SUM(di.quantity_delivered) as totalQuantity
        FROM deliveries d
        INNER JOIN delivery_items di ON d.id = di.delivery_id
        WHERE d.finalized = 0 OR d.finalized IS NULL
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
    
    if (result.recordset.length > 0) {
      res.json(result.recordset[0]);
    } else {
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

process.on('SIGINT', async () => {
  if (pool) {
    await pool.close();
  }
  process.exit(0);
});

startServer().catch(err => process.exit(1));
