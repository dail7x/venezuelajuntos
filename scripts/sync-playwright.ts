import { chromium } from 'playwright';
import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const db = createClient({
  url: process.env.DATABASE_URL as string,
  authToken: process.env.TURSO_AUTH_TOKEN as string,
});

async function syncWithPlaywright() {
  console.log("Launching Playwright...");
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });
  
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();
  
  console.log("Navigating to main site to get grecaptcha context...");
  await page.goto("https://desaparecidosterremotovenezuela.com/", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);

  const startPage = parseInt(process.argv.find(arg => !isNaN(parseInt(arg))) || "1");
  const estadoFilter = process.argv.includes("--localizados") ? "&estado=localizado" : "";
  console.log(`Starting extraction loop from page ${startPage} onwards... ${estadoFilter ? '(Filtro: Localizados)' : ''}`);

  let pageNum = startPage;
  const pageSize = 100;
  let hasMore = true;

  while (hasMore) {
    console.log(`Fetching page ${pageNum}...`);
    
    const data = await page.evaluate(async ({ pageNum, pageSize, estadoFilter }) => {
      try {
        const token = await new Promise((resolve) => {
          (window as any).grecaptcha.ready(() => {
            (window as any).grecaptcha.execute('6LeBfDUtAAAAAMw1Wtkd58bst6vEnLOi3_NAjGD0', {action: 'submit'}).then(resolve);
          });
        });

        const res = await fetch(`https://desaparecidos-terremoto-api.theempire.tech/api/personas?pageSize=${pageSize}&page=${pageNum}${estadoFilter}`, {
          headers: {
            'x-recaptcha-token': token as string,
            'accept': 'application/json'
          }
        });
        
        if (!res.ok) {
          return { error: `HTTP ${res.status} ${res.statusText}` };
        }
        return await res.json();
      } catch (err: any) {
        return { error: err.message };
      }
    }, { pageNum, pageSize, estadoFilter });

    if (data.error) {
      console.error(`Failed to fetch page ${pageNum}:`, data.error);
      break;
    }

    if (!data.items || data.items.length === 0) {
      console.log(`No more items found on page ${pageNum}.`);
      hasMore = false;
      break;
    }

    const items = data.items;
    console.log(`Successfully fetched ${items.length} items from page ${pageNum}.`);

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
      
      const localizado_por = p.localizadoPor || null;
      const localizado_contacto = p.localizadoContacto || null;
      const localizado_relacion = p.localizadoRelacion || null;
      const localizado_nota = p.localizadoNota || null;

      const descripcion_fisica = p.descripcion || null;
      let url_foto = p.foto || null;
      if (url_foto && url_foto.includes("reconexion-api-images-147455119818.s3.us-east-1.amazonaws.com")) {
        url_foto = url_foto.replace("reconexion-api-images-147455119818.s3.us-east-1.amazonaws.com", "cdn-imagenes.theempire.tech");
      }
      const contacto_reportante = p.contacto || null;

      return {
        sql: `INSERT INTO personas (
          id, origen, url_origen, creado_en, actualizado_en, nombre_completo, edad_estimada,
          estado_actual, ultima_direccion_conocida, descripcion_fisica, url_foto, contacto_reportante,
          localizado_por, localizado_contacto, localizado_relacion, localizado_nota
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          actualizado_en = excluded.actualizado_en,
          nombre_completo = excluded.nombre_completo,
          edad_estimada = excluded.edad_estimada,
          estado_actual = excluded.estado_actual,
          ultima_direccion_conocida = excluded.ultima_direccion_conocida,
          descripcion_fisica = excluded.descripcion_fisica,
          url_foto = excluded.url_foto,
          contacto_reportante = excluded.contacto_reportante,
          localizado_por = excluded.localizado_por,
          localizado_contacto = excluded.localizado_contacto,
          localizado_relacion = excluded.localizado_relacion,
          localizado_nota = excluded.localizado_nota`,
        args: [
          id, origen, url_origen, creado_en, actualizado_en, nombre_completo, edad_estimada,
          estado_actual, ultima_direccion_conocida, descripcion_fisica, url_foto, contacto_reportante,
          localizado_por, localizado_contacto, localizado_relacion, localizado_nota
        ]
      };
    });

    console.log(`Inserting ${items.length} records into database...`);
    await db.batch(statements, "write");

    if (pageNum >= (data.totalPages || pageNum)) {
      hasMore = false;
    } else {
      pageNum++;
      // Wait a bit before next page to avoid rate limiting
      await page.waitForTimeout(1500);
    }
  }

  await browser.close();
  console.log("Sync complete!");
}

syncWithPlaywright().catch(console.error);
