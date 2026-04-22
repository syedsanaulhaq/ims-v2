const sql = require('mssql');
require('dotenv').config({ path: '.env.sqlserver' });
(async () => {
  const p = await sql.connect({
    server: process.env.SQL_SERVER_HOST,
    database: process.env.SQL_SERVER_DATABASE,
    user: process.env.SQL_SERVER_USER,
    password: process.env.SQL_SERVER_PASSWORD,
    options: { encrypt: false, trustServerCertificate: true }
  });
  const itemMasterId = '1F0B7933-F1EA-4A95-913C-4F3044DF7637'; // Center Table Set (2 in 1)

  // Check current stock
  const sa = await p.query(`SELECT * FROM stock_admin WHERE item_master_id = '${itemMasterId}'`);
  console.log('stock_admin:', sa.recordset[0]?.available_quantity);

  // Restore stock: add 1 back
  await p.query(`UPDATE stock_admin SET available_quantity = available_quantity + 1 WHERE item_master_id = '${itemMasterId}'`);
  
  // Verify
  const sa2 = await p.query(`SELECT available_quantity FROM stock_admin WHERE item_master_id = '${itemMasterId}'`);
  console.log('stock_admin after restore:', sa2.recordset[0]?.available_quantity);

  p.close();
})().catch(e => console.error(e));
