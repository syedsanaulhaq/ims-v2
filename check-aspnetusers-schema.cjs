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
    console.log("✅ Connected to InventoryManagementDB\n");

    const result = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'AspNetUsers'
      ORDER BY ORDINAL_POSITION
    `);

    console.log("📋 AspNetUsers table columns:\n");
    result.recordset.forEach(row => {
      const nullable = row.IS_NULLABLE === 'YES' ? '(nullable)' : '';
      console.log(`  ${row.COLUMN_NAME} [${row.DATA_TYPE}] ${nullable}`);
    });

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await pool.close();
  }
}

checkSchema();
