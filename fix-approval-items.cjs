const sql = require('mssql');
require('dotenv').config({ path: '.env.sqlserver' });

const config = {
  user: process.env.SQL_SERVER_USER,
  password: process.env.SQL_SERVER_PASSWORD,
  database: process.env.SQL_SERVER_DATABASE,
  server: process.env.SQL_SERVER_HOST,
  pool: { max: 10 },
  options: { encrypt: false, trustServerCertificate: true }
};

async function fixApprovalItems() {
  const pool = new sql.ConnectionPool(config);
  try {
    await pool.connect();
    const requestId = 'FB1A19AD-FB56-4304-A98F-8484089C4899';

    console.log('\n🔧 FIXING APPROVAL ITEMS');
    console.log('='.repeat(60));

    // Get the approval ID
    const approvalResult = await pool.request()
      .input('requestId', sql.UniqueIdentifier, requestId)
      .query(`
        SELECT id FROM request_approvals WHERE request_id = @requestId
      `);

    if (approvalResult.recordset.length === 0) {
      console.log('❌ Approval not found');
      return;
    }

    const approvalId = approvalResult.recordset[0].id;

    // Check current approval items
    console.log('\n📋 Current Approval Items:');
    const checkResult = await pool.request()
      .input('approvalId', sql.UniqueIdentifier, approvalId)
      .query(`
        SELECT id, nomenclature, decision_type FROM approval_items
        WHERE request_approval_id = @approvalId
        ORDER BY nomenclature
      `);

    checkResult.recordset.forEach((item, i) => {
      console.log(`   ${i + 1}. ${item.nomenclature} - decision_type: ${item.decision_type || 'NULL'}`);
    });

    // Update all approval_items to have NULL decision_type
    console.log('\n🔄 Setting decision_type to NULL for all items...');
    const updateResult = await pool.request()
      .input('approvalId', sql.UniqueIdentifier, approvalId)
      .query(`
        UPDATE approval_items
        SET decision_type = NULL, updated_at = GETDATE()
        WHERE request_approval_id = @approvalId;
        SELECT @@ROWCOUNT as rows_updated;
      `);

    console.log('   ✅ Rows updated: ' + updateResult.recordset[0].rows_updated);

    // Verify
    console.log('\n✅ After Update:');
    const verifyResult = await pool.request()
      .input('approvalId', sql.UniqueIdentifier, approvalId)
      .query(`
        SELECT nomenclature, decision_type FROM approval_items
        WHERE request_approval_id = @approvalId
        ORDER BY nomenclature
      `);

    verifyResult.recordset.forEach((item, i) => {
      console.log(`   ${i + 1}. ${item.nomenclature} - decision_type: ${item.decision_type || 'NULL (PENDING)'}`);
    });

    console.log('\n' + '='.repeat(60));

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.close();
  }
}

fixApprovalItems();
