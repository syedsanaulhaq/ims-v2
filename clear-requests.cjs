const sql = require('mssql');

const config = {
  server: 'localhost',
  database: 'IMS_Database',
  authentication: {
    type: 'default'
  },
  options: {
    trustServerCertificate: true,
    encrypt: false
  }
};

async function clearAllRequests() {
  const pool = new sql.ConnectionPool(config);
  try {
    await pool.connect();
    console.log('✓ Connected to database');

    // Clear in order of foreign key dependencies
    await pool.request().query('DELETE FROM approval_history');
    console.log('✓ Cleared approval_history');

    await pool.request().query('DELETE FROM approval_items');
    console.log('✓ Cleared approval_items');

    await pool.request().query('DELETE FROM request_approvals');
    console.log('✓ Cleared request_approvals');

    await pool.request().query('DELETE FROM stock_issuance_items');
    console.log('✓ Cleared stock_issuance_items');

    await pool.request().query('DELETE FROM stock_issuance_requests');
    console.log('✓ Cleared stock_issuance_requests');

    console.log('\n✓ All requests cleared successfully!');
    console.log('✓ Database is now empty - ready for fresh test');

    await pool.close();
    process.exit(0);
  } catch (error) {
    console.error('✗ Error clearing requests:', error.message);
    process.exit(1);
  }
}

clearAllRequests();
