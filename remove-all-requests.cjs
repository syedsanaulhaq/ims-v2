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

async function removeAllRequests() {
  try {
    await sql.connect(config);

    console.log('🚨 REMOVING ALL REQUESTS - THIS IS DESTRUCTIVE!');

    // Start transaction for safe deletion
    const transaction = new sql.Transaction();
    await transaction.begin();

    try {
      console.log('Starting deletion process...');

      // 1. Delete approval_history first (foreign key constraint)
      const historyDelete = await transaction.request()
        .query('DELETE FROM approval_history');

      console.log('✅ Deleted approval_history records:', historyDelete.rowsAffected[0]);

      // 2. Delete approval_items
      const itemsDelete = await transaction.request()
        .query('DELETE FROM approval_items');

      console.log('✅ Deleted approval_items records:', itemsDelete.rowsAffected[0]);

      // 3. Delete request_approvals
      const approvalDelete = await transaction.request()
        .query('DELETE FROM request_approvals');

      console.log('✅ Deleted request_approvals records:', approvalDelete.rowsAffected[0]);

      // 4. Delete stock_issuance_items
      const stockItemsDelete = await transaction.request()
        .query('DELETE FROM stock_issuance_items');

      console.log('✅ Deleted stock_issuance_items records:', stockItemsDelete.rowsAffected[0]);

      // 5. Delete stock_issuance_requests
      const requestDelete = await transaction.request()
        .query('DELETE FROM stock_issuance_requests');

      console.log('✅ Deleted stock_issuance_requests records:', requestDelete.rowsAffected[0]);

      // Commit transaction
      await transaction.commit();

      console.log('🎉 Successfully removed ALL requests from the database!');

    } catch (error) {
      await transaction.rollback();
      console.error('❌ Transaction rolled back due to error:', error);
      throw error;
    }

  } catch (err) {
    console.error('❌ Error removing requests:', err);
  } finally {
    await sql.close();
  }
}

removeAllRequests();