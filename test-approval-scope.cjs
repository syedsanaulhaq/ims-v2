const http = require('http');

const apiUrl = 'http://localhost:3001';
const userId = '4dae06b7-17cd-480b-81eb-da9c76ad5728'; // Muhammad Ehtesham Siddiqui

async function testApprovalEndpoints() {
  try {
    // Test 1: Get approvals via /api/approvals/my-approvals
    console.log('\n=== Testing /api/approvals/my-approvals ===');
    const myApprovalsRes = await fetch(`${apiUrl}/api/approvals/my-approvals?userId=${userId}&status=pending`, {
      credentials: 'include'
    });
    const myApprovalsData = await myApprovalsRes.json();
    console.log('Response from /api/approvals/my-approvals:');
    console.log(JSON.stringify(myApprovalsData, null, 2));
    
    if (myApprovalsData.data && myApprovalsData.data.length > 0) {
      const firstApproval = myApprovalsData.data[0];
      console.log('\n✅ First approval has scope_type?', firstApproval.scope_type);
      console.log('   Value:', firstApproval.scope_type);
      
      // Test 2: Get full details
      console.log(`\n=== Testing /api/approvals/${firstApproval.id} ===`);
      const detailRes = await fetch(`${apiUrl}/api/approvals/${firstApproval.id}`, {
        credentials: 'include'
      });
      const detailData = await detailRes.json();
      const approval = detailData.data || detailData;
      console.log('Full approval object:');
      console.log(JSON.stringify(approval, null, 2));
      console.log('\n✅ Full approval has scope_type?', approval.scope_type);
      console.log('   Value:', approval.scope_type);
    } else {
      console.log('❌ No approvals found');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testApprovalEndpoints();
