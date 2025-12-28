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

async function diagnose() {
  const pool = new sql.ConnectionPool(config);
  try {
    await pool.connect();

    const requestId = 'FB1A19AD-FB56-4304-A98F-8484089C4899';

    console.log('\n📋 DIAGNOSTIC CHECK');
    console.log('='.repeat(60));

    // Check approval and its items
    const approvalResult = await pool.request()
      .input('requestId', sql.VarChar, requestId)
      .query(`
        SELECT TOP 1
          ra.id,
          ra.request_id,
          ra.current_approver_id,
          ra.current_status,
          au.UserName,
          au.Email,
          au.FullName
        FROM request_approvals ra
        LEFT JOIN AspNetUsers au ON au.Id = ra.current_approver_id
        WHERE ra.request_id = @requestId
      `);

    if (approvalResult.recordset.length === 0) {
      console.log('❌ NO APPROVAL FOUND');
      return;
    }

    const approval = approvalResult.recordset[0];
    console.log(`\n✅ APPROVAL FOUND:`);
    console.log(`   Approval ID: ${approval.id}`);
    console.log(`   Request ID: ${approval.request_id}`);
    console.log(`   Current Approver ID: ${approval.current_approver_id}`);
    console.log(`   Current Approver: ${approval.FullName} (${approval.Email})`);
    console.log(`   Status: ${approval.current_status}`);

    // Check approval items
    const itemsResult = await pool.request()
      .input('approvalId', sql.VarChar, approval.id)
      .query(`
        SELECT 
          id,
          nomenclature,
          decision_type
        FROM approval_items
        WHERE request_approval_id = @approvalId
        ORDER BY nomenclature
      `);

    console.log(`\n✅ APPROVAL ITEMS (${itemsResult.recordset.length} found):`);
    itemsResult.recordset.forEach((item) => {
      console.log(`   - ${item.nomenclature}: ${item.decision_type || 'NULL'}`);
    });

    // Check what the dashboard query would return
    console.log(`\n📊 DASHBOARD COUNTS FOR THIS APPROVER:`);
    const countResult = await pool.request()
      .input('userId', sql.NVarChar(450), approval.current_approver_id)
      .query(`
        SELECT
          (SELECT COUNT(DISTINCT ra.id) FROM request_approvals ra
           INNER JOIN approval_items ai ON ai.request_approval_id = ra.id
           WHERE ra.current_approver_id = @userId
           AND (ai.decision_type IS NULL OR ai.decision_type = '')) as pending_count,
          (SELECT COUNT(DISTINCT ra.id) FROM request_approvals ra
           INNER JOIN approval_items ai ON ai.request_approval_id = ra.id
           WHERE ra.current_approver_id = @userId
           AND ai.decision_type IN ('APPROVE_FROM_STOCK', 'APPROVE_FOR_PROCUREMENT')) as approved_count,
          (SELECT COUNT(DISTINCT ra.id) FROM request_approvals ra
           INNER JOIN approval_items ai ON ai.request_approval_id = ra.id
           WHERE ra.current_approver_id = @userId
           AND ai.decision_type = 'REJECT') as rejected_count,
          (SELECT COUNT(DISTINCT ra.id) FROM request_approvals ra
           INNER JOIN approval_items ai ON ai.request_approval_id = ra.id
           WHERE ra.current_approver_id = @userId
           AND ai.decision_type IN ('FORWARD_TO_SUPERVISOR', 'FORWARD_TO_ADMIN')) as forwarded_count,
          (SELECT COUNT(DISTINCT ra.id) FROM request_approvals ra
           INNER JOIN approval_items ai ON ai.request_approval_id = ra.id
           WHERE ra.current_approver_id = @userId
           AND ai.decision_type = 'RETURN') as returned_count
      `);

    const counts = countResult.recordset[0];
    console.log(`   Pending: ${counts.pending_count}`);
    console.log(`   Approved: ${counts.approved_count}`);
    console.log(`   Rejected: ${counts.rejected_count}`);
    console.log(`   Returned: ${counts.returned_count}`);
    console.log(`   Forwarded: ${counts.forwarded_count}`);

    await pool.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.close();
    process.exit(1);
  }
}

diagnose();
