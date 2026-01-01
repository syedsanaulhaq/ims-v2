const http = require('http');

// Test the /api/wing-request-history endpoint with the actual user
const userId = '9A4D3ACA-7A4F-4342-A431-267DA1171244';

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/wing-request-history',
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
    console.log('Response Status:', res.statusCode);
    try {
      const parsed = JSON.parse(data);
      console.log('\nResponse:');
      console.log(JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('Error:', error.message);
  console.error('Make sure the server is running on port 3001');
});

req.end();
