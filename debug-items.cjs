const sql = require('mssql');
require('dotenv').config({ path: '.env.sqlserver' });

const config = {
  server: process.env.SQL_SERVER_HOST,
  authentication: {
    type: 'default',
    options: {
      userName: process.env.SQL_SERVER_USER,
      password: process.env.SQL_SERVER_PASSWORD
    }
  },
  options: {
    database: process.env.SQL_SERVER_DATABASE,
    trustServerCertificate: true,
    encrypt: false,
    connectionTimeout: 30000,
    requestTimeout: 30000
  }
};

async function checkItems() {
  const pool = new sql.ConnectionPool(config);
  
  try {
    await pool.connect();
    console.log('✅ Connected to database\n');
    
    // Check if items exist for our request
    const requestId = '74536345-1888-4524-B422-133B85FC6708';
    
    console.log(`1️⃣  Checking stock_issuance_items for request: ${requestId}\n`);
    const itemsResult = await pool.request().query(`
      SELECT 
        id,
        request_id,
        item_master_id,
        custom_item_name,
        requested_quantity,
        approved_quantity,
        item_type,
        created_at
      FROM stock_issuance_items
      WHERE request_id = '${requestId}'
    `);
    
    console.log(`Found ${itemsResult.recordset.length} items:`);
    itemsResult.recordset.forEach(item => {
      console.log(`
  ID: ${item.id}
  Item Master ID: ${item.item_master_id}
  Type: ${item.item_type}
  Custom Name: ${item.custom_item_name}
  Requested: ${item.requested_quantity}
  Approved: ${item.approved_quantity}
  Created: ${item.created_at}
      `);
    });

    // Check item_masters table structure and data
    console.log(`\n2️⃣  Checking item_masters table structure\n`);
    const columnResult = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'item_masters'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('item_masters columns:');
    columnResult.recordset.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME} (${col.DATA_TYPE})`);
    });

    // Check if the item_master_id references exist
    if (itemsResult.recordset.length > 0) {
      console.log(`\n3️⃣  Checking if item_master records exist\n`);
      const itemMasterIds = itemsResult.recordset
        .map(i => i.item_master_id)
        .filter(id => id != null);
      
      if (itemMasterIds.length > 0) {
        const masterResult = await pool.request().query(`
          SELECT 
            id,
            nomenclature,
            item_code,
            unit
          FROM item_masters
          WHERE id IN (${itemMasterIds.map(id => `'${id}'`).join(',')})
        `);
        
        console.log(`Found ${masterResult.recordset.length} item masters:`);
        masterResult.recordset.forEach(im => {
          console.log(`
  ID: ${im.id}
  Nomenclature: ${im.nomenclature}
  Code: ${im.item_code}
  Unit: ${im.unit}
          `);
        });
      }
    }

    // Test the actual backend query
    console.log(`\n4️⃣  Testing actual backend query\n`);
    const backendQueryResult = await pool.request().query(`
      SELECT 
        si_items.item_master_id as item_id,
        CASE 
          WHEN si_items.item_type = 'custom' THEN si_items.custom_item_name
          ELSE COALESCE(im.nomenclature, 'Unknown Item')
        END as item_name,
        si_items.requested_quantity,
        si_items.approved_quantity,
        COALESCE(im.unit, 'units') as unit,
        si_items.item_type
      FROM stock_issuance_items si_items
      LEFT JOIN item_masters im ON im.id = si_items.item_master_id
      WHERE si_items.request_id = '${requestId}'
      ORDER BY 
        CASE 
          WHEN si_items.item_type = 'custom' THEN si_items.custom_item_name
          ELSE im.nomenclature
        END
    `);
    
    console.log(`Backend query returns ${backendQueryResult.recordset.length} items:`);
    backendQueryResult.recordset.forEach(item => {
      console.log(`
  Name: ${item.item_name}
  Quantity: ${item.requested_quantity}
  Approved: ${item.approved_quantity}
  Unit: ${item.unit}
  Type: ${item.item_type}
      `);
    });
    
    await pool.close();
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err);
  }
}

checkItems();
