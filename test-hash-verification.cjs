// Test ASP.NET Identity hash verification
const aspnetHasher = require('./server/utils/aspnetPasswordHasher.cjs');

const passwordHash = 'AQAAAAEAACcQAAAAEJn1haHh16bDsTtjtDMMLs4sp7GYbCeDQDWi64GwbipkC6r2fVdMfuKfCKGF++P7Xw==';

const testPasswords = [
  'P@ssword@1',
  'Password@1',
  'P@ssw0rd@1',
  '123456',
  'password',
  'admin',
  'Admin@123'
];

console.log('Testing password hash verification...\n');
console.log('Hash:', passwordHash);
console.log('Hash length:', passwordHash.length);
console.log('\n');

testPasswords.forEach(password => {
  console.log(`Testing password: "${password}"`);
  try {
    const result = aspnetHasher.verifyPassword(password, passwordHash);
    console.log(`   Result: ${result ? '✅ MATCH' : '❌ NO MATCH'}`);
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }
  console.log('');
});
