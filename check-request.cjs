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
      console.log('❌ Request not found with ID like %987358A8%');
      return;
    }
    
    const req = result.recordset[0];
    console.log('✅ Found request:', req.request_number, 'Status:', req.approval_status);
    console.log('   Request ID:', req.id);
    
    // Get items in this request
    const itemsResult = await pool.request().query(`
      SELECT id, nomenclature, requested_quantity, approved_quantity
      FROM stock_issuance_items
      WHERE request_id = '${req.id}'
    `);
    
    console.log('\n📦 Items in request:');
    itemsResult.recordset.forEach((item, idx) => {
      console.log(`  ${idx + 1}. ${item.nomenclature}: requested=${item.requested_quantity}, approved=${item.approved_quantity}`);
    });
    
    // Check for approval_items table that tracks per-item decisions
    const approvalResult = await pool.request().query(`
      SELECT TOP 10 *
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME LIKE '%approval%'
    `);
    
    if (approvalResult.recordset.length > 0) {
      console.log('\n📋 Approval tables found:');
      approvalResult.recordset.forEach(t => {
        console.log(`  - ${t.TABLE_NAME}`);
      });
      
      // Check for approval items - first let's see what columns exist
      try {
        const colsResult = await pool.request().query(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_NAME = 'approval_items'
        `);
        
        console.log('\n📌 Approval_items columns:', colsResult.recordset.map(c => c.COLUMN_NAME).join(', '));
        
        // Now check actual approval items
        const approvalItemsResult = await pool.request().query(`
          SELECT TOP 5 *
          FROM approval_items
        `);
        
        console.log('\n✅ Sample approval items (first 5):');
        if (approvalItemsResult.recordset.length === 0) {
          console.log('  (none found)');
        } else {
          approvalItemsResult.recordset.forEach((item, idx) => {
            console.log(`  ${idx + 1}. Decision: ${item.decision_type || 'N/A'}, Reason: ${item.rejection_reason || 'N/A'}`);
          });
        }
      } catch (err) {
        console.log('  Error:', err.message);
      }
    }
    
    // Check request_approvals table to find this request's approval record
    try {
      console.log('\n📋 Checking request_approvals table:');
      const raResult = await pool.request().query(`
        SELECT TOP 10 id, request_id, current_status, submitted_date 
        FROM request_approvals
        WHERE request_id = '${req.id}'
      `);
      
      if (raResult.recordset.length === 0) {
        console.log('  No approval records found for this request');
      } else {
        console.log(`  Found ${raResult.recordset.length} approval record(s):`);
        raResult.recordset.forEach((app, idx) => {
          console.log(`    ${idx + 1}. Approval ID: ${app.id}, Status: ${app.current_status}`);
        });
      }
    } catch (err) {
      console.log('  Error checking request_approvals:', err.message);
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.close();
  }
}

checkRequest();
