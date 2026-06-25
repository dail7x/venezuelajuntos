import { createClient } from "@libsql/client";

export function hasDatabaseEnv() {
  return Boolean(process.env.DATABASE_URL && process.env.TURSO_AUTH_TOKEN);
}

export function getDb() {
  if (!process.env.DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
    throw new Error("Missing Turso environment variables");
  }

  return createClient({
    url: process.env.DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
}
