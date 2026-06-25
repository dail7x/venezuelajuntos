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
  } catch (err) {
    console.error("Error loading env:", err);
  }
}

loadLocalEnv();

const url = process.env.DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error("DATABASE_URL and TURSO_AUTH_TOKEN are required");
  process.exit(1);
}

const client = createClient({ url, authToken });

async function run() {
  try {
    const res = await client.execute("SELECT status, count(*) as count FROM persons WHERE is_deleted = 0 GROUP BY status");
    console.log("Database connection successful!");
    console.log("Persons status breakdown:");
    console.table(res.rows);
  } catch (err) {
    console.error("Database query failed:", err);
  } finally {
    process.exit(0);
  }
}

run();
