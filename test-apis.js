// API Testing Script for InvMISDB Integration
// This script tests all major API endpoints to ensure they work correctly

const API_BASE = 'http://localhost:5000/api';

async function testApiEndpoint(endpoint, description) {
  try {
    console.log(`\n🧪 Testing: ${description}`);
    console.log(`📡 GET ${API_BASE}${endpoint}`);
    
    const response = await fetch(`${API_BASE}${endpoint}`);
    const data = await response.json();
    
    if (response.ok) {
      console.log(`✅ SUCCESS: ${response.status}`);
      console.log(`📊 Data sample:`, JSON.stringify(data, null, 2).substring(0, 200) + '...');
      return { success: true, data };
    } else {
      console.log(`❌ FAILED: ${response.status}`);
      console.log(`📋 Error:`, data);
      return { success: false, error: data };
    }
  } catch (error) {
    console.log(`💥 NETWORK ERROR:`, error.message);
    return { success: false, error: error.message };
  }
}

async function runApiTests() {
  console.log('🚀 InvMISDB API Integration Tests');
  console.log('=' .repeat(50));
  
  const tests = [
    { endpoint: '/users', description: 'Get all users from AspNetUsers table' },
    { endpoint: '/offices', description: 'Get all offices from organization structure' },
    { endpoint: '/wings', description: 'Get all wings/departments' },
    { endpoint: '/categories', description: 'Get all categories and subcategories' },
    { endpoint: '/items', description: 'Get all item master data' },
    { endpoint: '/current-stock', description: 'Get current stock levels' },
    { endpoint: '/tender-awards', description: 'Get all tender awards' },
    { endpoint: '/deliveries', description: 'Get all deliveries' },
    { endpoint: '/dashboard/summary', description: 'Get dashboard summary data' },
  ];
  
  const results = [];
  
  for (const test of tests) {
    const result = await testApiEndpoint(test.endpoint, test.description);
    results.push({ ...test, ...result });
    
    // Wait a bit between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n📋 TEST SUMMARY');
  console.log('=' .repeat(50));
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`✅ Passed: ${passed}/${results.length}`);
  console.log(`❌ Failed: ${failed}/${results.length}`);
  
  if (failed > 0) {
    console.log('\n💥 Failed Tests:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`   • ${r.endpoint}: ${r.error}`);
    });
  }
  
  console.log(`\n🎯 Success Rate: ${Math.round((passed / results.length) * 100)}%`);
}

// Run the tests if this file is executed directly
if (typeof window !== 'undefined') {
  // Browser environment
  window.testInvMISApis = runApiTests;
  console.log('💡 Run window.testInvMISApis() to test all API endpoints');
} else {
  // Node.js environment
  runApiTests().catch(console.error);
}