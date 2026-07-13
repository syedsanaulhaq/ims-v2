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

async function checkSetup() {
  try {
    const pool = new sql.ConnectionPool(config);
    await pool.connect();
    // 1. Check wings table
    const wingsResult = await pool.request().query(`SELECT * FROM wings`);
    wingsResult.recordset.forEach((w, i) => {
      });

    // 2. Check if verification requests table exists and has data
    try {
      const verResult = await pool.request().query(`
        SELECT COUNT(*) as total FROM inventory_verification_requests
      `);
      if (verResult.recordset[0].total > 0) {
        const samples = await pool.request().query(`
          SELECT TOP 5 id, item_nomenclature, wing_id, wing_name, verification_status, created_at 
          FROM inventory_verification_requests
          ORDER BY created_at DESC
        `);
        samples.recordset.forEach((v, i) => {
          });
      }
    } catch (e) {
      }

    // 2.5 Check approval history for specific request
    try {
      // First check if table exists and its structure
      const tableCheck = await pool.request().query(`
        SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'approval_history'
      `);
      if (tableCheck.recordset.length === 0) {
        } else {
        // Check total records
        const countResult = await pool.request().query(`SELECT COUNT(*) as total FROM approval_history`);
        // Show some sample records
        if (countResult.recordset[0].total > 0) {
          const sampleResult = await pool.request().query(`
            SELECT TOP 3 ah.request_approval_id, ah.action_type, ah.action_date, ah.comments
            FROM approval_history ah
            ORDER BY ah.action_date DESC
          `);
          sampleResult.recordset.forEach((h, i) => {
            });
        }
        
        // Check if request exists in stock_issuance_requests
        const stockRequestCheck = await pool.request().query(`
          SELECT * FROM stock_issuance_requests WHERE id = '3F3D696D-3FDD-413D-BBE4-B7C46690F125'
        `);
        if (stockRequestCheck.recordset.length > 0) {
          }
        
        // Now query for specific request
        const historyQuery = `
          SELECT 
            ah.id,
            ah.request_approval_id,
            ah.action_type as action,
            ah.action_date,
            ah.comments,
            ah.step_number as level,
            ah.action_by,
            u.FullName as approver_name
          FROM approval_history ah
          LEFT JOIN AspNetUsers u ON u.Id = ah.action_by
          WHERE ah.request_approval_id IN (
            SELECT id FROM request_approvals WHERE request_id = '3F3D696D-3FDD-413D-BBE4-B7C46690F125'
          )
          ORDER BY ah.action_date DESC;
        `;
        const historyResult = await pool.request().query(historyQuery);
        historyResult.recordset.forEach((h, i) => {
          });
      }
    } catch (e) {
      }

    // 3. Check user and their roles
    const userCheck = await pool.request().query(`
      SELECT Id, UserName, FullName FROM AspNetUsers WHERE UserName = '3730207514595'
    `);
    
    if (userCheck.recordset.length === 0) {
      } else {
      const user = userCheck.recordset[0];
      const rolesResult = await pool.request().query(`
        SELECT DISTINCT r.role_name, ur.scope_wing_id
        FROM ims_user_roles ur
        JOIN ims_roles r ON ur.role_id = r.id
        WHERE ur.user_id = '${user.Id}'
      `);
      
      if (rolesResult.recordset.length === 0) {
        } else {
        rolesResult.recordset.forEach((r, i) => {
          });
      }
    }

    // 4. Summary
    if (wingsResult.recordset.length === 0) {
      }

    await pool.close();

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkSetup();
