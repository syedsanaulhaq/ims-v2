const sql = require("mssql");

const config = {
  server: "SYED-FAZLI-LAPT",
  database: "InventoryManagementDB",
  user: "inventorymanagementuser",
  password: "2016Wfp61@",
  port: 1433,
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableArithAbort: true
  }
};

async function checkConstraints() {
  const pool = new sql.ConnectionPool(config);
  
  try {
    await pool.connect();
    // Get check constraints
    const result = await pool.request().query(`
      SELECT 
        name AS CONSTRAINT_NAME,
        definition AS CHECK_CLAUSE
      FROM sys.check_constraints
      WHERE parent_object_id = OBJECT_ID('inventory_verification_requests')
    `);

    result.recordset.forEach(row => {
      });

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await pool.close();
  }
}

checkConstraints();
