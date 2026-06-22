const { getPool, initializePool } = require('./server/db/connection.cjs');

async function main() {
  await initializePool();
  const pool = getPool();
  
  const result = await pool.request()
    .query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'ims_dynamic_workflow_steps'
    `);
  console.log('Columns:');
  console.log(result.recordset.map(r => r.COLUMN_NAME));
  
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
