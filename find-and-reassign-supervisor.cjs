const sql = require('mssql');
require('dotenv').config({ path: '.env.sqlserver' });

const config = {
  user: process.env.SQL_SERVER_USER,
  password: process.env.SQL_SERVER_PASSWORD,
  database: process.env.SQL_SERVER_DATABASE,
  server: process.env.SQL_SERVER_HOST,
  pool: { max: 10 },
  options: { encrypt: false, trustServerCertificate: true }
};

async function findAndReassign() {
  const pool = new sql.ConnectionPool(config);
  try {
    await pool.connect();

    console.log('\n🔍 FINDING SUPERVISOR: Muhammad Ehtesham Siddiqui');
    console.log('='.repeat(60));

    // Find the supervisor by name
    const userResult = await pool.request()
      .input('name', sql.NVarChar, '%Muhammad Ehtesham Siddiqui%')
      .query(`
        SELECT Id, FullName, Email FROM AspNetUsers
        WHERE FullName LIKE @name
      `);

    if (userResult.recordset.length === 0) {
      console.log('\n❌ User NOT FOUND');
      console.log('\nSearching for similar names...');
      const similarResult = await pool.request()
        .query(`
          SELECT Id, FullName, Email FROM AspNetUsers
          WHERE FullName LIKE '%Muhammad%' OR FullName LIKE '%Ehtesham%'
          ORDER BY FullName
        `);
      
      console.log('\nPossible matches:');
      similarResult.recordset.forEach((u, i) => {
        console.log(`   ${i + 1}. ${u.FullName} (${u.Id})`);
      });
      return;
    }

    const supervisor = userResult.recordset[0];
    console.log('\n✅ Found Supervisor:');
    console.log('   Name: ' + supervisor.FullName);
    console.log('   ID: ' + supervisor.Id);
    console.log('   Email: ' + supervisor.Email);

    // Reassign the request to this supervisor
    const requestId = 'FB1A19AD-FB56-4304-A98F-8484089C4899';
    const updateResult = await pool.request()
      .input('requestId', sql.UniqueIdentifier, requestId)
      .input('supervisorId', sql.NVarChar(450), supervisor.Id)
      .query(`
        UPDATE request_approvals
        SET current_approver_id = @supervisorId
        WHERE request_id = @requestId;
        SELECT @@ROWCOUNT as rows_updated;
      `);

    const rowsUpdated = updateResult.recordset[0].rows_updated;
    
    console.log('\n✅ Request reassigned to ' + supervisor.FullName);
    console.log('   Request ID: ' + requestId);
    console.log('   New Approver: ' + supervisor.FullName + ' (' + supervisor.Id + ')');
    console.log('   Rows updated: ' + rowsUpdated);

    console.log('\n' + '='.repeat(60));

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.close();
  }
}

findAndReassign();
