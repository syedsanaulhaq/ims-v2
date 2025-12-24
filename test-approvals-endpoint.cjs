const axios = require('axios');

async function testApprovalsEndpoint() {
  try {
    console.log('Testing /api/approvals/my-approvals endpoint...');

    // First, let's try to get the dashboard stats
    const dashboardResponse = await axios.get('http://localhost:3001/api/approvals/dashboard', {
      withCredentials: true,
      headers: {
        'Cookie': 'session=test-session' // This won't work without a real session
      }
    });

    console.log('Dashboard response:', dashboardResponse.data);

  } catch (error) {
    console.log('Error testing endpoint:', error.response?.status, error.response?.data || error.message);
  }
}

testApprovalsEndpoint();