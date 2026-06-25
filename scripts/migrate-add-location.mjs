import { createClient } from "@libsql/client";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadLocalEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  try {
    const contents = readFileSync(envPath, "utf8");
    for (const line of contents.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*['"]?(.+?)['"]?\s*$/);
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
    }
  } catch {}
}

loadLocalEnv();
const url = process.env.DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

const client = createClient({ url, authToken });

async function migrate() {
  try {
    await client.execute("ALTER TABLE persons ADD COLUMN location_zone TEXT;");
    console.log("Added location_zone");
  } catch (e) {
    console.log("location_zone might already exist:", e.message);
  }
  
  try {
    await client.execute("ALTER TABLE persons ADD COLUMN location_normalized TEXT;");
    console.log("Added location_normalized");
  } catch (e) {
    console.log("location_normalized might already exist:", e.message);
  }
}

migrate();
