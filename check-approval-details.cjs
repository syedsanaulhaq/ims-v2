const sql = require('mssql');

const config = {
  user: 'inventorymanagementuser',
  password: '2016Wfp61@',
  server: 'SYED-FAZLI-LAPT',
  database: 'InventoryManagementDB',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    connectionTimeout: 5000
  }
};

async function checkApproval() {
  const pool = new sql.ConnectionPool(config);
  try {
    await pool.connect();
    
    // Get the approval record details
    const result = await pool.request().query(`
      SELECT *
      FROM request_approvals
      WHERE id = '8F8D4879-A428-408B-B417-413B111A025E'
    `);
    
    if (result.recordset.length === 0) {
      return;
    }
    
    const app = result.recordset[0];
    // Check all columns
    Object.keys(app).forEach(key => {
      if (app[key] !== null) {
        }
    });
    
    // Check if there are any approval_items for this approval
    const itemsResult = await pool.request().query(`
      SELECT *
      FROM approval_items
      WHERE request_approval_id = '${app.id}'
    `);
    
    if (itemsResult.recordset.length === 0) {
      } else {
      itemsResult.recordset.forEach((item, idx) => {
        });
    }
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.close();
  }
}

checkApproval();
