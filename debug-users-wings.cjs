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

async function checkUsersAndWings() {
  const pool = new sql.ConnectionPool(config);
  
  try {
    await pool.connect();
    console.log('✅ Connected to database\n');
    
    // Check both users and their wings
    console.log('1️⃣  Users and their wings:');
    const userResult = await pool.request().query(`
      SELECT 
        u.Id,
        u.FullName,
        u.intWingID,
        w.Name as WingName
      FROM AspNetUsers u
      LEFT JOIN WingsInformation w ON w.Id = u.intWingID
      WHERE u.FullName IN ('Asad ur Rehman', 'Muhammad Ehtesham Siddiqui')
    `);
    
    userResult.recordset.forEach(u => {
      console.log(`
  Name: ${u.FullName}
  User ID: ${u.Id}
  Wing ID: ${u.intWingID}
  Wing Name: ${u.WingName}
      `);
    });

    // Check if all organizational requests from wing 19 appear
    console.log('\n2️⃣  All Organizational requests from Wing 19:');
    const reqResult = await pool.request().query(`
      SELECT 
        sir.id,
        sir.request_number,
        sir.request_type,
        sir.requester_user_id,
        u.FullName,
        u.intWingID,
        w.Name as WingName,
        sir.submitted_at
      FROM stock_issuance_requests sir
      LEFT JOIN AspNetUsers u ON u.Id = sir.requester_user_id
      LEFT JOIN WingsInformation w ON w.Id = u.intWingID
      WHERE u.intWingID = 19
      AND sir.request_type = 'Organizational'
      ORDER BY sir.submitted_at DESC
    `);
    
    console.log(`Found ${reqResult.recordset.length} organizational requests from wing 19:`);
    reqResult.recordset.forEach(r => {
      console.log(`
  ID: ${r.id}
  Number: ${r.request_number}
  Requester: ${r.FullName}
  Submitted: ${r.submitted_at}
      `);
    });

    // Specifically check the request in question
    console.log('\n3️⃣  Check specific request 74536345-1888-4524-B422-133B85FC6708:');
    const specificResult = await pool.request().query(`
      SELECT 
        sir.id,
        sir.request_number,
        sir.request_type,
        sir.requester_user_id,
        u.FullName,
        u.intWingID,
        w.Name as WingName
      FROM stock_issuance_requests sir
      LEFT JOIN AspNetUsers u ON u.Id = sir.requester_user_id
      LEFT JOIN WingsInformation w ON w.Id = u.intWingID
      WHERE sir.id = '74536345-1888-4524-B422-133B85FC6708'
    `);
    
    if (specificResult.recordset.length > 0) {
      const r = specificResult.recordset[0];
      console.log(`
  ✅ Request found
  ID: ${r.id}
  Number: ${r.request_number}
  Type: ${r.request_type}
  Requester: ${r.FullName}
  Wing ID: ${r.intWingID}
  Wing: ${r.WingName}
      `);
    } else {
      console.log('  ❌ Request NOT found');
    }
    
    await pool.close();
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

checkUsersAndWings();
