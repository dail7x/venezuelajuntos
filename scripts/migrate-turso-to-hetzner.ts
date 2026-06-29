import { createClient } from "@libsql/client";

async function main() {
  const tursoUrl = 'libsql://venezuelajuntos-dail7x.aws-us-east-2.turso.io';
  const tursoAuth = 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODIzNjc1ODQsImlkIjoiMDE5ZWZkNjItZTEwMS03Y2E3LWE5NmUtOWE3N2QwZmZiZGMzIiwicmlkIjoiYjQ4NDZmYjUtNDEwYS00MzI1LTkwODEtZTQ0ZWIxMGNlNGEwIn0.6ksJDCYQ4iN5NLl6_pgg3vY3QIpxmbBcWgIludA5iALZyDQ69DdfvivBIus0M92MMBH2SnTZBOCUPeypgsvlBg';
  
  const hetznerUrl = 'http://116.203.118.1:8081';
  const hetznerAuth = 'eyJhbGciOiJFZERTQSJ9.eyJhIjoicnciLCJpYXQiOjE3ODI0OTUwNjIsImV4cCI6MjA5ODA3MTA2Mn0.GNSZDmPEnD2oO0yMxrltej23G664UQb9Vx5BZKBH8WqVARYIJwQl_t0tqnQ_E5NuaSvbii5Sd1K5tIve4RKdDQ';

  const turso = createClient({ url: tursoUrl, authToken: tursoAuth });
  const hetzner = createClient({ url: hetznerUrl, authToken: hetznerAuth });

  const tables = ["personas", "notas_persona"];
  
  console.log("Clearing Hetzner notas_persona...");
  await hetzner.execute(`DELETE FROM notas_persona`);
  console.log("Clearing Hetzner personas...");
  await hetzner.execute(`DELETE FROM personas`);

  for (const table of tables) {
    console.log(`Fetching from Turso: ${table}...`);
    const res = await turso.execute(`SELECT * FROM ${table}`);
    console.log(`Found ${res.rows.length} rows.`);

    if (res.rows.length === 0) continue;

    const columns = Object.keys(res.rows[0]);
    const placeholders = columns.map(() => "?").join(", ");

    const batchSize = 100;
    console.log(`Inserting into Hetzner in batches of ${batchSize}...`);
    for (let i = 0; i < res.rows.length; i += batchSize) {
      const batch = res.rows.slice(i, i + batchSize);
      const statements = batch.map(row => ({
        sql: `INSERT OR REPLACE INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`,
        args: columns.map(col => row[col])
      }));
      await hetzner.batch(statements, "write");
      if (i % 1000 === 0 && i > 0) console.log(`  Inserted ${i} rows...`);
    }
    console.log(`Finished ${table}!`);
  }
  console.log("ALL DONE!");
}

main().catch(console.error);
