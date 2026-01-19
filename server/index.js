// ============================================================================
// Main Server Entry Point
// ============================================================================
// This file orchestrates the Express app and all middleware/routes
// All business logic is split into separate modules for maintainability

const express = require('express');
const session = require('express-session');
const config = require('./config/env');
const { initializePool } = require('./db/connection');
const corsMiddleware = require('./middleware/cors');
const requestLogger = require('./middleware/logger');

const app = express();

// ============================================================================
// Session Configuration
// ============================================================================
app.use(session({
  secret: config.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    httpOnly: true,
    sameSite: 'lax',
    maxAge: config.SESSION_MAX_AGE
  }
}));

// ============================================================================
// Global Middleware
// ============================================================================
app.use(corsMiddleware);
app.use(express.json());
app.use(requestLogger);

// ============================================================================
// Routes (To be implemented from original backend-server.cjs)
// ============================================================================
// Import route modules here
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const purchaseOrderRoutes = require('./routes/purchaseOrders');
const tenderRoutes = require('./routes/tenders');
const vendorRoutes = require('./routes/vendors');
const itemRoutes = require('./routes/items');
const categoryRoutes = require('./routes/categories');

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/tenders', tenderRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/items-master', itemRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/sub-categories', categoryRoutes);

// ============================================================================
// Error Handler (To be implemented)
// ============================================================================
// app.use((err, req, res, next) => {
//   console.error('Error:', err);
//   res.status(err.status || 500).json({
//     error: err.message || 'Internal server error'
//   });
// });

// ============================================================================
// Server Startup
// ============================================================================
async function startServer() {
  try {
    // Initialize database connection
    await initializePool();
    
    // Start listening
    app.listen(config.PORT, () => {
      console.log(`
╔════════════════════════════════════════════════════════════╗
║           Inventory Management System (IMS) API             ║
║                     Version 2.0 (Refactored)                ║
╚════════════════════════════════════════════════════════════╝

✅ Server running on port ${config.PORT}
📊 Database: ${config.DB_NAME}
📍 Environment: ${config.NODE_ENV}
🔐 CORS Enabled
      `);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

// Start the server
startServer();

module.exports = app;
