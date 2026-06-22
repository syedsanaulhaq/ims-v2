const { initializePool } = require('./server/db/connection.cjs');

async function fix() {
  let pool;
  try {
    pool = await initializePool();
    console.log('Connected');
    
    try {
        await pool.request().query("ALTER TABLE dbo.approval_history DROP CONSTRAINT CHK_approval_history_action_type");
        console.log('Dropped constraint');
    } catch(e) {
        console.log('Drop error (might not exist):', e.message);
    }

    await pool.request().query("ALTER TABLE dbo.approval_history ADD CONSTRAINT CHK_approval_history_action_type CHECK (action_type IN ('submitted', 'forwarded', 'forwarded_to_admin', 'forwarded_to_supervisor', 'approved', 'rejected', 'returned', 'sent_to_store_keeper', 'issued', 'dispatched', 'delivered', 'completed', 'finalized','clarification_requested','clarification_provided'))");
    console.log('Added constraint');
  } catch(e) {
    console.error(e);
  }
}

fix();
