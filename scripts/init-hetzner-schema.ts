import { createClient } from "@libsql/client";
import { readFileSync } from "fs";
import { resolve } from "path";

async function run() {
  const hetzner = createClient({
    url: 'http://116.203.118.1:8081',
    authToken: 'eyJhbGciOiJFZERTQSJ9.eyJhIjoicnciLCJpYXQiOjE3ODI0OTUwNjIsImV4cCI6MjA5ODA3MTA2Mn0.GNSZDmPEnD2oO0yMxrltej23G664UQb9Vx5BZKBH8WqVARYIJwQl_t0tqnQ_E5NuaSvbii5Sd1K5tIve4RKdDQ'
  });

  console.log("Applying Spanish schema to Hetzner...");
  const schema = readFileSync(resolve(process.cwd(), "drizzle/schema.sql"), "utf8");
  for (const statement of schema.split(/;\s*(?:\n|$)/).map(s => s.trim()).filter(Boolean)) {
    try {
      await hetzner.execute(statement);
    } catch (e: any) {
      console.error("Error executing statement:", statement.slice(0, 50) + "...");
      console.error(e.message);
    }
  }
  console.log("Schema applied successfully on Hetzner!");
}

run().catch(console.error);
