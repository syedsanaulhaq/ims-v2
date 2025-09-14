// Simple API Test Script
// This tests the invmisApi service directly from the frontend

import { invmisApi } from './src/services/invmisApi.js';

console.log('🧪 Testing InvMIS API Integration...');
console.log('API Base URL:', 'http://localhost:5000/api');

async function testInvMISApis() {
  const tests = [
    {
      name: 'Dashboard Summary',
      test: () => invmisApi.dashboard.getSummary(),
    },
    {
      name: 'Get All Users',
      test: () => invmisApi.users.getAll(),
    },
    {
      name: 'Get All Offices',
      test: () => invmisApi.offices.getAll(),
    },
    {
      name: 'Get All Categories',
      test: () => invmisApi.categories.getAll(),
    },
    {
      name: 'Get All Items',
      test: () => invmisApi.items.getAll(),
    },
    {
      name: 'Get Current Stock',
      test: () => invmisApi.stock.getCurrent(),
    },
    {
      name: 'Get Tender Awards',
      test: () => invmisApi.tenders.getAwards(),
    },
    {
      name: 'Get All Deliveries',
      test: () => invmisApi.deliveries.getAll(),
    },
  ];

  const results = [];

  for (const { name, test } of tests) {
    try {
      console.log(`\n🔄 Testing: ${name}`);
      
      const startTime = Date.now();
      const result = await test();
      const duration = Date.now() - startTime;
      
      if (result && result.success !== false) {
        console.log(`✅ ${name} - Success (${duration}ms)`);
        console.log(`   Data type: ${typeof result}`);
        if (result.success) {
          console.log(`   Response: success=${result.success}`);
        }
        results.push({ name, status: 'success', duration, result });
      } else {
        console.log(`❌ ${name} - Failed`);
        console.log(`   Error:`, result);
        results.push({ name, status: 'failed', error: result });
      }
    } catch (error) {
      console.log(`💥 ${name} - Exception`);
      console.log(`   Error: ${error.message}`);
      results.push({ name, status: 'exception', error: error.message });
    }
    
    // Wait between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n📊 TEST RESULTS SUMMARY');
  console.log('=' .repeat(50));
  
  const successful = results.filter(r => r.status === 'success').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const exceptions = results.filter(r => r.status === 'exception').length;
  
  console.log(`✅ Successful: ${successful}/${results.length}`);
  console.log(`❌ Failed: ${failed}/${results.length}`);
  console.log(`💥 Exceptions: ${exceptions}/${results.length}`);
  
  const successRate = Math.round((successful / results.length) * 100);
  console.log(`🎯 Success Rate: ${successRate}%`);
  
  if (successful === results.length) {
    console.log('\n🎉 All APIs are working correctly!');
  } else {
    console.log('\n⚠️  Some APIs need attention:');
    results.filter(r => r.status !== 'success').forEach(r => {
      console.log(`   • ${r.name}: ${r.error || 'Unknown error'}`);
    });
  }
  
  return results;
}

// Export for browser console use
window.testInvMISApis = testInvMISApis;
console.log('💡 Open browser console and run: testInvMISApis()');