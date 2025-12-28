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

async function checkRequestAssignment() {
  const pool = new sql.ConnectionPool(config);
  try {
    await pool.connect();

    const requestId = 'FB1A19AD-FB56-4304-A98F-8484089C4899';

    console.log('\n🔍 CHECKING REQUEST ASSIGNMENT');
    console.log('='.repeat(60));

    // Get the request approval details
    const result = await pool.request()
      .input('requestId', sql.VarChar, requestId)
      .query(`
        SELECT TOP 1
          ra.id as approval_id,
          ra.current_approver_id,
          ra.current_status,
          au.UserName,
          au.Email
        FROM request_approvals ra
        LEFT JOIN AspNetUsers au ON au.Id = ra.current_approver_id
        WHERE ra.request_id = @requestId
      `);

    if (result.recordset.length === 0) {
      console.log('❌ No approval found for this request');
      await pool.close();
      return;
    }

    const approval = result.recordset[0];
    console.log(`\nRequest ID: ${requestId}`);
    console.log(`Approval ID: ${approval.approval_id}`);
    console.log(`Current Approver ID: ${approval.current_approver_id}`);
    console.log(`Current Approver: ${approval.UserName} (${approval.Email})`);
    console.log(`Status: ${approval.current_status}`);

    // Get the supervisor details
    const supervisorId = '4dae06b7-17cd-480b-81eb-da9c76ad5728';
    const supervisorResult = await pool.request()
      .input('userId', sql.VarChar, supervisorId)
      .query(`SELECT UserName, Email FROM AspNetUsers WHERE Id = @userId`);

    if (supervisorResult.recordset.length > 0) {
      const supervisor = supervisorResult.recordset[0];
      console.log(`\nExpected Supervisor: ${supervisor.UserName} (${supervisor.Email})`);
      console.log(`Supervisor ID: ${supervisorId}`);
    }

    // Get all items and their decisions
    const itemsResult = await pool.request()
      .input('requestId', sql.VarChar, requestId)
      .query(`
        SELECT 
          ai.nomenclature,
          ai.decision_type
        FROM approval_items ai
        INNER JOIN request_approvals ra ON ra.id = ai.request_approval_id
        WHERE ra.request_id = @requestId
        ORDER BY ai.nomenclature
      `);

    console.log(`\nItems in request:`);
    itemsResult.recordset.forEach(item => {
      console.log(`  - ${item.nomenclature}: ${item.decision_type || 'NULL (pending)'}`);
    });

    await pool.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.close();
    process.exit(1);
  }
}

checkRequestAssignment();
