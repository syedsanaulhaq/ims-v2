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

async function checkSchema() {
  const pool = new sql.ConnectionPool(config);
  
  try {
    await pool.connect();
    console.log("✅ Connected\n");

    // Check all columns in AspNetUsers
    const result = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'AspNetUsers'
      ORDER BY ORDINAL_POSITION
    `);

    console.log("📋 AspNetUsers Columns:\n");
    result.recordset.forEach(row => {
      console.log(`- ${row.COLUMN_NAME} (${row.DATA_TYPE})`);
    });

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await pool.close();
  }
}

checkSchema();
