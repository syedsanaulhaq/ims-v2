const fetch = require('node-fetch');

async function testStockIssuanceAPI() {
  try {
    const requestData = {
      request_number: 'TEST-123',
      request_type: 'Individual',
      requester_office_id: 1,
      requester_wing_id: 1,
      requester_user_id: '4dae06b7-17cd-480b-81eb-da9c76ad5728',
      purpose: 'Test request',
      urgency_level: 'Normal',
      justification: 'Testing API response',
      expected_return_date: null,
      is_returnable: true,
      request_status: 'Submitted'
    };

    console.log('📤 Sending request data:', requestData);

    const response = await fetch('http://localhost:3001/api/stock-issuance/requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });

    const result = await response.json();
    console.log('📥 API Response status:', response.status);
    console.log('📥 API Response:', JSON.stringify(result, null, 2));
    console.log('📥 Response data:', result.data);
    console.log('📥 Response data id:', result.data?.id);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testStockIssuanceAPI();