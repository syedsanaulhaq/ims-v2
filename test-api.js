// Quick API connectivity test
console.log('🧪 Testing API Connectivity...');

const API_BASE = 'http://localhost:3001/api';

// Test all endpoints
async function testAPIs() {
  const tests = [
    { name: 'Item Masters', endpoint: '/item-masters' },
    { name: 'Categories', endpoint: '/categories' },
    { name: 'Sub-Categories', endpoint: '/sub-categories' },
    { name: 'Session', endpoint: '/session' }
  ];

  console.log('\n📊 API Test Results:');
  console.log('==================');

  for (const test of tests) {
    try {
      const response = await fetch(`${API_BASE}${test.endpoint}`);
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ ${test.name}: OK (${Array.isArray(data) ? data.length : 'object'} items)`);
      } else {
        console.log(`❌ ${test.name}: HTTP ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ ${test.name}: ${error.message}`);
    }
  }
  
  console.log('\n🔧 If any tests fail:');
  console.log('1. Check backend server is running on port 3001');
  console.log('2. Try hard refresh (Ctrl+Shift+R)');
  console.log('3. Check browser network tab for CORS errors');
}

// Run test
testAPIs();