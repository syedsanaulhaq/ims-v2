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
    const raResult = await sql.query`
      SELECT
        ra.rejection_reason,
        ra.approval_comments,
        ra.current_status,
        ra.id
      FROM request_approvals ra
      WHERE ra.request_id = '30B779AA-A5B1-454C-A88F-749783F29337'
    `;

    raResult.recordset.forEach((row, i) => {
      });

    // Check if there's per-item information in approval_history
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

    ahResult.recordset.forEach((row, i) => {
      });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    sql.close();
  }
}

checkRejectionReasons();