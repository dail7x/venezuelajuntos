import { createClient } from "@libsql/client";

// Read from env.local manually for the script
import { readFileSync } from "fs";
import { resolve } from "path";

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
  console.log("No .env.local found or error parsing it");
}

async function runMigration() {
  if (!process.env.DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
    console.error("Missing TURSO credentials in env");
    process.exit(1);
  }

  const client = createClient({
    url: process.env.DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  try {
    console.log("Adding posible_duplicado_de column to personas...");
    await client.execute("ALTER TABLE personas ADD COLUMN posible_duplicado_de TEXT;");
    console.log("Success!");
  } catch (error: any) {
    if (error.message && error.message.includes("duplicate column name")) {
       console.log("Column posible_duplicado_de already exists.");
    } else {
       console.error("Error adding column:", error);
    }
  }
}

runMigration();
