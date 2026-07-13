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

async function checkRequest() {
  const pool = new sql.ConnectionPool(config);
  try {
    await pool.connect();
    const requestId = 'FB1A19AD-FB56-4304-A98F-8484089C4899';

    // 1. Check if request exists
    const reqResult = await pool.request()
      .input('requestId', sql.UniqueIdentifier, requestId)
      .query(`
        SELECT id, requester_user_id, request_type, justification, purpose, created_at, submitted_at
        FROM stock_issuance_requests
        WHERE id = @requestId
      `);

    if (reqResult.recordset.length === 0) {
      return;
    }

    const request = reqResult.recordset[0];
    // 2. Check items
    const itemsResult = await pool.request()
      .input('requestId', sql.UniqueIdentifier, requestId)
      .query(`
        SELECT id, nomenclature, requested_quantity, decision_type, item_type
        FROM stock_issuance_items
        WHERE request_id = @requestId
      `);

    if (itemsResult.recordset.length === 0) {
      } else {
      itemsResult.recordset.forEach((item, i) => {
        });
    }

    // 3. Check approvals
    const approvalsResult = await pool.request()
      .input('requestId', sql.UniqueIdentifier, requestId)
      .query(`
        SELECT ra.id, ra.current_approver_id, ra.current_status, ra.submitted_date
        FROM request_approvals ra
        WHERE ra.request_id = @requestId
      `);

    if (approvalsResult.recordset.length === 0) {
      } else {
      approvalsResult.recordset.forEach(app => {
        });
    }

    // 4. Test the API query
    const apiTestResult = await pool.request()
      .input('userId', sql.NVarChar(450), '869dd81b-a782-494d-b8c2-695369b5ebb6')
      .query(`
        SELECT DISTINCT
          ra.id,
          ra.request_id,
          ra.request_type,
          ra.current_status,
          ra.submitted_date
        FROM request_approvals ra
        WHERE ra.current_approver_id = @userId
        AND ra.request_id IN (
          SELECT DISTINCT request_id FROM stock_issuance_items
          WHERE decision_type IS NULL OR decision_type = ''
        )
        ORDER BY ra.submitted_date DESC
      `);

    if (apiTestResult.recordset.length === 0) {
      }

    } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.close();
  }
}

checkRequest();
