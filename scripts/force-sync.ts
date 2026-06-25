import { config } from "dotenv";
config({ path: ".env.local" });

async function runForceSync() {
  console.log("Forzando sincronización de la API externa...");
  
  const token = process.env.CRON_SECRET;
  
  if (!token) {
    console.error("Falta CRON_SECRET en el .env.local");
    process.exit(1);
  }

  // Assuming local server is running on 3000, or we target production
  // We'll target the local server, but if they want to hit prod they can change the URL
  const targetUrl = process.argv.includes("--prod") 
    ? "https://venezuelajuntos.com/api/cron/sync-external" 
    : "http://localhost:3000/api/cron/sync-external";

  console.log(`Realizando petición a: ${targetUrl}`);
  
  try {
    const res = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    if (!res.ok) {
      console.error(`Error de la API local: ${res.status} ${res.statusText}`);
      console.error(await res.text());
      return;
    }

    const data = await res.json();
    console.log("Sincronización exitosa:", data);
  } catch (err) {
    console.error("Error forzando sync:", err);
    console.log("Asegúrate de que el servidor local está corriendo si no usaste --prod");
  }
}

runForceSync();
