const crypto = require('crypto');
const { generateKeyPairSync } = crypto;

const { privateKey, publicKey } = generateKeyPairSync('ed25519');
const privPem = privateKey.export({ type: 'pkcs8', format: 'pem' });
const pubPem = publicKey.export({ type: 'spki', format: 'pem' });

console.log("PRIVATE_KEY:");
console.log(privPem);
console.log("\nPUBLIC_KEY:");
console.log(pubPem);
