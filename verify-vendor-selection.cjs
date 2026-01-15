#!/usr/bin/env node

/**
 * Vendor Selection System Verification
 * This script verifies all components are ready for vendor selection testing
 */

const { ConnectionPool, config: sqlConfig } = require('mssql');
const fs = require('fs');

async function verify() {
  console.log('\n🔍 Vendor Selection System Verification\n');
  console.log('=' .repeat(60));

  // Check 1: Frontend build exists
  console.log('\n✓ Check 1: Frontend Build');
  if (fs.existsSync('./dist/index.html')) {
    console.log('  ✅ Frontend build exists at ./dist/');
  } else {
    console.log('  ❌ Frontend build NOT found. Run: npm run build');
  }

  // Check 2: EditTender.tsx has vendor_ids initialization
  console.log('\n✓ Check 2: EditTender Component');
  const editTenderPath = './src/pages/EditTender.tsx';
  const editTenderContent = fs.readFileSync(editTenderPath, 'utf8');
  
  if (editTenderContent.includes('vendor_ids: []')) {
    console.log('  ✅ newItem initialized with vendor_ids array');
  } else {
    console.log('  ❌ vendor_ids NOT initialized in newItem state');
  }

  if (editTenderContent.includes('Vendor checkbox clicked')) {
    console.log('  ✅ Vendor selection logging present');
  } else {
    console.log('  ❌ Vendor selection logging NOT found');
  }

  // Check 3: Backend POST endpoint
  console.log('\n✓ Check 3: Backend POST Endpoint');
  const backendPath = './backend-server.cjs';
  const backendContent = fs.readFileSync(backendPath, 'utf8');

  if (backendContent.includes('vendor_ids array')) {
    console.log('  ✅ Backend handles vendor_ids array');
  } else {
    console.log('  ❌ Backend vendor_ids handling NOT found');
  }

  if (backendContent.includes('Converted vendor_ids array to string')) {
    console.log('  ✅ Backend converts vendor_ids to comma-separated string');
  } else {
    console.log('  ❌ Backend conversion logic NOT found');
  }

  // Check 4: Database schema
  console.log('\n✓ Check 4: Database Schema');
  try {
    const pool = new ConnectionPool({
      server: 'SYED-FAZLI-LAPT',
      database: 'InventoryManagementDB',
      authentication: {
        type: 'default'
      },
      options: {
        encrypt: false,
        trustServerCertificate: true,
        instancename: 'SQLEXPRESS'
      }
    });

    await pool.connect();
    
    // Check vendor_ids column
    const result = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'tender_items' 
      AND COLUMN_NAME IN ('vendor_id', 'vendor_ids')
    `);

    if (result.recordset.length === 2) {
      console.log('  ✅ Both vendor_id and vendor_ids columns exist');
      result.recordset.forEach(row => {
        console.log(`     - ${row.COLUMN_NAME} (${row.DATA_TYPE})`);
      });
    } else {
      console.log('  ❌ Missing vendor columns in tender_items table');
    }

    // Check if any annual tenders exist
    const vendorCount = await pool.request().query(`
      SELECT COUNT(*) as count FROM vendors
    `);

    console.log(`  ✅ Database has ${vendorCount.recordset[0].count} vendors available`);

    await pool.close();
  } catch (err) {
    console.log('  ⚠️  Could not verify database schema:', err.message);
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n📝 Ready to Test?\n');
  console.log('1. Make sure both servers are running:');
  console.log('   - Frontend: http://localhost:8080');
  console.log('   - Backend: http://localhost:3001');
  console.log('\n2. Go to: http://localhost:8080/dashboard/annual-tenders/new');
  console.log('\n3. Open browser DevTools (F12) and check Console tab');
  console.log('\n4. Follow VENDOR-SELECTION-TEST-GUIDE.md for detailed steps\n');
}

verify().catch(console.error);
