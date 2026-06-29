import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
puppeteer.use(StealthPlugin());

const db = createClient({
  url: process.env.DATABASE_URL as string,
  authToken: process.env.TURSO_AUTH_TOKEN as string,
});

async function syncWithPuppeteer() {
  console.log("Launching Puppeteer...");
  const browser = await puppeteer.launch({ 
    headless: "new" as any,
    dumpio: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });
  const page = await browser.newPage();
  
  // Navigate to the main site first to get cookies and pass any Cloudflare checks
  console.log("Navigating to main site to acquire cookies/tokens...");
  await page.goto("https://desaparecidosterremotovenezuela.com/", { waitUntil: "networkidle2" });
  
  // Wait a moment for any background challenges
  await new Promise(r => setTimeout(r, 2000));
  
  console.log("Fetching data from API...");
  // Now navigate directly to the API endpoint or fetch it from within the page context
  const data = await page.evaluate(async () => {
    try {
      const res = await fetch("https://desaparecidos-terremoto-api.theempire.tech/api/personas?pageSize=100&page=1");
      if (!res.ok) {
        return { error: `HTTP ${res.status} ${res.statusText}` };
      }
      return await res.json();
    } catch (err: any) {
      return { error: err.message };
    }
  });

  await browser.close();

  if (data.error) {
    console.error("Failed to fetch data:", data.error);
    process.exit(1);
  }

  if (!data.items || data.items.length === 0) {
    console.log("No items found or unexpected format.");
    process.exit(0);
  }

  const items = data.items;
  console.log(`Successfully fetched ${items.length} items from the external API via Puppeteer.`);

  const statements = items.map((p: any) => {
    const id = `ext-${p.id}`;
    const origen = 'desaparecidosterremotovenezuela.com';
    const url_origen = 'https://desaparecidosterremotovenezuela.com';
    const creado_en = p.createdAt || Date.now();
    const actualizado_en = p.updatedAt || Date.now();
    const nombre_completo = p.nombre || "Desconocido";
    const edad_estimada = p.edad || null;
    const estado_actual = p.estado === "localizado" ? "located" : "missing";
    const ultima_direccion_conocida = p.ubicacion || "Desconocida";
    const descripcion_fisica = p.descripcion || null;
    const url_foto = p.foto || null;
    const contacto_reportante = p.contacto || null;

    return {
      sql: `INSERT INTO personas (
        id, origen, url_origen, creado_en, actualizado_en, nombre_completo, edad_estimada,
        estado_actual, ultima_direccion_conocida, descripcion_fisica, url_foto, contacto_reportante
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        actualizado_en = excluded.actualizado_en,
        nombre_completo = excluded.nombre_completo,
        edad_estimada = excluded.edad_estimada,
        estado_actual = excluded.estado_actual,
        ultima_direccion_conocida = excluded.ultima_direccion_conocida,
        descripcion_fisica = excluded.descripcion_fisica,
        url_foto = excluded.url_foto,
        contacto_reportante = excluded.contacto_reportante`,
      args: [
        id, origen, url_origen, creado_en, actualizado_en, nombre_completo, edad_estimada,
        estado_actual, ultima_direccion_conocida, descripcion_fisica, url_foto, contacto_reportante
      ]
    };
  });

  console.log("Inserting records into database...");
  await db.batch(statements, "write");
  console.log("Sync complete!");
}

syncWithPuppeteer().catch(console.error);
