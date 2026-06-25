import { POST } from "../src/app/api/cron/update-status/route";

async function main() {
  console.log("Running Update Status POST...");
  const res = await POST(new Request("http://localhost/api", { 
    headers: { authorization: "Bearer a09ceb1c88434941868d0bf3f6da7249" }
  }));
  const text = await res.text();
  console.log("Result:", text);
}

main().catch(console.error);
