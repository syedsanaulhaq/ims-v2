const sql = require('mssql');

const config = {
  server: 'SYED-FAZLI-LAPT',
  database: 'InventoryManagementDB',
  authentication: {
    type: 'default',
    options: {
      userName: 'inventorymanagementuser',
      password: '2016Wfp61@'
    }
  },
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableKeepAlive: true,
  }
};

async function cleanupAllRequests() {
  const pool = new sql.ConnectionPool(config);
  
  try {
    await pool.connect();
    console.log('✓ Connected to database\n');

    console.log('🗑️  CLEANING UP ALL REQUESTS...\n');

    console.log('📋 Deleting in order:\n');

    // Delete approval_history entries
    console.log('1. Deleting approval_history entries...');
    await pool.request()
      .query(`
        DELETE FROM approval_history
        WHERE request_approval_id IN (
          SELECT id FROM request_approvals 
          WHERE request_id IN (SELECT id FROM stock_issuance_requests)
        )
      `);
    console.log('   ✓ Done\n');

    // Delete approval_items
    console.log('2. Deleting approval_items...');
    await pool.request()
      .query(`
        DELETE FROM approval_items
        WHERE request_approval_id IN (
          SELECT id FROM request_approvals 
          WHERE request_id IN (SELECT id FROM stock_issuance_requests)
        )
      `);
    console.log('   ✓ Done\n');

    // Delete request_approvals
    console.log('3. Deleting request_approvals...');
    await pool.request()
      .query(`
        DELETE FROM request_approvals
        WHERE request_id IN (SELECT id FROM stock_issuance_requests)
      `);
    console.log('   ✓ Done\n');

    // Delete stock_issuance_items
    console.log('4. Deleting stock_issuance_items...');
    await pool.request()
      .query(`
        DELETE FROM stock_issuance_items
      `);
    console.log('   ✓ Done\n');

    // Delete stock_issuance_requests
    console.log('5. Deleting stock_issuance_requests...');
    await pool.request()
      .query(`
        DELETE FROM stock_issuance_requests
      `);
    console.log('   ✓ Done\n');

    // Verify all deleted
    console.log('📊 VERIFICATION:\n');
    
    const requestsCount = await pool.request()
      .query('SELECT COUNT(*) as count FROM stock_issuance_requests');
    console.log(`✓ stock_issuance_requests: ${requestsCount.recordset[0].count}`);

    const itemsCount = await pool.request()
      .query('SELECT COUNT(*) as count FROM stock_issuance_items');
    console.log(`✓ stock_issuance_items: ${itemsCount.recordset[0].count}`);

    const approvalsCount = await pool.request()
      .query('SELECT COUNT(*) as count FROM request_approvals');
    console.log(`✓ request_approvals: ${approvalsCount.recordset[0].count}`);

    const approvalItemsCount = await pool.request()
      .query('SELECT COUNT(*) as count FROM approval_items');
    console.log(`✓ approval_items: ${approvalItemsCount.recordset[0].count}`);

    const historyCount = await pool.request()
      .query('SELECT COUNT(*) as count FROM approval_history');
    console.log(`✓ approval_history: ${historyCount.recordset[0].count}`);

    console.log('\n✅ ALL REQUESTS CLEANED UP! Database is ready for fresh test.\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.close();
  }
}

cleanupAllRequests();
