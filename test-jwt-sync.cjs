const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '.env.sqlserver' });

const JWT_SECRET = process.env.JWT_SECRET;

console.log('Testing JWT Secret Synchronization');
console.log('====================================');
console.log('IMS JWT_SECRET:', JWT_SECRET);
console.log('');

// Simulate DS generating a token
const testToken = jwt.sign(
  { 
    sub: "test-user-id-123", 
    unique_name: "testuser",
    full_name: "Test User",
    email: "test@example.com",
    role: "Admin"
  },
  JWT_SECRET,
  { 
    issuer: 'DigitalSystem', 
    audience: 'IMS', 
    expiresIn: '24h' 
  }
);

console.log('Generated Token (first 50 chars):', testToken.substring(0, 50) + '...');
console.log('');

// Simulate IMS validating the token
try {
  const decoded = jwt.verify(testToken, JWT_SECRET, {
    issuer: 'DigitalSystem',
    audience: 'IMS'
  });
  
  console.log('✅ SUCCESS! Token validation passed');
  console.log('User ID:', decoded.sub);
  console.log('Username:', decoded.unique_name);
  console.log('Full Name:', decoded.full_name);
  console.log('Email:', decoded.email);
  console.log('Role:', decoded.role);
  console.log('');
  console.log('🎉 JWT configuration is correct! SSO will work.');
  console.log('');
  console.log('Next Steps:');
  console.log('1. Share JWT-IMPLEMENTATION-GUIDE.md with DS team');
  console.log('2. DS team implements JWT token generation');
  console.log('3. Test end-to-end SSO flow');
  
} catch (error) {
  console.log('❌ FAILURE! Token validation failed');
  console.log('Error:', error.message);
  console.log('');
  console.log('⚠️ Check that JWT_SECRET matches in both systems!');
}
