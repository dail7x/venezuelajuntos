import { getPublicCasesFromDb } from "../src/lib/cases-db";
async function run() {
  try {
    const data = await getPublicCasesFromDb(1, 10, "", "", "missing");
    console.log("Returned:", data.items.length, "items");
  } catch (err: any) {
    console.error("SQL Error:", err.message);
  }
}
run();
