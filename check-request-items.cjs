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

async function checkItems() {
  const pool = new sql.ConnectionPool(config);
  try {
    await pool.connect();
    const requestId = '0DC79EAB-02F8-41AA-BF10-F1944567070A';

    const items = await pool.request()
      .input('requestId', sql.UniqueIdentifier, requestId)
      .query(`
        SELECT 
          id as ItemId,
          nomenclature,
          requested_quantity,
          created_at
        FROM stock_issuance_items
        WHERE request_id = @requestId
      `);

    items.recordset.forEach(item => {
      });

    if (items.recordset.length === 0) {
      } else {
      const approvalItems = await pool.request()
        .input('requestId', sql.UniqueIdentifier, requestId)
        .query(`
          SELECT 
            ai.id,
            ai.nomenclature,
            ai.decision_type,
            ai.request_approval_id
          FROM approval_items ai
          WHERE ai.request_approval_id IN (
            SELECT id FROM request_approvals WHERE request_id = @requestId
          )
        `);

      if (approvalItems.recordset.length === 0) {
        }
    }

    await pool.close();
  } catch (error) {
    console.error('✗ Error:', error.message);
  }
}

checkItems();
