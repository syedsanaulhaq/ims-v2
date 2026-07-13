const bcrypt = require('bcryptjs');

// Sample password hash from your database
const samplePasswordHash = "AQAAAAEAACcQAAAAEEFh19kjhz+YptKqapkq5LTVI9Ynr08quBdl1FqJ9oMyNdsfId+KaZsjojnEzlroRg==";

// Test with bcrypt to show it fails
async function testCurrentMethod() {
  try {
    const testPassword = "TestPassword123";
    const result = await bcrypt.compare(testPassword, samplePasswordHash);
    } catch (error) {
    }
  
  }

testCurrentMethod();
