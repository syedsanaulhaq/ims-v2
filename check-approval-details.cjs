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
      console.log('❌ Approval not found');
      return;
    }
    
    const app = result.recordset[0];
    console.log('✅ Found approval:');
    console.log('   ID:', app.id);
    console.log('   Status:', app.current_status);
    console.log('   Created:', app.created_date);
    console.log('   Updated:', app.updated_date);
    
    // Check all columns
    console.log('\n📋 All columns in this approval:');
    Object.keys(app).forEach(key => {
      if (app[key] !== null) {
        console.log(`   ${key}: ${app[key]}`);
      }
    });
    
    // Check if there are any approval_items for this approval
    const itemsResult = await pool.request().query(`
      SELECT *
      FROM approval_items
      WHERE request_approval_id = '${app.id}'
    `);
    
    console.log('\n📦 Approval items for this approval:');
    if (itemsResult.recordset.length === 0) {
      console.log('   (none found) - This is the problem!');
    } else {
      itemsResult.recordset.forEach((item, idx) => {
        console.log(`   ${idx + 1}. ${item.nomenclature}: decision=${item.decision_type}, reason=${item.rejection_reason || 'N/A'}`);
      });
    }
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.close();
  }
}

checkApproval();
