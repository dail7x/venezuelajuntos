import { createClient } from "@libsql/client";
import * as fs from "node:fs";
import * as path from "node:path";
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
  } catch {
    // CI/prod can provide env vars directly.
  }
}

function splitSql(sql) {
  return sql
    .split(/;\s*(?:\n|$)/)
    .map((statement) => statement.trim())
    .filter(Boolean);
}

loadLocalEnv();

const url = process.env.DATABASE_URL;

if (!url) {
  throw new Error("DATABASE_URL is required");
}

let client;
if (url.startsWith("file:")) {
  const filePath = url.replace("file:", "");
  const dir = path.dirname(filePath);
  if (dir && !fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  client = createClient({ url });
} else {
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!authToken) {
    throw new Error("TURSO_AUTH_TOKEN is required for remote database");
  }
  client = createClient({ url, authToken });
}
const schema = readFileSync(resolve(process.cwd(), "drizzle/schema.sql"), "utf8");

for (const statement of splitSql(schema)) {
  await client.execute(statement);
}

console.log("Turso schema initialized");
