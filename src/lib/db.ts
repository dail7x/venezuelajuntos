import { createClient } from "@libsql/client";

export function hasDatabaseEnv() {
  const url = process.env.DATABASE_URL;
  if (!url) return false;
  if (url.startsWith("file:")) return true;
  return Boolean(process.env.TURSO_AUTH_TOKEN);
}

export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("Missing DATABASE_URL");
  }

  if (url.startsWith("file:")) {
    // Ensure directory exists in Node.js environments
    if (typeof window === 'undefined') {
      const fs = require("fs");
      const path = require("path");
      const filePath = url.replace("file:", "");
      const dir = path.dirname(filePath);
      if (dir && !fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
    return createClient({ url });
  }

  if (!process.env.TURSO_AUTH_TOKEN) {
    throw new Error("Missing TURSO_AUTH_TOKEN for remote database");
  }

  return createClient({
    url,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
}
