const axios = require('axios');

// ========================================
// API ENDPOINT TEST SUITE
// ========================================

const BASE_URL = 'http://localhost:3001';

// Helper function to make API calls
async function callAPI(method, endpoint, data = null) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: { 'Content-Type': 'application/json' },
      data
    };
    const response = await axios(config);
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data || error.message,
      status: error.response?.status
    };
  }
}

// Test data
const testData = {
  stock_issuance_request_id: '00000000-0000-0000-0000-000000000001', // Example UUID
  stock_issuance_item_id: '00000000-0000-0000-0000-000000000002',
  item_master_id: '00000000-0000-0000-0000-000000000003',
  quantity: 10,
  wing_id: 1,
  issued_by: 'Test User',
  verification_result: 'available',
  available_quantity: 10,
  verification_notes: 'Inventory verified and available',
  verified_by: 'Test Verifier',
  finalized_by: 'Test Admin'
};

// Main test runner
async function runTests() {
  console.log('🧪 ISSUANCE WORKFLOW API TEST SUITE\n');
  console.log('=' .repeat(60));

  // Test 1: Determine issuance source
  console.log('\n📌 TEST 1: Determine Issuance Source');
  console.log('-'.repeat(60));
  const determineTest = await callAPI('POST', '/api/issuance/determine-source', {
    item_master_id: testData.item_master_id,
    required_quantity: testData.quantity
  });
  console.log(JSON.stringify(determineTest, null, 2));

  // Test 2: Issue from wing store
  console.log('\n📌 TEST 2: Issue From Wing Store');
  console.log('-'.repeat(60));
  const wingIssueTest = await callAPI('POST', '/api/issuance/issue-from-wing', {
    stock_issuance_item_id: testData.stock_issuance_item_id,
    stock_issuance_request_id: testData.stock_issuance_request_id,
    item_master_id: testData.item_master_id,
    quantity: testData.quantity,
    wing_id: testData.wing_id,
    issued_by: testData.issued_by
  });
  console.log(JSON.stringify(wingIssueTest, null, 2));

  // Test 3: Issue from admin store
  console.log('\n📌 TEST 3: Issue From Admin Store');
  console.log('-'.repeat(60));
  const adminIssueTest = await callAPI('POST', '/api/issuance/issue-from-admin', {
    stock_issuance_item_id: testData.stock_issuance_item_id,
    stock_issuance_request_id: testData.stock_issuance_request_id,
    item_master_id: testData.item_master_id,
    quantity: testData.quantity,
    issued_by: testData.issued_by
  });
  console.log(JSON.stringify(adminIssueTest, null, 2));

  // Test 4: Handle verification result
  console.log('\n📌 TEST 4: Handle Verification Result');
  console.log('-'.repeat(60));
  const verificationTest = await callAPI('POST', '/api/issuance/handle-verification-result', {
    stock_issuance_item_id: testData.stock_issuance_item_id,
    verification_result: testData.verification_result,
    available_quantity: testData.available_quantity,
    verification_notes: testData.verification_notes,
    verified_by: testData.verified_by
  });
  console.log(JSON.stringify(verificationTest, null, 2));

  // Test 5: Finalize issuance
  console.log('\n📌 TEST 5: Finalize Issuance');
  console.log('-'.repeat(60));
  const finalizeTest = await callAPI('POST', '/api/issuance/finalize', {
    stock_issuance_request_id: testData.stock_issuance_request_id,
    finalized_by: testData.finalized_by
  });
  console.log(JSON.stringify(finalizeTest, null, 2));

  // Test 6: Get issuance status
  console.log('\n📌 TEST 6: Get Issuance Status');
  console.log('-'.repeat(60));
  const statusTest = await callAPI('GET', `/api/issuance/status/${testData.stock_issuance_request_id}`);
  console.log(JSON.stringify(statusTest, null, 2));

  console.log('\n' + '='.repeat(60));
  console.log('✅ TEST SUITE COMPLETE\n');

  // Summary
  const allTests = [
    { name: 'Determine Source', result: determineTest },
    { name: 'Wing Store Issue', result: wingIssueTest },
    { name: 'Admin Store Issue', result: adminIssueTest },
    { name: 'Verification Result', result: verificationTest },
    { name: 'Finalize Issuance', result: finalizeTest },
    { name: 'Get Status', result: statusTest }
  ];

  const passed = allTests.filter(t => t.result.success).length;
  const total = allTests.length;

  console.log(`📊 RESULTS: ${passed}/${total} tests passed\n`);

  allTests.forEach(test => {
    const status = test.result.success ? '✅' : '❌';
    console.log(`${status} ${test.name}`);
  });

  console.log('\n');
}

// Run tests
runTests().catch(error => {
  console.error('Test suite error:', error);
  process.exit(1);
});
