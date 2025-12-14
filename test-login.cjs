// Test login endpoint
const testLogin = async () => {
  try {
    console.log('\n🔐 Testing login for user: 3730207514595\n');
    
    const response = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: '3730207514595',
        password: 'P@sword@1'
      })
    });
    
    const data = await response.json();
    
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    if (response.ok) {
      console.log('\n✅ Login successful!');
      console.log('User:', data.user);
    } else {
      console.log('\n❌ Login failed');
      console.log('Error:', data.error);
    }
  } catch (error) {
    console.error('❌ Request error:', error.message);
  }
};

testLogin();
