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

    // Find organizational requests with workflow info
    const orgQuery = `
      SELECT TOP 10
        sir.id,
        sir.request_type,
        sir.justification,
        sir.requester_wing_id,
        ra.current_approver_id,
        u_approver.FullName as approver_name,
        u_approver.Email as approver_email,
        ra.current_status,
        ra.workflow_id
      FROM stock_issuance_requests sir
      LEFT JOIN request_approvals ra ON ra.request_id = sir.id
      LEFT JOIN AspNetUsers u_approver ON u_approver.Id = ra.current_approver_id
      WHERE sir.request_type = 'Organizational'
      ORDER BY sir.id DESC
    `;

    const result = await pool.request().query(orgQuery);

    // Now check the workflow hierarchy
    if (result.recordset.length > 0) {
      const workflowId = result.recordset[0].workflow_id;
      const workflowQuery = `
        SELECT 
          id,
          workflow_name,
          description
        FROM approval_workflows
        WHERE id = @workflowId
      `;

      const workflowResult = await pool.request()
        .input('workflowId', sql.UniqueIdentifier, workflowId)
        .query(workflowQuery);
      
      // Check workflow steps/approvers
      const stepsQuery = `
        SELECT 
          id,
          workflow_id,
          step_order,
          approver_id,
          u.FullName as approver_name,
          u.Email as approver_email,
          designation
        FROM workflow_approvers
        LEFT JOIN AspNetUsers u ON u.Id = approver_id
        WHERE workflow_id = @workflowId
        ORDER BY step_order
      `;

      const stepsResult = await pool.request()
        .input('workflowId', sql.UniqueIdentifier, workflowId)
        .query(stepsQuery);
      
      }

    pool.close();
  } catch (error) {
    console.error('Error:', error.message);
  }
})();
