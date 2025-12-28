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

async function checkDashboard() {
  const pool = new sql.ConnectionPool(config);
  try {
    await pool.connect();

    // Muhammad Ehtesham Siddiqui supervisor ID
    const supervisorId = '4dae06b7-17cd-480b-81eb-da9c76ad5728';

    console.log('\n📊 CHECKING DASHBOARD LOGIC');
    console.log('='.repeat(60));
    console.log(`Supervisor ID: ${supervisorId}\n`);

    // Check approval items for this supervisor
    const approvalResult = await pool.request()
      .input('userId', sql.NVarChar(450), supervisorId)
      .query(`
        SELECT DISTINCT 
          ra.id as approval_id,
          ra.current_status,
          ai.nomenclature,
          ai.decision_type
        FROM request_approvals ra
        INNER JOIN approval_items ai ON ai.request_approval_id = ra.id
        WHERE ra.current_approver_id = @userId
        ORDER BY ra.id, ai.nomenclature
      `);

    if (approvalResult.recordset.length === 0) {
      console.log('❌ No approvals found for this supervisor');
      await pool.close();
      return;
    }

    console.log('📋 APPROVALS AND ITEMS:');
    let currentApprovalId = null;
    approvalResult.recordset.forEach((row) => {
      if (currentApprovalId !== row.approval_id) {
        console.log(`\n  Approval: ${row.approval_id}`);
        console.log(`  Status: ${row.current_status}`);
        currentApprovalId = row.approval_id;
      }
      console.log(`    - ${row.nomenclature}: ${row.decision_type || 'NULL (pending)'}`);
    });

    // Now check the dashboard counts
    console.log('\n\n📊 DASHBOARD COUNTS:');
    console.log('='.repeat(60));

    const countQueries = {
      pending: `(ai.decision_type IS NULL OR ai.decision_type = '')`,
      approved: `ai.decision_type IN ('APPROVE_FROM_STOCK', 'APPROVE_FOR_PROCUREMENT')`,
      rejected: `ai.decision_type = 'REJECT'`,
      returned: `ai.decision_type = 'RETURN'`,
      forwarded: `ai.decision_type IN ('FORWARD_TO_SUPERVISOR', 'FORWARD_TO_ADMIN')`
    };

    for (const [status, condition] of Object.entries(countQueries)) {
      const result = await pool.request()
        .input('userId', sql.NVarChar(450), supervisorId)
        .query(`
          SELECT COUNT(DISTINCT ra.id) as count
          FROM request_approvals ra
          INNER JOIN approval_items ai ON ai.request_approval_id = ra.id
          WHERE ra.current_approver_id = @userId
          AND ${condition}
        `);
      
      const count = result.recordset[0]?.count || 0;
      console.log(`  ${status.toUpperCase()}: ${count}`);
    }

    await pool.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.close();
    process.exit(1);
  }
}

checkDashboard();
