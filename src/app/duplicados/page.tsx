import { Header } from "@/components/Header";
import { getDb } from "@/lib/db";
import { revalidatePath } from "next/cache";

export const metadata = {
  title: "Revisión de fichas repetidas | Venezuela Juntos",
  robots: "noindex, nofollow"
};

export const dynamic = 'force-dynamic';

async function mergeDuplicates(formData: FormData) {
  "use server";
  const originalId = formData.get("originalId") as string;
  const duplicateId = formData.get("duplicateId") as string;
  const action = formData.get("action") as string;

  const db = getDb();

  if (action === "merge") {
    // 1. Get both to merge photos
    const dupRes = await db.execute({
      sql: "SELECT url_foto, descripcion_fisica FROM personas WHERE id = ?",
      args: [duplicateId]
    });
    
    if (dupRes.rows.length > 0) {
      const dupPhoto = dupRes.rows[0].url_foto;
      
      // Update the original (append photo if it exists and isn't already there)
      if (dupPhoto) {
        await db.execute({
          sql: "UPDATE personas SET url_foto = url_foto || ',' || ? WHERE id = ? AND (url_foto NOT LIKE '%' || ? || '%')",
          args: [dupPhoto, originalId, dupPhoto]
        });
      }
    }

    // Mark as deleted and link
    await db.execute({
      sql: "UPDATE personas SET esta_eliminado = 1, duplicado_de = ?, posible_duplicado_de = NULL WHERE id = ?",
      args: [originalId, duplicateId]
    });
  } else if (action === "reject") {
    // Just clear the flag
    await db.execute({
      sql: "UPDATE personas SET posible_duplicado_de = NULL WHERE id = ?",
      args: [duplicateId]
    });
  }

  revalidatePath("/duplicados");
}

export default async function DuplicadosDashboard() {
  const db = getDb();

  // Fetch all potential duplicates and their originals
  const res = await db.execute({
    sql: `
      SELECT 
        d.id as d_id, d.nombre_completo as d_name, d.zona_ubicacion as d_zone, d.url_foto as d_photo, d.creado_en as d_created, d.cedula_identidad as d_cedula,
        o.id as o_id, o.nombre_completo as o_name, o.zona_ubicacion as o_zone, o.url_foto as o_photo, o.creado_en as o_created, o.cedula_identidad as o_cedula
      FROM personas d
      JOIN personas o ON d.posible_duplicado_de = o.id
      WHERE d.esta_eliminado = 0 AND d.posible_duplicado_de IS NOT NULL
      ORDER BY d.creado_en DESC
    `,
    args: []
  });

  return (
    <>
      <Header />
      <main style={{ padding: "2rem 1rem", maxWidth: "1200px", margin: "0 auto", minHeight: "80vh" }}>
        <div style={{ marginBottom: "2rem", borderBottom: "1px solid var(--line)", paddingBottom: "1rem" }}>
          <h1 style={{ color: "var(--ink)", marginBottom: "0.5rem" }}>Revisión de posibles fichas repetidas</h1>
          <p style={{ color: "var(--ink-soft)", margin: 0 }}>
            Encontramos {res.rows.length} fichas con datos parecidos en la misma zona. Revísalas con cuidado para unir información sin borrar pistas útiles.
          </p>
        </div>

        {res.rows.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem", background: "var(--card-bg)", borderRadius: "8px" }}>
            <p style={{ color: "var(--ink-soft)", fontSize: "1.2rem" }}>No hay fichas repetidas pendientes de revisión.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
            {res.rows.map((row: any, i) => (
              <div key={i} style={{ 
                background: "var(--card-bg)", 
                border: "1px solid var(--line)", 
                borderRadius: "12px",
                padding: "1.5rem",
                display: "grid",
                gridTemplateColumns: "1fr auto 1fr",
                gap: "2rem",
                alignItems: "center"
              }}>
                {/* Original */}
                <div style={{ padding: "1rem", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px" }}>
                  <span style={{ fontSize: "0.8rem", fontWeight: "bold", color: "#166534", textTransform: "uppercase" }}>Ficha principal</span>
                  <h3 style={{ margin: "0.5rem 0", color: "#166534" }}>{row.o_name}</h3>
                  <p style={{ margin: "0.2rem 0", fontSize: "0.9rem" }}>{row.o_zone}</p>
                  {row.o_cedula && <p style={{ margin: "0.2rem 0", fontSize: "0.9rem" }}>CI: {row.o_cedula}</p>}
                </div>

                {/* Actions */}
                <form action={mergeDuplicates} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <input type="hidden" name="originalId" value={row.o_id} />
                  <input type="hidden" name="duplicateId" value={row.d_id} />
                  
                  <button type="submit" name="action" value="merge" style={{
                    background: "var(--blue)", color: "white", border: "none", padding: "0.8rem 1.5rem", borderRadius: "8px", fontWeight: "bold", cursor: "pointer"
                  }}>Sí, unir fichas</button>
                  
                  <button type="submit" name="action" value="reject" style={{
                    background: "transparent", color: "var(--ink-soft)", border: "1px solid var(--line)", padding: "0.5rem 1rem", borderRadius: "8px", cursor: "pointer"
                  }}>No, son distintos</button>
                </form>

                {/* Duplicate */}
                <div style={{ padding: "1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px" }}>
                  <span style={{ fontSize: "0.8rem", fontWeight: "bold", color: "#991b1b", textTransform: "uppercase" }}>Posible ficha repetida</span>
                  <h3 style={{ margin: "0.5rem 0", color: "#991b1b" }}>{row.d_name}</h3>
                  <p style={{ margin: "0.2rem 0", fontSize: "0.9rem" }}>{row.d_zone}</p>
                  {row.d_cedula && <p style={{ margin: "0.2rem 0", fontSize: "0.9rem" }}>CI: {row.d_cedula}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
