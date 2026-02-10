// Manually decode and inspect the hash structure
const hash = 'AQAAAAEAACcQAAAAELIMrfMcvIr1nnDmLUCHwqLBIGBYant+Qo2sWWvwCN38eL0+0+3z0vFqGPJwT4TI/w==';
const buffer = Buffer.from(hash, 'base64');

console.log('Raw hash inspection:');
console.log('Total length:', buffer.length, 'bytes');
console.log('');

console.log('Hex dump (first 30 bytes):');
for (let i = 0; i < Math.min(30, buffer.length); i++) {
  process.stdout.write(`${buffer[i].toString(16).padStart(2, '0')} `);
  if ((i + 1) % 16 === 0) console.log('');
}
console.log('\n');

console.log('Byte-by-byte interpretation:');
console.log(`Byte 0: 0x${buffer[0].toString(16)} (format marker)`);
console.log(`Bytes 1-4 (LE): 0x${buffer.readUInt32LE(1).toString(16)} = ${buffer.readUInt32LE(1)}`);
console.log(`Bytes 1-4 (BE): 0x${buffer.readUInt32BE(1).toString(16)} = ${buffer.readUInt32BE(1)}`);
console.log(`Bytes 5-8 (LE): 0x${buffer.readUInt32LE(5).toString(16)} = ${buffer.readUInt32LE(5)}`);
console.log(`Bytes 5-8 (BE): 0x${buffer.readUInt32BE(5).toString(16)} = ${buffer.readUInt32BE(5)}`);
console.log(`Bytes 9-12 (LE): 0x${buffer.readUInt32LE(9).toString(16)} = ${buffer.readUInt32LE(9)}`);
console.log(`Bytes 9-12 (BE): 0x${buffer.readUInt32BE(9).toString(16)} = ${buffer.readUInt32BE(9)}`);

console.log('');
console.log('Expected format for ASP.NET Identity V3:');
console.log('- Byte 0: Format marker (0x01)');
console.log('- Bytes 1-4: PRF (0x00000000 or 0x00000001 for SHA256)');
console.log('- Bytes 5-8: Iteration count (typically 10000)');
console.log('- Bytes 9-12: Salt size (typically 16)');
console.log('- Bytes 13+: Salt + Subkey');
