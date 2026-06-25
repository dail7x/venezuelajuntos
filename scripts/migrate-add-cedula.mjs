import { createClient } from "@libsql/client";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const envLocalPath = resolve(process.cwd(), ".env.local");
try {
  const envFile = readFileSync(envLocalPath, "utf-8");
  envFile.split("\n").forEach((line) => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1];
      const val = match[2].replace(/^['"]|['"]$/g, "");
      process.env[key] = val;
    }
  });
} catch (e) {
  console.log("No .env.local found");
}

async function runMigration() {
  const url = process.env.DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url || !authToken) {
    console.error("Missing TURSO credentials");
    process.exit(1);
  }

  const client = createClient({ url, authToken });

  try {
    console.log("Adding cedula_identidad to persons...");
    await client.execute("ALTER TABLE persons ADD COLUMN cedula_identidad INTEGER;");
    console.log("Success!");
  } catch (error) {
    if (error.message && error.message.includes("duplicate column name")) {
       console.log("Column cedula_identidad already exists.");
    } else {
       console.error("Error adding column:", error);
    }
  }
}

runMigration();
