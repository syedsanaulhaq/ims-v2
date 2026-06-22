require('dotenv').config();
const sql = require('mssql');

async function updateConstraint() {
  let pool;
  try {
    pool = await sql.connect(process.env.DB_CONNECTION_STRING);
    console.log('Connected to DB');

    // Get current constraint definition
    const result = await pool.request().query(`
      SELECT definition 
      FROM sys.check_constraints 
      WHERE name = 'CHK_approval_history_action_type'
    `);
    
    if (result.recordset.length > 0) {
      console.log('Current constraint:', result.recordset[0].definition);
      
      // Drop it
      await pool.request().query(`
        ALTER TABLE dbo.approval_history DROP CONSTRAINT CHK_approval_history_action_type
      `);
      console.log('Dropped old constraint');
    }

    // Add new constraint
    await pool.request().query(`
      ALTER TABLE dbo.approval_history 
      ADD CONSTRAINT CHK_approval_history_action_type 
      CHECK (action_type IN (
        'submitted', 
        'forwarded', 
        'approved', 
        'rejected', 
        'returned', 
        'sent_to_store_keeper', 
        'issued', 
        'dispatched', 
        'delivered', 
        'completed', 
        'finalized',
        'clarification_requested',
        'clarification_provided'
      ))
    `);
    console.log('Added new constraint CHK_approval_history_action_type');

  } catch (e) {
    console.error('Error:', e);
  } finally {
    if (pool) pool.close();
  }
}

updateConstraint();
