import { getDb } from "../src/lib/db";

async function revertStatus() {
  console.log("Starting full revert process using Map...");
  const db = getDb();
  let totalReverted = 0;
  
  // 1. Build a map of ALL people from external API
  const externalStatusMap = new Map<string, string>();
  
  let page = 1;
  while (true) {
    try {
      const apiRes = await fetch(`https://desaparecidos-terremoto-api.theempire.tech/api/personas?pageSize=500&page=${page}`);
      const json = await apiRes.json();
      const items = json.items;
      
      if (!items || items.length === 0) break;
      
      for (const p of items) {
        externalStatusMap.set(p.id, p.estado);
      }
      page++;
    } catch (err) {
      console.error(`Error fetching page ${page}:`, err);
      break;
    }
  }
  
  console.log(`Built map with ${externalStatusMap.size} external records.`);
  
  // 2. Fetch all external records in our DB that have the BAD NOTE
  const res = await db.execute({
    sql: `SELECT DISTINCT person_id FROM notas_persona WHERE text LIKE 'Reportado como LOCALIZADO desde la base de datos externa%'`,
    args: []
  });
  
  const ids = res.rows.map(r => String(r.person_id).replace('ext-', ''));
  console.log(`Found ${ids.length} records in DB with the bad note.`);
  
  // 3. Compare and Revert
  for (const id of ids) {
    const trueStatus = externalStatusMap.get(id);
    
    // If it's TRULY localizado in the API now, we keep it but delete the BAD note?
    // Wait, if it is TRULY localizado, we should keep estado_actual = 'located' but still delete the BAD note?
    // Let's just delete the BAD note for ALL of them.
    const fullId = `ext-${id}`;
    
    await db.execute({
      sql: `DELETE FROM notas_persona WHERE person_id = ? AND text LIKE 'Reportado como LOCALIZADO desde la base de datos externa%'`,
      args: [fullId]
    });
    
    // Revert estado_actual to missing if it is NOT truly localizado
    if (trueStatus !== 'localizado' && trueStatus !== 'Localizado') {
      console.log(`Reverting ${fullId} to missing (true estado_actual: ${trueStatus || 'not found in API'})`);
      
      await db.execute({
        sql: `UPDATE personas SET estado_actual = 'missing' WHERE id = ?`,
        args: [fullId]
      });
      totalReverted++;
    } else {
      console.log(`Keeping ${fullId} as located (true estado_actual: ${trueStatus})`);
    }
  }
  
  console.log(`Done! Reverted ${totalReverted} records to missing, and deleted bad notes for ${ids.length} records.`);
}

revertStatus().catch(console.error);
