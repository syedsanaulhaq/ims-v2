const sql = require('mssql');

const config = {
  user: 'inventorymanagementuser',
  password: '2016Wfp61@',
  server: 'SYED-FAZLI-LAPT',
  database: 'InventoryManagementDB',
  authentication: { type: 'default' },
  options: { encrypt: false, trustServerCertificate: true }
};

(async () => {
  try {
    const pool = new sql.ConnectionPool(config);
    await pool.connect();

    // Check workflow_approvers
    console.log('=== Checking Workflow Approvers ===\n');
    
    const workflowId = 'D806EC95-FB78-4187-8FC2-87B897C124A4'; // Stock Issuance Approval workflow
    
    const approversQuery = `
      SELECT 
        wa.id,
        wa.user_id,
        u.FullName as approver_name,
        u.Email,
        wa.can_approve,
        wa.added_date
      FROM workflow_approvers wa
      LEFT JOIN AspNetUsers u ON u.Id = wa.user_id
      WHERE wa.workflow_id = @workflowId
    `;

    const result = await pool.request()
      .input('workflowId', sql.UniqueIdentifier, workflowId)
      .query(approversQuery);

    console.log('Workflow Approvers for Stock Issuance Workflow:');
    console.log(JSON.stringify(result.recordset, null, 2));

    // Also check wing-specific approvers
    console.log('\n\n=== Checking Wing Supervisor Setup ===\n');
    
    const wingQuery = `
      SELECT 
        Id,
        Name,
        HeadWingID,
        u.FullName as head_name,
        u.Email as head_email
      FROM WingsInformation w
      LEFT JOIN AspNetUsers u ON u.Id = w.HeadWingID
      WHERE Id = 19  -- Project Management Unit
    `;

    const wingResult = await pool.request().query(wingQuery);
    console.log('Wing 19 (Project Management Unit):');
    console.log(JSON.stringify(wingResult.recordset, null, 2));

    pool.close();
  } catch (error) {
    console.error('Error:', error.message);
  }
})();
