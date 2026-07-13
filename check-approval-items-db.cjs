const sql = require('mssql');

const config = {
  server: '192.168.70.6',
  database: 'InventoryManagementDB',
  authentication: {
    type: 'default',
    options: {
      userName: 'sa',
      password: 'syed@123'
    }
  },
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableKeepAlive: true,
  }
};

async function checkApprovalItems() {
  const pool = new sql.ConnectionPool(config);
  
  try {
    await pool.connect();
    // Check the specific request from the screenshot
    const requestId = '0DC79EAB-02F8-41AA-BF10-F1944567070A';
    
    // Get approval record
    const approvalCheck = await pool.request()
      .input('requestId', sql.UniqueIdentifier, requestId)
      .query(`
        SELECT id, request_id, current_approver_id
        FROM request_approvals
        WHERE request_id = @requestId
      `);

    if (approvalCheck.recordset.length === 0) {
      return;
    }

    const approval = approvalCheck.recordset[0];
    // Check items in stock_issuance_items
    const stockItems = await pool.request()
      .input('requestId', sql.UniqueIdentifier, requestId)
      .query(`
        SELECT id, nomenclature, requested_quantity
        FROM stock_issuance_items
        WHERE request_id = @requestId
      `);

    stockItems.recordset.forEach((item, i) => {
      });
    // Check items in approval_items
    const approvalItems = await pool.request()
      .input('approvalId', sql.UniqueIdentifier, approval.id)
      .query(`
        SELECT id, nomenclature, requested_quantity, decision_type
        FROM approval_items
        WHERE request_approval_id = @approvalId
      `);

    if (approvalItems.recordset.length > 0) {
      approvalItems.recordset.forEach((item, i) => {
        });
    } else {
      }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.close();
  }
}

checkApprovalItems();
