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

async function checkSupervisor() {
  const pool = new sql.ConnectionPool(config);
  try {
    await pool.connect();
    console.log('✓ Connected to database\n');

    // Get all users with their supervisors
    const result = await pool.request().query(`
      SELECT 
        emp.Id as UserId,
        emp.FullName as EmployeeName,
        emp.EmployeeID as EmpEmployeeID,
        boss.Id as SupervisorUserId,
        boss.FullName as SupervisorName,
        boss.EmployeeID as SupervisorEmployeeID,
        hierarchy.BossID,
        hierarchy.EmployeeID
      FROM vw_AspNetUser_with_Reg_App_DEC_ID emp
      INNER JOIN LEAVE_APPROVAL_HIERARCHY hierarchy ON emp.EmployeeID = hierarchy.EmployeeID
      INNER JOIN vw_AspNetUser_with_Reg_App_DEC_ID boss ON hierarchy.BossID = boss.EmployeeID
      ORDER BY emp.FullName
    `);

    console.log('=== USER SUPERVISOR HIERARCHY ===\n');
    result.recordset.forEach(row => {
      console.log(`Employee: ${row.EmployeeName} (ID: ${row.UserId})`);
      console.log(`  → Supervisor: ${row.SupervisorName} (ID: ${row.SupervisorUserId})`);
      console.log('');
    });

    // Specifically check for Muhammad Ehtesham Siddiqui
    console.log('\n=== CHECKING FOR EHTISHAM ===\n');
    const ehtishamCheck = await pool.request().query(`
      SELECT 
        Id as UserId,
        FullName as Name,
        Email,
        EmployeeID
      FROM vw_AspNetUser_with_Reg_App_DEC_ID
      WHERE FullName LIKE '%Ehtesham%' OR FullName LIKE '%ehtisham%'
    `);

    if (ehtishamCheck.recordset.length > 0) {
      ehtishamCheck.recordset.forEach(user => {
        console.log(`Found: ${user.Name}`);
        console.log(`  ID: ${user.UserId}`);
        console.log(`  Email: ${user.Email}`);
        console.log(`  EmployeeID: ${user.EmployeeID}\n`);
      });
    } else {
      console.log('❌ Ehtisham not found in users');
    }

    await pool.close();
  } catch (error) {
    console.error('✗ Error:', error.message);
  }
}

checkSupervisor();
