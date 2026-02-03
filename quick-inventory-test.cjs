// ============================================================================
// Quick Inventory Test Script
// Usage: node quick-inventory-test.cjs
// ============================================================================

const BASE_URL = 'http://localhost:3001/api';

// Test credentials (update with your actual test user)
const TEST_USER = {
  email: 'admin@test.com',
  password: 'admin123'
};

let authToken = '';
let testPOId = '';
let testDeliveryId = '';

async function login() {
  console.log('\n🔐 Step 1: Logging in...');
  try {
    const response = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(TEST_USER)
    });
    
    if (!response.ok) throw new Error('Login failed');
    
    const data = await response.json();
    authToken = data.token;
    console.log('✅ Login successful');
    return data.user.id;
  } catch (error) {
    console.error('❌ Login failed:', error.message);
    throw error;
  }
}

async function getCurrentInventory() {
  console.log('\n📊 Fetching current inventory...');
  try {
    const sql = require('mssql');
    require('dotenv').config({ path: '.env.sqlserver' });

    const pool = await sql.connect({
      server: process.env.SQL_SERVER_HOST,
      database: process.env.SQL_SERVER_DATABASE,
      user: process.env.SQL_SERVER_USER,
      password: process.env.SQL_SERVER_PASSWORD,
      options: {
        encrypt: false,
        trustServerCertificate: true
      }
    });

    const result = await pool.request().query(`
      SELECT 
        im.nomenclature,
        im.item_code,
        cis.current_quantity
      FROM current_inventory_stock cis
      INNER JOIN item_masters im ON cis.item_master_id = im.id
      ORDER BY im.nomenclature
    `);

    await pool.close();
    return result.recordset;
  } catch (error) {
    console.error('❌ Failed to fetch inventory:', error.message);
    return [];
  }
}

async function testExistingPO() {
  console.log('\n🧪 Testing Existing PO Workflow');
  console.log('═══════════════════════════════════════════════════════════════\n');

  try {
    // Step 1: Get list of finalized POs
    console.log('📋 Step 2: Fetching finalized Purchase Orders...');
    const posResponse = await fetch(`${BASE_URL}/purchase-orders`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (!posResponse.ok) throw new Error('Failed to fetch POs');
    const posData = await posResponse.json();

    const finalizedPOs = posData.purchaseOrders.filter(
      po => po.status === 'finalized' && po.delivery_status !== 'completed'
    );

    if (finalizedPOs.length === 0) {
      console.log('⚠️  No finalized POs available for testing');
      console.log('   Please create a tender, finalize it, and generate a PO first.');
      console.log('   See INVENTORY-TESTING-GUIDE.md for manual workflow steps.');
      return;
    }

    const testPO = finalizedPOs[0];
    console.log(`✅ Found PO: ${testPO.po_number}`);
    console.log(`   Status: ${testPO.status}`);
    console.log(`   Delivery Status: ${testPO.delivery_status || 'none'}`);

    // Step 2: Get PO items
    console.log(`\n📦 Step 3: Fetching PO items for ${testPO.po_number}...`);
    const itemsResponse = await fetch(`${BASE_URL}/purchase-orders/${testPO.id}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (!itemsResponse.ok) throw new Error('Failed to fetch PO items');
    const itemsData = await itemsResponse.json();

    const items = itemsData.items;
    console.log(`✅ Found ${items.length} items in PO:`);
    items.forEach((item, idx) => {
      console.log(`   ${idx + 1}. ${item.nomenclature} - Qty: ${item.quantity}, Unit: ${item.unit}`);
    });
fetch(
      `${BASE_URL}/purchase-orders/${testPO.id}/delivery-status`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );

    if (deliveriesResponse.ok) {
      const deliveriesData = await deliveriesResponse.json();
      
      if (deliveriesData.deliveries && deliveriesData.deliveries.length > 0) {
        console.log(`✅ Found ${deliveriesData.deliveries.length} existing deliveries:`);
        deliveriesD
    if (deliveriesResponse.data.deliveries && deliveriesResponse.data.deliveries.length > 0) {
      console.log(`✅ Found ${deliveriesResponse.data.deliveries.length} existing deliveries:`);
     
    } deliveriesResponse.data.deliveries.forEach(delivery => {
        console.log(`   - ${delivery.delivery_number}: ${delivery.delivery_status}`);
        console.log(`     Personnel: ${delivery.delivery_personnel || 'N/A'}`);
        console.log(`     Challan: ${delivery.delivery_chalan || 'N/A'}`);
        console.log(`     Date: ${delivery.delivery_date}`);
      });
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📝 Next Steps (Manual):');
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log(`1. Go to Purchase Orders Dashboard: http://localhost:5173/dashboard/purchase-orders`);
    console.log(`2. Find PO: ${testPO.po_number}`);
    console.log(`3. Click Package icon (📦) to create delivery`);
    console.log(`4. Fill in delivery details:`);
    console.log(`   - Personnel: Test User`);
    console.log(`   - Challan: TEST-CH-001`);
    console.log(`   - Quality: Mark items as "Good"`);
    console.log(`5. Click "Create De
    console.log(`6. Click CheckCircle icon (✓) to receive delivery`);
    console.log(`7. Confirm quality and click "Confirm Receipt"`);
    console.log(`8. Run: node run-inventory-verification.cjs`);
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

async function showInventorySummary() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📊 Current Inventory Summary');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const inventory = await getCurrentInventory();

  if (inventory.length === 0) {
    console.log('⚠️  No items in inventory yet');
    console.log('   Complete the delivery workflow to add items to inventory.');
  } else {
    console.log(`✅ ${inventory.length} items in inventory:\n`);
    inventory.forEach((item, idx) => {
      console.log(`${idx + 1}. ${item.nomenclature} (${item.item_code})`);
      console.log(`   Quantity: ${item.current_quantity}`);
    });
  }

  console.log('\n═══════════════════════════════════════════════════════════════\n');
}

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║           Quick Inventory Test - Workflow Guide                ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');

  try {
    // Show current inventory
    await showInventorySummary();

    // Login
    const userId = await login();

    // Test existing PO workflow
    await testExistingPO();

    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║              Test Preparation Complete ✅                       ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    console.log('💡 For automated verification, run:');
    console.log('   node run-inventory-verification.cjs\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
main();
