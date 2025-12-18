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
    console.log('✅ Connected to database\n');

    // 1. Check wings table
    console.log('=== WINGS TABLE ===');
    const wingsResult = await pool.request().query(`SELECT * FROM wings`);
    console.log(`Found ${wingsResult.recordset.length} wing(s)`);
    wingsResult.recordset.forEach((w, i) => {
      console.log(`  ${i + 1}. ID: ${w.id}, Name: ${Object.values(w).join(' | ')}`);
    });

    // 2. Check if verification requests table exists and has data
    console.log('\n=== VERIFICATION REQUESTS TABLE ===');
    try {
      const verResult = await pool.request().query(`
        SELECT COUNT(*) as total FROM inventory_verification_requests
      `);
      console.log(`Total records: ${verResult.recordset[0].total}`);
      
      if (verResult.recordset[0].total > 0) {
        const samples = await pool.request().query(`
          SELECT TOP 5 id, item_nomenclature, wing_id, wing_name, verification_status, created_at 
          FROM inventory_verification_requests
          ORDER BY created_at DESC
        `);
        console.log(`\nSample verification requests:`);
        samples.recordset.forEach((v, i) => {
          console.log(`  ${i + 1}. Item: ${v.item_nomenclature}, Wing ID: ${v.wing_id}, Status: ${v.verification_status}`);
        });
      }
    } catch (e) {
      console.log(`❌ Error querying verification table: ${e.message}`);
    }

    // 2.5 Check approval history for specific request
    console.log('\n=== APPROVAL HISTORY FOR REQUEST 3F3D696D-3FDD-413D-BBE4-B7C46690F125 ===');
    try {
      // First check if table exists and its structure
      const tableCheck = await pool.request().query(`
        SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'approval_history'
      `);
      if (tableCheck.recordset.length === 0) {
        console.log('❌ approval_history table does not exist');
      } else {
        console.log('✅ approval_history table exists');
        
        // Check total records
        const countResult = await pool.request().query(`SELECT COUNT(*) as total FROM approval_history`);
        console.log(`Total approval history records: ${countResult.recordset[0].total}`);
        
        // Show some sample records
        if (countResult.recordset[0].total > 0) {
          const sampleResult = await pool.request().query(`
            SELECT TOP 3 ah.request_approval_id, ah.action_type, ah.action_date, ah.comments
            FROM approval_history ah
            ORDER BY ah.action_date DESC
          `);
          console.log('Sample approval history records:');
          sampleResult.recordset.forEach((h, i) => {
            console.log(`  ${i + 1}. Request: ${h.request_approval_id}, Action: ${h.action_type}, Date: ${h.action_date}, Comments: ${h.comments || 'N/A'}`);
          });
        }
        
        // Check if request exists in stock_issuance_requests
        const stockRequestCheck = await pool.request().query(`
          SELECT * FROM stock_issuance_requests WHERE id = '3F3D696D-3FDD-413D-BBE4-B7C46690F125'
        `);
        console.log(`Request exists in stock_issuance_requests with that ID: ${stockRequestCheck.recordset.length > 0}`);
        if (stockRequestCheck.recordset.length > 0) {
          console.log(`Stock issuance request details:`, stockRequestCheck.recordset[0]);
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
        console.log(`\nFound ${historyResult.recordset.length} approval history entries for this request:`);
        historyResult.recordset.forEach((h, i) => {
          console.log(`  ${i + 1}. ID: ${h.id}, Action: ${h.action}, Date: ${h.action_date}, Action By: ${h.action_by}, Approver: ${h.approver_name || 'NULL'}, Level: ${h.level}, Comments: ${h.comments || 'N/A'}`);
        });
      }
    } catch (e) {
      console.log(`❌ Error querying approval history: ${e.message}`);
    }

    // 3. Check user and their roles
    console.log('\n=== USER 3730207514595 ROLES ===');
    const userCheck = await pool.request().query(`
      SELECT Id, UserName, FullName FROM AspNetUsers WHERE UserName = '3730207514595'
    `);
    
    if (userCheck.recordset.length === 0) {
      console.log('❌ User not found!');
    } else {
      const user = userCheck.recordset[0];
      console.log(`User found: ${user.FullName} (${user.UserName})`);
      
      const rolesResult = await pool.request().query(`
        SELECT DISTINCT r.role_name, ur.scope_wing_id
        FROM ims_user_roles ur
        JOIN ims_roles r ON ur.role_id = r.id
        WHERE ur.user_id = '${user.Id}'
      `);
      
      if (rolesResult.recordset.length === 0) {
        console.log('❌ NO ROLES ASSIGNED!');
      } else {
        console.log(`Assigned roles:`);
        rolesResult.recordset.forEach((r, i) => {
          console.log(`  ${i + 1}. ${r.role_name}, Wing: ${r.scope_wing_id || 'NULL'}`);
        });
      }
    }

    // 4. Summary
    console.log('\n=== SUMMARY ===');
    if (wingsResult.recordset.length === 0) {
      console.log('⚠️  NO WINGS FOUND - This is required for wing-based filtering!');
      console.log('    You need to set up wings in the wings table first.');
    }

    await pool.close();

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkSetup();
