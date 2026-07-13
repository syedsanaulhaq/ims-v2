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

async function checkVerifications() {
  const pool = new sql.ConnectionPool(config);
  
  try {
    await pool.connect();
    // Check verification requests with forwarding info
    const result = await pool.request().query(`
      SELECT TOP 10
        id,
        stock_issuance_id,
        item_nomenclature,
        requested_by_user_id,
        requested_by_name,
        forwarded_to_user_id,
        forwarded_to_name,
        forwarded_at,
        wing_id,
        verification_status,
        created_at
      FROM inventory_verification_requests
      ORDER BY created_at DESC
    `);

    result.recordset.forEach((row, i) => {
      });

    // Check if there are store keepers in the database
    const skResult = await pool.request().query(`
      SELECT DISTINCT 
        u.Id, 
        u.UserName,
        u.wing_id,
        u.aspNetRole
      FROM AspNetUsers u
      WHERE (u.aspNetRole LIKE '%STORE_KEEPER%' OR u.aspNetRole = 'CUSTOM_WING_STORE_KEEPER')
      ORDER BY u.wing_id, u.UserName
    `);

    skResult.recordset.forEach((row, i) => {
      });

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await pool.close();
  }
}

checkVerifications();
