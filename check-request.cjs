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

async function checkRequest() {
  const pool = new sql.ConnectionPool(config);
  try {
    await pool.connect();
    
    // Search for the request
    const result = await pool.request().query(`
      SELECT TOP 1 
        sr.id, sr.request_number, sr.approval_status, sr.created_at
      FROM stock_issuance_requests sr
      WHERE sr.id LIKE '%987358A8%'
    `);
    
    if (result.recordset.length === 0) {
      return;
    }
    
    const req = result.recordset[0];
    // Get items in this request
    const itemsResult = await pool.request().query(`
      SELECT id, nomenclature, requested_quantity, approved_quantity
      FROM stock_issuance_items
      WHERE request_id = '${req.id}'
    `);
    
    itemsResult.recordset.forEach((item, idx) => {
      });
    
    // Check for approval_items table that tracks per-item decisions
    const approvalResult = await pool.request().query(`
      SELECT TOP 10 *
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME LIKE '%approval%'
    `);
    
    if (approvalResult.recordset.length > 0) {
      approvalResult.recordset.forEach(t => {
        });
      
      // Check for approval items - first let's see what columns exist
      try {
        const colsResult = await pool.request().query(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_NAME = 'approval_items'
        `);
        
        // Now check actual approval items
        const approvalItemsResult = await pool.request().query(`
          SELECT TOP 5 *
          FROM approval_items
        `);
        
        if (approvalItemsResult.recordset.length === 0) {
          } else {
          approvalItemsResult.recordset.forEach((item, idx) => {
            });
        }
      } catch (err) {
        }
    }
    
    // Check request_approvals table to find this request's approval record
    try {
      const raResult = await pool.request().query(`
        SELECT TOP 10 id, request_id, current_status, submitted_date 
        FROM request_approvals
        WHERE request_id = '${req.id}'
      `);
      
      if (raResult.recordset.length === 0) {
        } else {
        raResult.recordset.forEach((app, idx) => {
          });
      }
    } catch (err) {
      }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.close();
  }
}

checkRequest();
