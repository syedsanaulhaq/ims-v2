/**
 * COMPLETE CLEANUP: Remove ALL requests and approvals
 * Use with caution - deletes all data!
 */

const sql = require('mssql');

const config = {
  server: 'SYED-FAZLI-LAPT',
  database: 'InventoryManagementDB',
  user: 'inventorymanagementuser',
  password: '2016Wfp61@',
  port: 1433,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true
  },
  requestTimeout: 30000,
  connectionTimeout: 30000
};

const pool = new sql.ConnectionPool(config);

async function cleanup() {
  try {
    console.log('📋 ========================================');
    console.log('🧹 COMPLETE CLEANUP - REMOVE ALL REQUESTS');
    console.log('========================================\n');

    await pool.connect();

    console.log('⚠️  DELETING ALL DATA...\n');

    // Delete in correct order (foreign key dependencies)

    // Step 1: Delete approval_history
    console.log('🗑️  Deleting approval_history...');
    const deleteHistory = await pool.request().query(`
      DELETE FROM approval_history
    `);
    console.log(`   ✅ Deleted ${deleteHistory.rowsAffected[0]} records\n`);

    // Step 2: Delete approval_items
    console.log('🗑️  Deleting approval_items...');
    const deleteApprovalItems = await pool.request().query(`
      DELETE FROM approval_items
    `);
    console.log(`   ✅ Deleted ${deleteApprovalItems.rowsAffected[0]} records\n`);

    // Step 3: Delete request_approvals
    console.log('🗑️  Deleting request_approvals...');
    const deleteApprovals = await pool.request().query(`
      DELETE FROM request_approvals
    `);
    console.log(`   ✅ Deleted ${deleteApprovals.rowsAffected[0]} records\n`);

    // Step 4: Delete stock_issuance_items
    console.log('🗑️  Deleting stock_issuance_items...');
    const deleteItems = await pool.request().query(`
      DELETE FROM stock_issuance_items
    `);
    console.log(`   ✅ Deleted ${deleteItems.rowsAffected[0]} records\n`);

    // Step 5: Delete stock_issuance_requests
    console.log('🗑️  Deleting stock_issuance_requests...');
    const deleteRequests = await pool.request().query(`
      DELETE FROM stock_issuance_requests
    `);
    console.log(`   ✅ Deleted ${deleteRequests.rowsAffected[0]} records\n`);

    // Verify cleanup
    console.log('📋 ========================================');
    console.log('✅ VERIFICATION - Database State After Cleanup');
    console.log('========================================\n');

    const counts = await pool.request().query(`
      SELECT 
        (SELECT COUNT(*) FROM stock_issuance_requests) as requests,
        (SELECT COUNT(*) FROM stock_issuance_items) as items,
        (SELECT COUNT(*) FROM request_approvals) as approvals,
        (SELECT COUNT(*) FROM approval_items) as approval_items,
        (SELECT COUNT(*) FROM approval_history) as history
    `);

    const result = counts.recordset[0];
    console.log(`Requests: ${result.requests}`);
    console.log(`Items: ${result.items}`);
    console.log(`Approvals: ${result.approvals}`);
    console.log(`Approval Items: ${result.approval_items}`);
    console.log(`Approval History: ${result.history}`);
    console.log();

    if (result.requests === 0 && result.approvals === 0) {
      console.log('📋 ========================================');
      console.log('✅ CLEANUP COMPLETE');
      console.log('========================================\n');
      console.log('🎉 Database is now clean and ready!');
      console.log('\nYou can now:');
      console.log('1. Create a fresh request from the UI');
      console.log('2. Use clear-and-create-fresh-test-data.cjs to create test data');
      console.log('3. Start the approval workflow from scratch\n');
    } else {
      console.log('⚠️  Some data still exists - check for locked records\n');
    }

    await pool.close();

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  }
}

cleanup();
