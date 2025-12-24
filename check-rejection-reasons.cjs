const sql = require('mssql');

const config = {
  server: 'SYED-FAZLI-LAPT',
  database: 'InventoryManagementDB',
  user: 'inventorymanagementuser',
  password: '2016Wfp61@',
  port: 1433,
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

async function checkRejectionReasons() {
  try {
    await sql.connect(config);

    // Check request_approvals for the returned request
    console.log('=== REQUEST_APPROVALS FOR RETURNED REQUEST ===');
    const raResult = await sql.query`
      SELECT
        ra.rejection_reason,
        ra.approval_comments,
        ra.current_status,
        ra.id
      FROM request_approvals ra
      WHERE ra.request_id = '30B779AA-A5B1-454C-A88F-749783F29337'
    `;

    console.log('Found', raResult.recordset.length, 'request_approvals records:');
    raResult.recordset.forEach((row, i) => {
      console.log(`--- Record ${i+1} ---`);
      console.log('id:', row.id);
      console.log('rejection_reason:', row.rejection_reason);
      console.log('approval_comments:', row.approval_comments);
      console.log('current_status:', row.current_status);
      console.log('');
    });

    // Check if there's per-item information in approval_history
    console.log('=== APPROVAL_HISTORY WITH ITEM DETAILS ===');
    const ahResult = await sql.query`
      SELECT
        ah.comments,
        ah.action_type,
        ah.action_date,
        ai.nomenclature,
        ai.rejection_reason as item_rejection_reason
      FROM approval_history ah
      LEFT JOIN approval_items ai ON ah.request_approval_id = ai.request_approval_id
      WHERE ah.request_approval_id IN (
        SELECT ra.id FROM request_approvals ra WHERE ra.request_id = '30B779AA-A5B1-454C-A88F-749783F29337'
      )
      ORDER BY ah.action_date DESC, ai.nomenclature
    `;

    console.log('Found', ahResult.recordset.length, 'approval history records with items:');
    ahResult.recordset.forEach((row, i) => {
      console.log(`--- Record ${i+1} ---`);
      console.log('comments:', row.comments);
      console.log('action_type:', row.action_type);
      console.log('nomenclature:', row.nomenclature);
      console.log('item_rejection_reason:', row.item_rejection_reason);
      console.log('');
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    sql.close();
  }
}

checkRejectionReasons();