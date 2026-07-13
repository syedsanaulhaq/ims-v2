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

async function checkDesignationTable() {
  const pool = new sql.ConnectionPool(config);
  
  try {
    await pool.connect();
    // Check designation table structure
    const schema = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'tblUserDesignations'
      ORDER BY ORDINAL_POSITION
    `);

    schema.recordset.forEach(row => {
      });

    // Get sample designations
    const data = await pool.request().query(`
      SELECT TOP 10 *
      FROM tblUserDesignations
    `);

    data.recordset.slice(0, 3).forEach(row => {
      });

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await pool.close();
  }
}

checkDesignationTable();
