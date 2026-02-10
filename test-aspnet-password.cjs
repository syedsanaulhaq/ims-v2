// Test ASP.NET Identity password validation directly
// Run with: node test-aspnet-password.cjs

const aspnetIdentity = require('aspnet-identity-pw');

// The exact hash from database
const hash = 'AQAAAAEAACcQAAAAELIMrfMcvIr1nnDmLUCHwqLBIGBYant+Qo2sWWvwCN38eL0+0+3z0vFqGPJwT4TI/w==';
const password = 'P@ssword@1';

console.log('Testing ASP.NET Identity Password Validation');
console.log('===========================================');
console.log('Password:', password);
console.log('Hash:', hash);
console.log('Hash length:', hash.length);
console.log('');

try {
  const result = aspnetIdentity.validatePassword(password, hash);
  console.log('✅ Validation result:', result);
  
  if (result) {
    console.log('✅ PASSWORD MATCHES!');
  } else {
    console.log('❌ PASSWORD DOES NOT MATCH');
    console.log('');
    console.log('This could mean:');
    console.log('1. The password is incorrect');
    console.log('2. The library has a bug');
    console.log('3. The hash format is incompatible');
  }
} catch (error) {
  console.error('❌ Error during validation:', error.message);
  console.error('Stack:', error.stack);
}

console.log('');
console.log('Package info:');
const pkg = require('./package.json');
console.log('aspnet-identity-pw version:', pkg.dependencies['aspnet-identity-pw']);
