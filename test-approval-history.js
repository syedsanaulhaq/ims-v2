const fetch = require('node-fetch');

async function testApprovalHistory() {
  try {
    console.log('Testing approval history API...');
    
    // First set session
    const sessionResponse = await fetch('http://localhost:3001/api/dev/set-session/869dd81b-a782-494d-b8c2-695369b5ebb6');
    const sessionData = await sessionResponse.text();
    console.log('Session response:', sessionData);
    
    // Extract cookies from session response
    const cookies = sessionResponse.headers.raw()['set-cookie'];
    console.log('Cookies:', cookies);
    
    // Now test the approval history with cookies
    const historyResponse = await fetch('http://localhost:3001/api/my-approval-history', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies ? cookies.join('; ') : ''
      }
    });
    
    const historyData = await historyResponse.json();
    console.log('History response:', JSON.stringify(historyData, null, 2));
    
  } catch (error) {
    console.error('Error testing API:', error);
  }
}

testApprovalHistory();