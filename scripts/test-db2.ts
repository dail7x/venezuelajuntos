import { createClient } from "@libsql/client";
async function run() {
  const db = createClient({
    url: 'http://116.203.118.1:8081',
    authToken: 'eyJhbGciOiJFZERTQSJ9.eyJhIjoicnciLCJpYXQiOjE3ODI0OTUwNjIsImV4cCI6MjA5ODA3MTA2Mn0.GNSZDmPEnD2oO0yMxrltej23G664UQb9Vx5BZKBH8WqVARYIJwQl_t0tqnQ_E5NuaSvbii5Sd1K5tIve4RKdDQ'
  });
  const res = await db.execute("SELECT estado_actual, count(*) FROM personas GROUP BY estado_actual");
  console.log(res.rows);
}
run();
