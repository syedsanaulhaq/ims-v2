const { getPool, initializePool } = require('./server/db/connection.cjs');

async function main() {
  await initializePool();
  const pool = getPool();
  
  const userId = 'fe516fe7-4ee0-4d52-a4d9-ced9c3beb6dc';
  
  const result = await pool.request()
    .input('userId', userId)
    .query(`
      SELECT Id, UserName, FullName, Email
      FROM AspNetUsers
      WHERE Id = @userId
    `);
  console.log('User:');
  console.log(JSON.stringify(result.recordset, null, 2));
  
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
