const sql = require('mssql');

const config = {
  user: 'inventorymanagementuser',
  password: '2016Wfp61@',
  server: 'SYED-FAZLI-LAPT',
  database: 'InventoryManagementDB',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    connectionTimeout: 5000
  }
};

async function debugWingSupervisor() {
  try {
    const pool = new sql.ConnectionPool(config);
    await pool.connect();
    console.log('✅ Connected\n');

    const userId = (await pool.request().query(`SELECT Id FROM AspNetUsers WHERE UserName = '3730207514595'`)).recordset[0].Id;
    console.log(`=== USER: 3730207514595 (ID: ${userId}) ===\n`);

    // 1. Check roles
    console.log('1. CHECKING ROLES:');
    const rolesResult = await pool.request()
      .query(`
        SELECT 
          r.role_name,
          ur.scope_type,
          ur.scope_wing_id
        FROM ims_user_roles ur
        JOIN ims_roles r ON ur.role_id = r.id
        WHERE ur.user_id = '${userId}'
        ORDER BY r.role_name
      `);
    
    rolesResult.recordset.forEach(row => {
      console.log(`   ✓ ${row.role_name} (scope_wing_id: ${row.scope_wing_id})`);
    });

    // 2. Check permissions
    console.log('\n2. CHECKING PERMISSIONS:');
    const permResult = await pool.request()
      .query(`
        SELECT DISTINCT p.permission_key
        FROM ims_user_roles ur
        JOIN ims_role_permissions rp ON ur.role_id = rp.role_id
        JOIN ims_permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = '${userId}'
        ORDER BY p.permission_key
      `);
    
    const permissions = permResult.recordset.map(p => p.permission_key);
    console.log(`   Found ${permissions.length} permission(s):`);
    permissions.forEach(p => console.log(`   ✓ ${p}`));
    
    const hasInventoryManage = permissions.includes('inventory.manage');
    console.log(`\n   🔑 inventory.manage: ${hasInventoryManage ? '✓ YES' : '❌ NO'}`);

    // 3. Check wing assignments
    console.log('\n3. CHECKING WING ASSIGNMENTS:');
    const wingResult = await pool.request()
      .query(`
        SELECT DISTINCT ur.scope_wing_id, w.Name
        FROM ims_user_roles ur
        LEFT JOIN WingsInformation w ON ur.scope_wing_id = w.Id
        WHERE ur.user_id = '${userId}' AND ur.scope_wing_id IS NOT NULL
      `);
    
    const wingIds = wingResult.recordset.map(w => w.scope_wing_id);
    console.log(`   Assigned to ${wingIds.length} wing(s):`);
    wingResult.recordset.forEach(w => {
      console.log(`   ✓ Wing ID ${w.scope_wing_id}: ${w.Name}`);
    });

    // 4. Check pending verifications in those wings
    console.log('\n4. CHECKING PENDING VERIFICATIONS:');
    const verResult = await pool.request()
      .query(`
        SELECT id, item_nomenclature, wing_id, wing_name, verification_status
        FROM inventory_verification_requests
        WHERE verification_status = 'pending'
        ORDER BY created_at DESC
      `);
    
    console.log(`   Total pending verifications: ${verResult.recordset.length}`);
    verResult.recordset.forEach(v => {
      const isVisible = wingIds.includes(v.wing_id);
      console.log(`   ${isVisible ? '✓' : '❌'} ID ${v.id}: ${v.item_nomenclature} (Wing ${v.wing_id})`);
    });

    // 5. Simulate API query
    console.log('\n5. SIMULATING API QUERY:');
    if (wingIds.length > 0) {
      const placeholders = wingIds.map((_, i) => `@wingId${i}`).join(',');
      let query = `SELECT id, item_nomenclature, wing_id FROM View_Pending_Inventory_Verifications WHERE wing_id IN (${placeholders})`;
      let request = pool.request();
      wingIds.forEach((wingId, i) => {
        request.input(`wingId${i}`, sql.Int, wingId);
      });
      
      const apiResult = await request.query(query);
      console.log(`   API would return: ${apiResult.recordset.length} verification(s)`);
      apiResult.recordset.forEach(v => {
        console.log(`   ✓ ID ${v.id}: ${v.item_nomenclature}`);
      });
    }

    // 6. Summary
    console.log('\n=== SUMMARY ===');
    if (!hasInventoryManage) {
      console.log('❌ PROBLEM: Missing inventory.manage permission!');
      console.log('   → User cannot see "Pending Verifications" menu item');
      console.log('   → Need to run: add-wing-supervisor-inventory-manage.sql');
    } else if (wingIds.length === 0) {
      console.log('❌ PROBLEM: User not assigned to any wing!');
    } else if (verResult.recordset.length === 0) {
      console.log('⚠️  No pending verifications exist yet.');
    } else {
      const visibleCount = verResult.recordset.filter(v => wingIds.includes(v.wing_id)).length;
      if (visibleCount > 0) {
        console.log(`✅ WORKING: User should see ${visibleCount} verification request(s)`);
      } else {
        console.log('❌ PROBLEM: Verifications exist but in different wings!');
      }
    }

    await pool.close();

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

debugWingSupervisor();
