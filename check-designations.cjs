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

async function checkDesignations() {
  const pool = new sql.ConnectionPool(config);
  
  try {
    await pool.connect();
    // Check designation table
    const result = await pool.request().query(`
      SELECT TOP 5
        u.Id,
        u.UserName,
        u.intDesignationID,
        d.designation_name,
        d.designation_title
      FROM AspNetUsers u
      LEFT JOIN ims_designations d ON u.intDesignationID = d.designation_id
      WHERE u.UserName IN ('4dae06b7-17cd-480b-81eb-da9c76ad5728', '3740506012171')
    `);

    result.recordset.forEach(row => {
      });

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await pool.close();
  }
}

checkDesignations();
