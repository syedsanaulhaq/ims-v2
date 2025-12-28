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

async function checkWorkflows() {
  const pool = new sql.ConnectionPool(config);
  try {
    await pool.connect();
    
    const result = await pool.request().query(`
      SELECT * FROM approval_workflows
    `);
    
    console.log('📋 Approval workflows:');
    result.recordset.forEach(w => {
      console.log(`   ID: ${w.id}`);
      console.log(`   Name: ${w.name}`);
      console.log(`   Type: ${w.request_type}`);
      console.log('   ---');
    });
    
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.close();
  }
}

checkWorkflows();
