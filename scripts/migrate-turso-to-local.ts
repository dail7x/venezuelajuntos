import { createClient } from "@libsql/client";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";

function loadLocalEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  try {
    const contents = readFileSync(envPath, "utf8");
    for (const line of contents.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*['"]?(.+?)['"]?\s*$/);
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
    }
  } catch {
    // ignore
  }
}

async function migrate() {
  loadLocalEnv();
  
  const tursoUrl = process.env.DATABASE_URL;
  const tursoAuth = process.env.TURSO_AUTH_TOKEN;
  
  if (!tursoUrl || !tursoAuth) {
    throw new Error("Missing Turso env vars");
  }
  
  const localUrl = "file:data.db";
  
  console.log("Connecting to Turso...");
  const turso = createClient({ url: tursoUrl, authToken: tursoAuth });
  
  console.log("Connecting to Local SQLite...");
  const local = createClient({ url: localUrl });
  
  // Create tables locally using init script schema
  console.log("Initializing local schema...");
  const schema = readFileSync(resolve(process.cwd(), "drizzle/schema.sql"), "utf8");
  for (const statement of schema.split(/;\s*(?:\n|$)/).map(s => s.trim()).filter(Boolean)) {
    await local.execute(statement);
  }
  
  // List of tables to migrate
  const tables = ["personas", "notas_persona"];
  
  for (const table of tables) {
    console.log(`Migrating table ${table}...`);
    const res = await turso.execute(`SELECT * FROM ${table}`);
    console.log(`Found ${res.rows.length} rows in ${table}`);
    
    if (res.rows.length === 0) continue;
    
    // Get column names
    const columns = Object.keys(res.rows[0]);
    const placeholders = columns.map(() => "?").join(", ");
    
    // Insert in batches of 100
    const batchSize = 100;
    for (let i = 0; i < res.rows.length; i += batchSize) {
      const batch = res.rows.slice(i, i + batchSize);
      const statements = batch.map(row => {
        return {
          sql: `INSERT OR REPLACE INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`,
          args: columns.map(col => row[col])
        };
      });
      
      await local.batch(statements);
    }
    console.log(`Migrated ${table} successfully!`);
  }
  
  console.log("Migration complete!");
}

migrate().catch(console.error);
