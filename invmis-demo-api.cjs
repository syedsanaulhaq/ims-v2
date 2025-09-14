const express = require('express');
const cors = require('cors');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 5000;

// Session configuration
app.use(session({
  secret: 'invmis-demo-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:8080', 'http://localhost:8081', 'http://localhost:4173'],
  credentials: true
}));
app.use(express.json());

// Authentication middleware
const requireAuth = (req, res, next) => {
  if (req.session && req.session.userId) {
    next();
  } else {
    res.status(401).json({ error: 'Authentication required' });
  }
};

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: 'demo-mode',
    service: 'InvMIS Demo API',
    version: '1.0.0'
  });
});

// Demo users for testing
const demoUsers = [
  {
    id: '1',
    username: 'admin',
    password: 'admin123',
    fullName: 'System Administrator',
    email: 'admin@invmis.com',
    role: 'Administrator',
    officeId: 1,
    wingId: 1,
    officeName: 'Head Office',
    wingName: 'Administration'
  },
  {
    id: '2',
    username: 'testuser',
    password: '123456',
    fullName: 'Test User',
    email: 'testuser@invmis.com',
    role: 'User',
    officeId: 2,
    wingId: 2,
    officeName: 'Regional Office',
    wingName: 'Operations'
  },
  {
    id: '3',
    username: '3460172835174',
    password: 'admin123',
    fullName: 'Aqsa Noreen',
    email: 'aqsaecp@gmail.com',
    role: 'Administrator',
    officeId: 1,
    wingId: 1,
    officeName: 'ECP Office',
    wingName: 'IT Wing'
  }
];

// Authentication endpoints
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Find user in demo data
    const user = demoUsers.find(u => u.username === username);
    
    if (!user || user.password !== password) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Create session
    const userSession = {
      Id: user.id,
      UserName: user.username,
      FullName: user.fullName,
      Email: user.email,
      Role: user.role,
      intOfficeID: user.officeId,
      intWingID: user.wingId,
      OfficeName: user.officeName,
      WingName: user.wingName
    };

    req.session.userId = user.id;
    req.session.user = userSession;

    console.log(`✅ Demo user ${user.username} logged in successfully`);

    res.json({
      success: true,
      user: userSession,
      message: 'Login successful'
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Could not log out' });
    }
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: req.session.user });
});

// Users endpoints
app.get('/api/users', requireAuth, async (req, res) => {
  try {
    const users = demoUsers.map(user => ({
      Id: user.id,
      UserName: user.username,
      Email: user.email,
      FullName: user.fullName,
      Role: user.role,
      intOfficeID: user.officeId,
      intWingID: user.wingId,
      OfficeName: user.officeName,
      WingName: user.wingName,
      Status: 'Active',
      CreatedDate: new Date().toISOString()
    }));

    res.json(users);
  } catch (err) {
    console.error('Users fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Dashboard endpoints
app.get('/api/dashboard/summary', requireAuth, async (req, res) => {
  try {
    const summary = {
      totalUsers: demoUsers.length,
      totalOffices: 3,
      totalWings: 5,
      totalRoles: 2,
      lastUpdated: new Date().toISOString(),
      systemStatus: 'operational'
    };

    res.json(summary);
  } catch (err) {
    console.error('Dashboard summary error:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard summary' });
  }
});

// Offices endpoints
app.get('/api/offices', requireAuth, async (req, res) => {
  try {
    const offices = [
      { intOfficeID: 1, OfficeName: 'Head Office', OfficeCode: 'HO', IsActive: true, CreatedDate: new Date().toISOString() },
      { intOfficeID: 2, OfficeName: 'Regional Office', OfficeCode: 'RO', IsActive: true, CreatedDate: new Date().toISOString() },
      { intOfficeID: 3, OfficeName: 'Branch Office', OfficeCode: 'BO', IsActive: true, CreatedDate: new Date().toISOString() }
    ];

    res.json(offices);
  } catch (err) {
    console.error('Offices fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch offices' });
  }
});

// Wings endpoints  
app.get('/api/wings', requireAuth, async (req, res) => {
  try {
    const wings = [
      { intWingID: 1, WingName: 'Administration', WingCode: 'ADM', IsActive: true, CreatedDate: new Date().toISOString() },
      { intWingID: 2, WingName: 'Operations', WingCode: 'OPS', IsActive: true, CreatedDate: new Date().toISOString() },
      { intWingID: 3, WingName: 'IT Wing', WingCode: 'IT', IsActive: true, CreatedDate: new Date().toISOString() },
      { intWingID: 4, WingName: 'Finance', WingCode: 'FIN', IsActive: true, CreatedDate: new Date().toISOString() },
      { intWingID: 5, WingName: 'HR Wing', WingCode: 'HR', IsActive: true, CreatedDate: new Date().toISOString() }
    ];

    res.json(wings);
  } catch (err) {
    console.error('Wings fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch wings' });
  }
});

// Tenders endpoints
app.get('/api/tenders', requireAuth, async (req, res) => {
  try {
    const mockTenders = [
      {
        id: '1',
        tender_number: 'TND-2025-001',
        title: 'IT Equipment Procurement',
        description: 'Procurement of laptops and printers for office use',
        category: 'IT Equipment',
        department: 'IT Department',
        tender_type: 'open',
        status: 'active',
        estimated_value: 4700000,
        currency: 'PKR',
        publication_date: new Date().toISOString(),
        submission_deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        created_by: req.session.user.UserName,
        created_date: new Date().toISOString(),
        updated_date: new Date().toISOString(),
        documents_count: 2,
        bids_count: 2,
        contact_person: req.session.user.FullName,
        contact_email: req.session.user.Email
      },
      {
        id: '2',
        tender_number: 'TND-2025-002',
        title: 'Office Furniture Purchase',
        description: 'Procurement of office chairs and desks',
        category: 'Furniture',
        department: 'Administration',
        tender_type: 'limited',
        status: 'evaluation',
        estimated_value: 2300000,
        currency: 'PKR',
        publication_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        submission_deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        created_by: req.session.user.UserName,
        created_date: new Date().toISOString(),
        updated_date: new Date().toISOString(),
        documents_count: 3,
        bids_count: 5,
        contact_person: req.session.user.FullName,
        contact_email: req.session.user.Email
      }
    ];

    res.json(mockTenders);
  } catch (err) {
    console.error('Tenders fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch tenders' });
  }
});

// Inventory endpoints
app.get('/api/inventory', requireAuth, async (req, res) => {
  try {
    const mockInventory = [
      {
        id: '1',
        item_code: 'LAP-001',
        item_name: 'Laptop Computer',
        category: 'IT Equipment',
        current_stock: 45,
        unit_price: 85000,
        total_value: 3825000,
        status: 'In Stock',
        location: 'IT Store',
        last_updated: new Date().toISOString()
      },
      {
        id: '2', 
        item_code: 'PRN-001',
        item_name: 'Laser Printer',
        category: 'IT Equipment',
        current_stock: 8,
        unit_price: 45000,
        total_value: 360000,
        status: 'Low Stock',
        location: 'IT Store',
        last_updated: new Date().toISOString()
      },
      {
        id: '3',
        item_code: 'CHR-001',
        item_name: 'Office Chair',
        category: 'Furniture',
        current_stock: 120,
        unit_price: 15000,
        total_value: 1800000,
        status: 'In Stock',
        location: 'Furniture Store',
        last_updated: new Date().toISOString()
      }
    ];

    res.json(mockInventory);
  } catch (err) {
    console.error('Inventory fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 InvMIS Demo API Server running on port ${PORT}`);
  console.log(`📊 Mode: Demo (no database required)`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`👤 Demo Login Credentials:`);
  console.log(`   Username: admin, Password: admin123`);
  console.log(`   Username: testuser, Password: 123456`);
  console.log(`   Username: 3460172835174, Password: admin123`);
});

module.exports = app;