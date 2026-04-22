const { getPool, sql, initializePool } = require('./server/db/connection.cjs');
const http = require('http');

(async () => {
  const maqsoodId = '3ff04743-1c84-4502-8a8c-4f1064300d05';  // Admin
  const ehteshamId = '4dae06b7-17cd-480b-81eb-da9c76ad5728';  // Supervisor (corrected from DB)
  const sanaId = '869dd81b-d8ac-4e76-93e7-e4878e109fae';      // Requester

  console.log('=== ADMIN (Maqsood) Dashboard ===');
  for (const status of ['pending', 'forwarded', 'approved', 'rejected', 'returned']) {
    const url = `http://localhost:3001/api/approvals/my-approvals?userId=${maqsoodId}&status=${status}`;
    try {
      const response = await fetch(url);
      const data = await response.json();
      const items = data.data || [];
      console.log(`  ${status}: ${items.length} items`);
      for (const item of items) {
        console.log(`    ${item.request_number} | current_status: ${item.current_status}`);
      }
    } catch (e) {
      console.error(`  Error for ${status}:`, e.message);
    }
  }
  
  console.log('\n=== SUPERVISOR (Ehtesham) Dashboard ===');
  for (const status of ['pending', 'forwarded', 'approved', 'rejected', 'returned']) {
    const url = `http://localhost:3001/api/approvals/my-approvals?userId=${ehteshamId}&status=${status}`;
    try {
      const response = await fetch(url);
      const data = await response.json();
      const items = data.data || [];
      console.log(`  ${status}: ${items.length} items`);
      for (const item of items) {
        console.log(`    ${item.request_number} | current_status: ${item.current_status}`);
      }
    } catch (e) {
      console.error(`  Error for ${status}:`, e.message);
    }
  }
  
  console.log('\n=== REQUESTER (Sana) - Request Status ===');
  
  const { getPool, sql, initializePool } = require('./server/db/connection.cjs');
  await initializePool();
  const pool = getPool();

  // First find Sana's actual user ID
  const sanaUser = await pool.request().query(`
    SELECT TOP 1 sir.requester_user_id, u.FullName
    FROM stock_issuance_requests sir
    LEFT JOIN AspNetUsers u ON u.Id = sir.requester_user_id
    WHERE sir.request_number = 'ISS-20260417-9441'
  `);
  const actualSanaId = sanaUser.recordset[0]?.requester_user_id;
  console.log('  Sana user ID:', actualSanaId, '- Name:', sanaUser.recordset[0]?.FullName);
  
  const requests = await pool.request()
    .input('userId', sql.NVarChar, actualSanaId || sanaId)
    .query(`
      SELECT sir.id, sir.request_number, sir.request_status, sir.approval_status,
             ra.current_status as ra_status, ra.current_approver_id,
             u.FullName as current_approver_name
      FROM stock_issuance_requests sir
      LEFT JOIN request_approvals ra ON ra.request_id = sir.id
      LEFT JOIN AspNetUsers u ON u.Id = ra.current_approver_id
      WHERE sir.requester_user_id = @userId
      AND (sir.is_deleted = 0 OR sir.is_deleted IS NULL)
      ORDER BY sir.created_at DESC
    `);
  
  for (const r of requests.recordset) {
    console.log(`  ${r.request_number} | sir.status: ${r.request_status} | sir.approval: ${r.approval_status} | ra.status: ${r.ra_status} | approver: ${r.current_approver_name}`);
  }

  // Check why Ehtesham sees 0 pending
  console.log('\n=== DEBUG: All request_approvals for Ehtesham ===');
  const ehteshamApprovals = await pool.request()
    .input('eid', sql.NVarChar, ehteshamId)
    .query(`
      SELECT ra.id, ra.request_id, ra.current_status, ra.current_approver_id, sir.request_number,
             (CASE WHEN ra.current_approver_id = @eid THEN 'YES' ELSE 'NO' END) as is_my_approval
      FROM request_approvals ra
      INNER JOIN stock_issuance_requests sir ON sir.id = ra.request_id
      WHERE (sir.is_deleted = 0 OR sir.is_deleted IS NULL)
      ORDER BY ra.submitted_date DESC
    `);
  for (const r of ehteshamApprovals.recordset) {
    console.log(`  ${r.request_number} | status: ${r.current_status} | approver: ${r.current_approver_id} | mine: ${r.is_my_approval}`);
  }

  // Check approval_history for forwarded items
  console.log('\n=== DEBUG: approval_history entries ===');
  const history = await pool.request().query(`
    SELECT ah.request_approval_id, ah.action_type, ah.action_by, ah.forwarded_to, 
           u.FullName as action_by_name, sir.request_number
    FROM approval_history ah
    INNER JOIN request_approvals ra ON ra.id = ah.request_approval_id
    INNER JOIN stock_issuance_requests sir ON sir.id = ra.request_id
    LEFT JOIN AspNetUsers u ON u.Id = ah.action_by
    ORDER BY ah.step_number DESC
  `);
  for (const r of history.recordset) {
    console.log(`  ${r.request_number} | action: ${r.action_type} | by: ${r.action_by_name} | forwarded_to: ${r.forwarded_to}`);
  }
  
  process.exit();
})();