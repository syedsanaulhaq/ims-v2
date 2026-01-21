// Environment configuration
require('dotenv').config({ path: '.env.sqlserver' });

const config = {
  // Server
  PORT: process.env.PORT || 3001,
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // Database
  DB_HOST: process.env.SQL_SERVER_HOST || process.env.DB_HOST || 'SYED-FAZLI-LAPT',
  DB_PORT: parseInt(process.env.SQL_SERVER_PORT || process.env.DB_PORT || '1433', 10),
  DB_USER: process.env.SQL_SERVER_USER || process.env.DB_USER || 'sa',
  DB_PASSWORD: process.env.SQL_SERVER_PASSWORD || process.env.DB_PASSWORD || 'Syed@2020',
  DB_NAME: process.env.SQL_SERVER_DATABASE || process.env.DB_NAME || 'InventoryManagementSystem',
  
  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'YourVerySecureSecretKeyAtLeast32CharactersLong123456',
  JWT_ISSUER: 'DigitalSystem',
  JWT_AUDIENCE: 'IMS',
  
  // Session
  SESSION_SECRET: process.env.SESSION_SECRET || 'inventory-management-secret-key-2025',
  SESSION_MAX_AGE: 24 * 60 * 60 * 1000, // 24 hours
  
  // File uploads
  UPLOAD_DIR: 'uploads/tender-files',
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  ALLOWED_FILE_TYPES: /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt|jpg|jpeg|png|gif)$/i,
  
  // CORS
  CORS_ORIGINS: [
    'http://localhost:3000',
    'http://localhost:8080',
    'http://localhost:8081',
    'http://localhost:8082',
    'http://localhost:4173',
    'http://localhost',
    'http://172.20.150.34',
    'file://'
  ]
};

module.exports = config;
