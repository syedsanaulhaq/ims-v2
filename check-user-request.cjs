const { initializePool, sql } = require('./server/db/connection.cjs');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

async function run() {
  try {
    const pool = await initializePool();
    console.log('Connected!');

    // Get the user details
    const userResult = await pool.request()
      .query(`SELECT Id, FullName, UserName, Email, intWingID FROM AspNetUsers WHERE UserName = '1730115698727'`);
    console.log('User Details:', userResult.recordset);

    if (userResult.recordset.length > 0) {
      const userId = userResult.recordset[0].Id;
      
      // Get stock issuance requests for this user
      const requests = await pool.request()
        .input('userId', sql.NVarChar, userId)
        .query(`
          SELECT sir.id, sir.request_number, sir.request_type, sir.purpose, sir.urgency_level, sir.approval_status, sir.request_status, sir.created_at, sir.submitted_at
          FROM stock_issuance_requests sir
          WHERE sir.requester_user_id = @userId
          ORDER BY sir.created_at DESC
        `);
      console.log('Requests for this user:');
      console.table(requests.recordset);

      if (requests.recordset.length > 0) {
        const firstRequestId = requests.recordset[0].id;
        
        // Let's get items for the most recent request
        const items = await pool.request()
          .input('requestId', sql.UniqueIdentifier, firstRequestId)
          .query(`
            SELECT sii.id, sii.item_master_id, sii.nomenclature, sii.requested_quantity, sii.approved_quantity, sii.item_status
            FROM stock_issuance_items sii
            WHERE sii.request_id = @requestId
          `);
        console.log('Items for request ' + requests.recordset[0].request_number + ' (ID: ' + firstRequestId + '):');
        console.table(items.recordset);

        // Let's also check the workflow/approval status for this request
        const approval = await pool.request()
          .input('requestId', sql.UniqueIdentifier, firstRequestId)
          .query(`
            SELECT ra.id, ra.current_approver_id, ra.current_status, ra.is_admin_workflow, u.FullName as current_approver_name
            FROM request_approvals ra
            LEFT JOIN AspNetUsers u ON ra.current_approver_id = u.Id
            WHERE ra.request_id = @requestId
          `);
        console.log('Approval workflows:');
        console.table(approval.recordset);

        if (approval.recordset.length > 0) {
          const approvalId = approval.recordset[0].id;
          
          // Let's get history
          const history = await pool.request()
            .input('approvalId', sql.UniqueIdentifier, approvalId)
            .query(`
              SELECT ah.step_number, ah.action_type, ah.action_date, ah.comments, u.FullName as action_by_name
              FROM approval_history ah
              LEFT JOIN AspNetUsers u ON ah.action_by = u.Id
              WHERE ah.request_approval_id = @approvalId
              ORDER BY ah.step_number ASC
            `);
          console.log('History:');
          console.table(history.recordset);

          // Let's check ims_request_workflow_state
          const state = await pool.request()
            .input('requestId', sql.UniqueIdentifier, firstRequestId)
            .query(`
              SELECT ws.id, ws.group_number, ws.current_step_id, ws.lane_status, ws.is_completed, ws.current_approver_id, u.FullName as current_approver_name
              FROM ims_request_workflow_state ws
              LEFT JOIN AspNetUsers u ON ws.current_approver_id = u.Id
              WHERE ws.request_id = @requestId
            `);
          console.log('Workflow state states (per group):');
          console.table(state.recordset);
        }
      }
    }
    
    await pool.close();
  } catch (err) {
    console.error('Error:', err);
  }
}

run();