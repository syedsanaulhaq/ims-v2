const sql = require('mssql');
const config = {
  server: process.env.SQL_SERVER_HOST || 'localhost',
  database: process.env.SQL_SERVER_DATABASE || 'InventoryManagementDB',
  user: process.env.SQL_SERVER_USER || 'inventorymanagementuser',
  password: process.env.SQL_SERVER_PASSWORD || '2016Wfp61@',
  port: parseInt(process.env.SQL_SERVER_PORT) || 1433,
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

async function diagnoseDashboard() {
  const pool = new sql.ConnectionPool(config);
  try {
    await pool.connect();
    console.log('✓ Connected to database\n');

    // Ehtisham's ID
    const ehtishamId = '4dae06b7-17cd-480b-81eb-da9c76ad5728';

    console.log('=== CHECKING REQUEST_APPROVALS TABLE ===\n');
    const approvals = await pool.request()
      .input('approverId', sql.NVarChar, ehtishamId)
      .query(`
        SELECT 
          ra.id as ApprovalId,
          ra.request_id as RequestId,
          ra.current_approver_id as AssignedApproverId,
          ra.current_status as ApprovalStatus,
          sir.requester_user_id,
          u.FullName as RequesterName,
          ra.submitted_by
        FROM request_approvals ra
        LEFT JOIN stock_issuance_requests sir ON ra.request_id = sir.id
        LEFT JOIN AspNetUsers u ON sir.requester_user_id = u.Id
        WHERE ra.current_approver_id = @approverId
      `);

    console.log(`Found ${approvals.recordset.length} approval records assigned to Ehtisham:\n`);
    approvals.recordset.forEach(row => {
      console.log(`Approval ID: ${row.ApprovalId}`);
      console.log(`  Request ID: ${row.RequestId}`);
      console.log(`  Requester: ${row.RequesterName}`);
      console.log(`  Approval Status: ${row.ApprovalStatus}`);
      console.log(`  Submitted By: ${row.submitted_by}`);
      console.log('');
    });

    // Now check if approval_items exist
    if (approvals.recordset.length > 0) {
      const firstApprovalId = approvals.recordset[0].ApprovalId;
      console.log('\n=== CHECKING APPROVAL_ITEMS FOR FIRST APPROVAL ===\n');
      const items = await pool.request()
        .input('approvalId', sql.UniqueIdentifier, firstApprovalId)
        .query(`
          SELECT 
            id as ItemId,
            nomenclature,
            decision_type
          FROM approval_items
          WHERE request_approval_id = @approvalId
        `);

      console.log(`Found ${items.recordset.length} items for this approval:\n`);
      items.recordset.forEach(item => {
        console.log(`Item: ${item.nomenclature}`);
        console.log(`  ID: ${item.ItemId}`);
        console.log(`  Decision Type: ${item.decision_type || 'PENDING'}`);
        console.log('');
      });

      if (items.recordset.length === 0) {
        console.log('❌ ERROR: No items found in approval_items table!');
        console.log('This is why the request is not showing in the dashboard.');
      }
    }

    // Check dashboard query logic
    console.log('\n=== TESTING DASHBOARD QUERY ===\n');
    const dashboardResult = await pool.request()
      .input('userId', sql.NVarChar, ehtishamId)
      .query(`
        SELECT
          (SELECT COUNT(DISTINCT ra.id) FROM request_approvals ra
           INNER JOIN approval_items ai ON ai.request_approval_id = ra.id
           WHERE ra.current_approver_id = @userId
           AND ai.decision_type = 'PENDING') as pending_count,
          (SELECT COUNT(DISTINCT ra.id) FROM request_approvals ra
           INNER JOIN approval_items ai ON ai.request_approval_id = ra.id
           WHERE ra.current_approver_id = @userId
           AND ai.decision_type IN ('APPROVE_FROM_STOCK', 'APPROVE_FOR_PROCUREMENT')) as approved_count
      `);

    const counts = dashboardResult.recordset[0];
    console.log(`Dashboard Query Results:`);
    console.log(`  Pending Count: ${counts.pending_count}`);
    console.log(`  Approved Count: ${counts.approved_count}`);

    if (counts.pending_count === 0) {
      console.log('\n⚠️  ISSUE FOUND: Dashboard query returns 0 pending items!');
      console.log('This means either:');
      console.log('  1. No approval_items exist for requests assigned to Ehtisham');
      console.log('  2. Items exist but have NULL/wrong decision_type');
    }

    await pool.close();
  } catch (error) {
    console.error('✗ Error:', error.message);
  }
}

diagnoseDashboard();
