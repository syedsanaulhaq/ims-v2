const sql = require('mssql');
const { v4: uuidv4 } = require('uuid');

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
    console.log('✅ Connected to database');

    // Get user IDs
    const users = await pool.request().query(`
      SELECT id, FullName FROM AspNetUsers 
      WHERE FullName IN ('Asad ur Rehman', 'Muhammad Ehtesham Siddiqui')
    `);

    const asadId = users.recordset.find(u => u.FullName === 'Asad ur Rehman')?.id;
    const ehteshamId = users.recordset.find(u => u.FullName === 'Muhammad Ehtesham Siddiqui')?.id;

    if (!asadId || !ehteshamId) {
      console.error('❌ Users not found');
      return;
    }

    console.log('✅ Found users:');
    console.log('  Asad ur Rehman:', asadId);
    console.log('  Muhammad Ehtesham Siddiqui:', ehteshamId);

    // Create a test request
    const requestId = uuidv4();
    const approvalId = uuidv4();
    
    // Insert stock issuance request
    await pool.request()
      .input('id', sql.UniqueIdentifier, requestId)
      .input('requester_id', sql.NVarChar(450), asadId)
      .input('title', sql.NVarChar, 'Test Request - Approved')
      .input('purpose', sql.NVarChar, 'Testing grouped sections')
      .input('status', sql.NVarChar, 'pending')
      .query(`
        INSERT INTO stock_issuance_requests (id, requester_user_id, justification, purpose, expected_return_date, request_status, submitted_at, created_at, updated_at)
        VALUES (@id, @requester_id, @title, @purpose, GETDATE(), @status, GETDATE(), GETDATE(), GETDATE())
      `);

    console.log('✅ Created request:', requestId);

    // Insert approval record with approved status
    await pool.request()
      .input('request_id', sql.UniqueIdentifier, requestId)
      .input('approver_id', sql.NVarChar(450), ehteshamId)
      .input('status', sql.NVarChar, 'approved')
      .input('submitted_by', sql.NVarChar(450), asadId)
      .query(`
        INSERT INTO request_approvals (request_id, request_type, workflow_id, current_approver_id, current_status, submitted_by)
        VALUES (@request_id, 'stock_issuance', 'D806EC95-FB78-4187-8FC2-87B897C124A4', @approver_id, @status, @submitted_by)
      `);

    console.log('✅ Created approval:', approvalId);

    // Add approval history
    const historyId = uuidv4();
    await pool.request()
      .input('id', sql.UniqueIdentifier, historyId)
      .input('request_id', sql.UniqueIdentifier, requestId)
      .input('approver_id', sql.NVarChar(450), ehteshamId)
      .query(`
        INSERT INTO approval_history (id, request_approval_id, action_by, action_type, action_date, comments)
        SELECT @id, ra.id, @approver_id, 'approved', GETDATE(), 'Approved for testing'
        FROM request_approvals ra
        WHERE ra.request_id = @request_id
      `);

    console.log('✅ Created approval history record');

    // Add a test item
    const itemId = uuidv4();
    await pool.request()
      .input('id', sql.UniqueIdentifier, itemId)
      .input('request_id', sql.UniqueIdentifier, requestId)
      .input('quantity', sql.Int, 5)
      .query(`
        INSERT INTO stock_issuance_items (id, request_id, requested_quantity, item_type, custom_item_name, created_at, updated_at)
        VALUES (@id, @request_id, @quantity, 'custom', 'Test Item', GETDATE(), GETDATE())
      `);

    console.log('✅ Created test item');

    await pool.close();
    console.log('\n✅ Test data created successfully!');
    console.log('📋 Now the "Future Request (approved request)" section should appear on the Request History page.');

  } catch (err) {
    console.error('❌ Error:', err.message);
  }
})();
