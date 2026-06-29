const crypto = require('crypto');
const jose = require('jose');

async function main() {
  const { publicKey, privateKey } = await jose.generateKeyPair('EdDSA');

  const pubSpki = await jose.exportSPKI(publicKey);
  
  console.log("PUBLIC_KEY:");
  console.log(pubSpki);

  const jwt = await new jose.SignJWT({ a: "ro" }) // or rw? Wait, Turso uses something else. Actually, just an empty payload or anything is fine if sqld accepts it? sqld doesn't strictly check payload unless configured? Wait, for read-write we usually don't need a specific payload unless sqld enforces it, but I will just use { }? Or no, sqld requires something? I'll just use { a: "ro" }? No, I need full access. Turso uses `id` etc. Let's just create a generic JWT without specific claims, or `{ "a": "rw" }`? Wait, I'll just do `{}`. Wait, let's look up sqld auth payload. It is usually `{ "id": "default", "a": "rw" }` or similar. I'll just put `{"id": "user"}`.
  
  const token = await new jose.SignJWT({ a: "rw" })
    .setProtectedHeader({ alg: 'EdDSA' })
    .setIssuedAt()
    .setExpirationTime('10y')
    .sign(privateKey);

  console.log("\nTOKEN:");
  console.log(token);
}
main();
