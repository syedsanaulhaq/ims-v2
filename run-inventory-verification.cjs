// ============================================================================
// Inventory Verification Script
// Purpose: Run diagnostic queries to verify inventory updates
// Usage: node run-inventory-verification.cjs
// ============================================================================

const sql = require('mssql');
require('dotenv').config({ path: '.env.sqlserver' });

const dbConfig = {
  server: process.env.SQL_SERVER_HOST,
  port: parseInt(process.env.SQL_SERVER_PORT || '1433'),
  user: process.env.SQL_SERVER_USER,
  password: process.env.SQL_SERVER_PASSWORD,
  database: process.env.SQL_SERVER_DATABASE,
  authentication: {
    type: 'default'
  },
  options: {
    encrypt: process.env.SQL_SERVER_ENCRYPT === 'true',
    trustServerCertificate: process.env.SQL_SERVER_TRUST_CERT === 'true',
    connectionTimeout: 30000,
    requestTimeout: 30000
  }
};

async function runVerification() {
  let pool;
  
  try {
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║     Inventory Verification - Checking Database Updates        ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');
    
    // Connect to database
    console.log('📡 Connecting to database...');
    pool = await sql.connect(dbConfig);
    console.log('✅ Connected to:', process.env.SQL_SERVER_DATABASE, '\n');
    
    // Query 1: Current Inventory Stock Overview
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📊 QUERY 1: Current Inventory Stock Overview');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    const inventoryResult = await pool.request().query(`
      SELECT TOP 20
          cis.id,
          cis.item_master_id,
          im.nomenclature,
          im.item_code,
          c.category_name,
          cis.current_quantity,
          cis.last_transaction_date,
          cis.last_transaction_type,
          cis.last_updated
      FROM current_inventory_stock cis
      INNER JOIN item_masters im ON cis.item_master_id = im.id
      LEFT JOIN categories c ON im.category_id = c.id
      ORDER BY cis.last_transaction_date DESC
    `);
    
    if (inventoryResult.recordset.length === 0) {
      console.log('⚠️  NO INVENTORY RECORDS FOUND!');
      console.log('   This means NO items have been added to inventory yet.\n');
    } else {
      console.log(`✅ Found ${inventoryResult.recordset.length} items in inventory:\n`);
      inventoryResult.recordset.forEach((row, idx) => {
        console.log(`${idx + 1}. ${row.nomenclature} (${row.item_code})`);
        console.log(`   Category: ${row.category_name || 'N/A'}`);
        console.log(`   Quantity: ${row.current_quantity}`);
        console.log(`   Last Transaction: ${row.last_transaction_type} on ${row.last_transaction_date?.toLocaleDateString() || 'N/A'}`);
        console.log('');
      });
    }
    
    // Query 2: Stock Acquisitions Audit Trail
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📋 QUERY 2: Stock Acquisitions Audit Trail');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    const acquisitionsResult = await pool.request().query(`
      SELECT TOP 10
          sa.id,
          sa.acquisition_number,
          sa.po_id,
          po.po_number,
          sa.delivery_id,
          d.delivery_number,
          sa.total_items,
          sa.total_quantity,
          sa.total_value,
          sa.acquisition_date,
          sa.processed_by,
          sa.status
      FROM stock_acquisitions sa
      INNER JOIN purchase_orders po ON sa.po_id = po.id
      INNER JOIN deliveries d ON sa.delivery_id = d.id
      ORDER BY sa.acquisition_date DESC
    `);
    
    if (acquisitionsResult.recordset.length === 0) {
      console.log('⚠️  NO STOCK ACQUISITIONS FOUND!');
      console.log('   This means no deliveries have been processed yet.\n');
    } else {
      console.log(`✅ Found ${acquisitionsResult.recordset.length} stock acquisitions:\n`);
      acquisitionsResult.recordset.forEach((row, idx) => {
        console.log(`${idx + 1}. ${row.acquisition_number}`);
        console.log(`   PO: ${row.po_number} | Delivery: ${row.delivery_number}`);
        console.log(`   Total Items: ${row.total_items} | Total Qty: ${row.total_quantity} | Value: ${row.total_value || 'N/A'}`);
        console.log(`   Date: ${row.acquisition_date?.toLocaleDateString()} | Processed by ID: ${row.processed_by || 'Unknown'}`);
        console.log(`   Status: ${row.status}`);
        console.log('');
      });
    }
    
    // Query 3: Delivery to Inventory Trace
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('🔍 QUERY 3: Delivery to Inventory Trace');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    const deliveryTraceResult = await pool.request().query(`
      SELECT TOP 20
          d.delivery_number,
          d.delivery_date,
          d.delivery_personnel,
          d.delivery_chalan,
          d.receiving_date,
          po.po_number,
          t.tender_number,
          t.tender_type,
          im.nomenclature,
          im.item_code,
          di.delivery_qty,
          di.quality_status,
          CASE 
              WHEN di.quality_status = 'good' THEN 'Added to Inventory'
              WHEN di.quality_status = 'damaged' THEN 'Not Added (Damaged)'
              WHEN di.quality_status = 'rejected' THEN 'Not Added (Rejected)'
              WHEN di.quality_status = 'partial' THEN 'Partially Added'
              ELSE 'Unknown Status'
          END AS inventory_status,
          sa.acquisition_number
      FROM deliveries d
      INNER JOIN delivery_items di ON d.id = di.delivery_id
      INNER JOIN purchase_orders po ON d.po_id = po.id
      LEFT JOIN tenders t ON po.tender_id = t.id
      INNER JOIN item_masters im ON di.item_master_id = im.id
      LEFT JOIN stock_acquisitions sa ON sa.delivery_id = d.id
      WHERE d.delivery_status = 'completed'
      ORDER BY d.receiving_date DESC, d.delivery_number, im.nomenclature
    `);
    
    if (deliveryTraceResult.recordset.length === 0) {
      console.log('⚠️  NO COMPLETED DELIVERIES FOUND!');
      console.log('   No deliveries have been received yet.\n');
    } else {
      console.log(`✅ Found ${deliveryTraceResult.recordset.length} delivery items:\n`);
      let currentDelivery = '';
      deliveryTraceResult.recordset.forEach((row) => {
        if (currentDelivery !== row.delivery_number) {
          currentDelivery = row.delivery_number;
          console.log(`\n📦 ${row.delivery_number} (PO: ${row.po_number}, Tender: ${row.tender_number || 'N/A'})`);
          console.log(`   Personnel: ${row.delivery_personnel || 'N/A'} | Challan: ${row.delivery_chalan || 'N/A'}`);
          console.log(`   Received: ${row.receiving_date?.toLocaleDateString() || 'N/A'}`);
          console.log(`   Acquisition: ${row.acquisition_number || 'N/A'}`);
          console.log('   Items:');
        }
        console.log(`   - ${row.nomenclature} (${row.item_code})`);
        console.log(`     Qty: ${row.delivery_qty} | Quality: ${row.quality_status} | ${row.inventory_status}`);
      });
      console.log('');
    }
    
    // Query 4: Summary Statistics
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📈 QUERY 4: Summary Statistics');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    const statsResult = await pool.request().query(`
      SELECT 
          (SELECT COUNT(*) FROM current_inventory_stock) as total_inventory_items,
          (SELECT ISNULL(SUM(current_quantity), 0) FROM current_inventory_stock) as total_inventory_quantity,
          (SELECT COUNT(*) FROM stock_acquisitions) as total_acquisitions,
          (SELECT COUNT(*) FROM deliveries WHERE delivery_status = 'completed') as completed_deliveries,
          (SELECT COUNT(*) FROM deliveries WHERE delivery_status = 'pending') as pending_deliveries,
          (SELECT COUNT(DISTINCT po_id) FROM deliveries) as pos_with_deliveries
    `);
    
    const stats = statsResult.recordset[0];
    console.log(`📊 Inventory Items: ${stats.total_inventory_items}`);
    console.log(`📦 Total Inventory Quantity: ${stats.total_inventory_quantity}`);
    console.log(`📝 Total Acquisitions: ${stats.total_acquisitions}`);
    console.log(`✅ Completed Deliveries: ${stats.completed_deliveries}`);
    console.log(`⏳ Pending Deliveries: ${stats.pending_deliveries}`);
    console.log(`🛒 POs with Deliveries: ${stats.pos_with_deliveries}`);
    
    // Query 5: Check for issues (items that should be in inventory but aren't)
    console.log('\n\n═══════════════════════════════════════════════════════════════');
    console.log('⚠️  QUERY 5: Potential Issues Check');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    const issuesResult = await pool.request().query(`
      SELECT 
          im.nomenclature,
          im.item_code,
          po.po_number,
          d.delivery_number,
          di.delivery_qty,
          di.quality_status,
          d.receiving_date,
          CASE 
              WHEN cis.id IS NULL THEN 'Not in Inventory Table'
              WHEN cis.current_quantity = 0 THEN 'In Table but Zero Quantity'
              ELSE 'In Inventory'
          END as inventory_presence
      FROM delivery_items di
      INNER JOIN deliveries d ON di.delivery_id = d.id
      INNER JOIN purchase_orders po ON d.po_id = po.id
      INNER JOIN item_masters im ON di.item_master_id = im.id
      LEFT JOIN current_inventory_stock cis ON im.id = cis.item_master_id
      WHERE d.delivery_status = 'completed'
        AND di.quality_status = 'good'
        AND (cis.id IS NULL OR cis.current_quantity = 0)
      ORDER BY d.receiving_date DESC
    `);
    
    if (issuesResult.recordset.length === 0) {
      console.log('✅ NO ISSUES FOUND!');
      console.log('   All good-quality items from completed deliveries are in inventory.\n');
    } else {
      console.log(`❌ FOUND ${issuesResult.recordset.length} POTENTIAL ISSUES:\n`);
      console.log('   These items were marked as "good" in completed deliveries but are NOT in inventory:\n');
      issuesResult.recordset.forEach((row, idx) => {
        console.log(`${idx + 1}. ${row.nomenclature} (${row.item_code})`);
        console.log(`   Delivery: ${row.delivery_number} | PO: ${row.po_number}`);
        console.log(`   Qty: ${row.delivery_qty} | Quality: ${row.quality_status}`);
        console.log(`   Received: ${row.receiving_date?.toLocaleDateString()}`);
        console.log(`   Issue: ${row.inventory_presence}`);
        console.log('');
      });
    }
    
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║                 Verification Complete ✅                        ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');
    
  } catch (err) {
    console.error('\n❌ Error running verification:', err.message);
    console.error(err);
  } finally {
    if (pool) {
      await pool.close();
      console.log('📡 Database connection closed.\n');
    }
  }
}

// Run the verification
runVerification();
