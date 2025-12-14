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

async function checkPermissionAssignment() {
  try {
    const pool = new sql.ConnectionPool(config);
    await pool.connect();
    console.log('✅ Connected\n');

    // 1. Check if WING_SUPERVISOR role has inventory.manage permission
    console.log('=== CHECKING WING_SUPERVISOR ROLE ===');
    const rolePermResult = await pool.request()
      .query(`
        SELECT 
          r.id as role_id,
          r.role_name,
          p.permission_key,
          COUNT(*) OVER (PARTITION BY r.id) as total_permissions
        FROM ims_roles r
        LEFT JOIN ims_role_permissions rp ON r.id = rp.role_id
        LEFT JOIN ims_permissions p ON rp.permission_id = p.id
        WHERE r.role_name = 'WING_SUPERVISOR'
        ORDER BY p.permission_key
      `);

    if (rolePermResult.recordset.length === 0) {
      console.log('❌ WING_SUPERVISOR role not found!');
    } else {
      const roleId = rolePermResult.recordset[0].role_id;
      const totalPerms = rolePermResult.recordset[0].total_permissions;
      console.log(`✓ Found WING_SUPERVISOR role (ID: ${roleId})`);
      console.log(`✓ Total permissions assigned: ${totalPerms}`);
      
      const hasInventoryManage = rolePermResult.recordset.some(r => r.permission_key === 'inventory.manage');
      console.log(`\n  inventory.manage: ${hasInventoryManage ? '✓ YES' : '❌ NO'}`);
      
      if (!hasInventoryManage) {
        console.log('\n⚠️  Need to add inventory.manage permission to WING_SUPERVISOR role');
      }
    }

    // 2. Check direct permissions for user 3730207514595
    console.log('\n=== CHECKING USER 3730207514595 PERMISSIONS ===');
    const userPermResult = await pool.request()
      .query(`
        SELECT DISTINCT p.permission_key
        FROM ims_user_roles ur
        JOIN ims_role_permissions rp ON ur.role_id = rp.role_id
        JOIN ims_permissions p ON rp.permission_id = p.id
        WHERE ur.user_id = (SELECT Id FROM AspNetUsers WHERE UserName = '3730207514595')
        ORDER BY p.permission_key
      `);

    console.log(`✓ Total permissions: ${userPermResult.recordset.length}`);
    
    const userHasInventoryManage = userPermResult.recordset.some(p => p.permission_key === 'inventory.manage');
    console.log(`\n  inventory.manage: ${userHasInventoryManage ? '✓ YES' : '❌ NO'}`);

    if (!userHasInventoryManage) {
      console.log('\n❌ PROBLEM: User does not have inventory.manage permission!');
    } else {
      console.log('\n✅ User HAS inventory.manage permission');
      console.log('   Solution: User needs to LOG OUT and LOG IN again to reload permissions');
    }

    await pool.close();

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkPermissionAssignment();
