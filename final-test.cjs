// Final comprehensive test of all 3 roles with correct user IDs
const BASE = 'http://localhost:3001/api/approvals';

async function fetchJSON(url) {
  const response = await fetch(url, { credentials: 'include' });
  return response.json();
}

async function testRole(name, userId) {
  console.log(`\n=== ${name} (${userId}) ===`);
  const statuses = ['pending', 'approved', 'rejected', 'forwarded', 'returned'];
  
  for (const status of statuses) {
    const data = await fetchJSON(`${BASE}/my-approvals?userId=${userId}&status=${status}`);
    const items = data.data || [];
    console.log(`  ${status}: ${items.length} items`);
    for (const item of items) {
      console.log(`    ${item.request_number} | current_status: ${item.current_status} | approver: ${item.current_approver_name}`);
    }
  }
}

async function testRequester() {
  console.log('\n=== REQUESTER (Sana) - via DB ===');
  const { getPool, sql, initializePool } = require('./server/db/connection.cjs');
  await initializePool();
  const pool = getPool();

  const requests = await pool.request().query(`
    SELECT sir.id, sir.request_number, sir.request_status, sir.approval_status,
           ra.current_status as ra_status, u.FullName as current_approver_name
    FROM stock_issuance_requests sir
    LEFT JOIN request_approvals ra ON ra.request_id = sir.id
    LEFT JOIN AspNetUsers u ON u.Id = ra.current_approver_id
    WHERE sir.requester_user_id = '869DD81B-A782-494D-B8C2-695369B5EBB6'
    AND (sir.is_deleted = 0 OR sir.is_deleted IS NULL)
    ORDER BY sir.created_at DESC
  `);

  for (const r of requests.recordset) {
    console.log(`  ${r.request_number} | sir.approval: ${r.approval_status} | ra.status: ${r.ra_status} | approver: ${r.current_approver_name}`);
    
    // Also test the status endpoint
    const statusResp = await fetchJSON(`${BASE}/request/${r.id}/status`);
    console.log(`    → status endpoint: current_status=${statusResp.current_status}, approver=${statusResp.current_approver_name}`);
  }
}

(async () => {
  // Correct IDs from DB
  const maqsoodId = '3ff04743-1c84-4502-8a8c-4f1064300d05';  // Admin
  const ehteshamId = '4dae06b7-17cd-480b-81eb-da9c76ad5728';  // Supervisor

  await testRole('ADMIN (Maqsood)', maqsoodId);
  await testRole('SUPERVISOR (Ehtesham)', ehteshamId);
  await testRequester();
  
  console.log('\n=== SUMMARY ===');
  console.log('Expected:');
  console.log('  Admin: Pending=2 (forwarded requests), Approved=1, Forwarded=0');
  console.log('  Supervisor: Pending=3, Forwarded=2 (not 3 due to ISS-7285 being in approved), Approved=1');
  console.log('  Requester (Sana): 2 forwarded_to_admin, 1 pending, 1 completed/issued');
  
  process.exit();
})();
