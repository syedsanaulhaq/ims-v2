const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/my-approval-history',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log('✅ API Response:');
      console.log('  Success:', parsed.success);
      console.log('  Total:', parsed.total);
      console.log('  Requests count:', parsed.requests?.length);
      
      if (parsed.requests && parsed.requests.length > 0) {
        console.log('\n📋 First Request:');
        const first = parsed.requests[0];
        console.log('  ID:', first.id?.substring(0, 8) + '...');
        console.log('  Title:', first.title);
        console.log('  Status:', first.final_status);
        console.log('  My Action:', first.my_action);
        console.log('  Total Items:', first.total_items);
      } else {
        console.log('❌ No requests found in response');
      }
    } catch (err) {
      console.error('❌ Error parsing response:', err.message);
      console.log('Raw response:', data.substring(0, 500));
    }
  });
});

req.on('error', (err) => {
  console.error('❌ Request error:', err.message);
});

req.end();
