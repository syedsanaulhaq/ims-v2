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

async function checkCurrentUserSupervisor() {
  const pool = new sql.ConnectionPool(config);
  try {
    await pool.connect();
    // Check latest request created and who created it
    const latestRequest = await pool.request().query(`
      SELECT TOP 1
        sir.id as RequestId,
        sir.requester_user_id as RequesterUserId,
        u.FullName as RequesterName,
        sir.submitted_at,
        ra.current_approver_id as AssignedApproverId,
        approver.FullName as AssignedApproverName
      FROM stock_issuance_requests sir
      LEFT JOIN AspNetUsers u ON sir.requester_user_id = u.Id
      LEFT JOIN request_approvals ra ON ra.request_id = sir.id
      LEFT JOIN AspNetUsers approver ON ra.current_approver_id = approver.Id
      ORDER BY sir.submitted_at DESC
    `);

    if (latestRequest.recordset.length > 0) {
      const req = latestRequest.recordset[0];
      // Now check the supervisor of this requester
      if (req.RequesterUserId) {
        const supervisorCheck = await pool.request()
          .input('userId', sql.NVarChar, req.RequesterUserId)
          .query(`
            SELECT 
              emp.FullName as EmployeeName,
              boss.FullName as SupervisorName,
              boss.Id as SupervisorId
            FROM vw_AspNetUser_with_Reg_App_DEC_ID emp
            LEFT JOIN LEAVE_APPROVAL_HIERARCHY hierarchy ON emp.EmployeeID = hierarchy.EmployeeID
            LEFT JOIN vw_AspNetUser_with_Reg_App_DEC_ID boss ON hierarchy.BossID = boss.EmployeeID
            WHERE emp.Id = @userId
          `);

        if (supervisorCheck.recordset.length > 0) {
          const sup = supervisorCheck.recordset[0];
          if (sup.SupervisorId) {
            } else {
            }
        }
      }
    } else {
      }

    await pool.close();
  } catch (error) {
    console.error('✗ Error:', error.message);
  }
}

checkCurrentUserSupervisor();
