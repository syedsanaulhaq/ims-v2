const sql = require('mssql');
require('dotenv').config({ path: '.env.sqlserver' });

const config = {
  server: process.env.SQL_SERVER_HOST,
  authentication: {
    type: 'default',
    options: {
      userName: process.env.SQL_SERVER_USER,
      password: process.env.SQL_SERVER_PASSWORD
    }
  },
  options: {
    database: process.env.SQL_SERVER_DATABASE,
    trustServerCertificate: true,
    encrypt: false,
    connectionTimeout: 30000,
    requestTimeout: 30000
  }
};

async function debugWingRequests() {
  const pool = new sql.ConnectionPool(config);
  
  try {
    await pool.connect();
    console.log('✅ Connected to database');
    
    // Query 1: All stock_issuance_requests
    console.log('\n📋 All Stock Issuance Requests:');
    const reqResult = await pool.request().query(`
      SELECT 
        sir.id,
        sir.request_number,
        sir.request_type,
        sir.requester_user_id,
        sir.requester_wing_id,
        sir.justification,
        sir.submitted_at,
        sir.created_at,
        u.FullName,
        u.intWingID,
        w.Name as WingName
      FROM stock_issuance_requests sir
      LEFT JOIN AspNetUsers u ON u.Id = sir.requester_user_id
      LEFT JOIN WingsInformation w ON w.Id = u.intWingID
      ORDER BY sir.created_at DESC
    `);
    
    console.log(`Found ${reqResult.recordset.length} requests:`);
    reqResult.recordset.forEach(r => {
      console.log(`
  ID: ${r.id}
  Request #: ${r.request_number}
  Type: ${r.request_type}
  User: ${r.FullName} (ID: ${r.requester_user_id})
  Wing: ${r.WingName} (ID: ${r.intWingID})
  Submitted: ${r.submitted_at}
      `);
    });

    // Query 2: Check request_approvals
    console.log('\n📋 Request Approvals:');
    const approvalResult = await pool.request().query(`
      SELECT 
        ra.id,
        ra.request_id,
        ra.request_type,
        ra.current_status,
        ra.submitted_date
      FROM request_approvals ra
      ORDER BY ra.submitted_date DESC
    `);
    
    console.log(`Found ${approvalResult.recordset.length} approval records`);
    approvalResult.recordset.forEach(a => {
      console.log(`  ID: ${a.id}, Request: ${a.request_id}, Status: ${a.current_status}`);
    });

    // Query 3: Check stock_issuance_items
    console.log('\n📋 Stock Issuance Items:');
    const itemResult = await pool.request().query(`
      SELECT 
        sii.id,
        sii.request_id,
        sii.item_master_id,
        sii.requested_quantity
      FROM stock_issuance_items sii
      ORDER BY sii.created_at DESC
    `);
    
    console.log(`Found ${itemResult.recordset.length} items`);
    
    await pool.close();
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

debugWingRequests();
