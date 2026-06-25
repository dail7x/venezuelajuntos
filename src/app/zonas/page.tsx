import { Header } from "@/components/Header";
import { getZoneStats } from "@/lib/cases-db";
import { Metadata } from "next";

type ZoneStats = Awaited<ReturnType<typeof getZoneStats>>[number];

export const metadata: Metadata = {
  title: "Zonas con más reportes | Venezuela Juntos",
  robots: "noindex, nofollow"
};

export const dynamic = 'force-dynamic';

export default async function ZonasDashboard() {
  const zones = await getZoneStats();

  // Filter out zones that don't have a valid name or cases
  const validZones = zones.filter((z: ZoneStats) => z.zone && z.total > 0 && z.zone !== "Desconocida");
  
  // Sort primarily by total cases
  validZones.sort((a: ZoneStats, b: ZoneStats) => b.total - a.total);

  return (
    <>
      <Header />
      <main style={{ padding: "2rem 1rem", maxWidth: "1200px", margin: "0 auto", minHeight: "80vh" }}>
        <div style={{ marginBottom: "2rem", borderBottom: "1px solid var(--line)", paddingBottom: "1rem" }}>
          <h1 style={{ color: "var(--ink)", marginBottom: "0.5rem" }}>Zonas con más reportes activos</h1>
          <p style={{ color: "var(--ink-soft)", margin: 0 }}>
            Este panel ayuda a ver concentraciones de reportes por zona para orientar verificación, llamadas y apoyo comunitario.
          </p>
        </div>

        {validZones.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem", background: "var(--card-bg)", borderRadius: "8px" }}>
            <p style={{ color: "var(--ink-soft)", fontSize: "1.2rem" }}>Aún no hay suficientes reportes con zona clara para generar este resumen.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
            {validZones.map((z: ZoneStats, i: number) => (
              <div key={i} style={{ 
                background: "var(--card-bg)", 
                border: "1px solid var(--line)", 
                borderRadius: "12px",
                overflow: "hidden"
              }}>
                {/* Zone Header */}
                <div style={{ 
                  background: "rgba(37, 99, 235, 0.05)", 
                  padding: "1.5rem", 
                  borderBottom: "1px solid var(--line)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "1rem"
                }}>
                  <h2 style={{ margin: 0, fontSize: "1.5rem", color: "var(--blue)" }}>
                    {z.zone}
                  </h2>
                  <div style={{ 
                    background: "var(--blue)", 
                    color: "white", 
                    padding: "0.5rem 1rem", 
                    borderRadius: "99px",
                    fontWeight: "bold",
                    fontSize: "0.9rem"
                  }}>
                    {z.total} casos activos
                  </div>
                </div>

                {/* Hotspots */}
                <div style={{ padding: "1.5rem" }}>
                  <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.1rem", color: "var(--ink)" }}>Puntos con reportes repetidos</h3>
                  
                  {z.hotspots.length > 0 ? (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1rem" }}>
                      {z.hotspots.map((hotspot: ZoneStats["hotspots"][number], j: number) => (
                        <div key={j} style={{ 
                          padding: "1rem", 
                          border: "1px solid #fecaca", 
                          background: "#fef2f2", 
                          borderRadius: "8px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center"
                        }}>
                          <span style={{ fontWeight: 500, color: "#991b1b", flex: 1, paddingRight: "1rem" }}>
                            {hotspot.address}
                          </span>
                          <span style={{ 
                            background: "#dc2626", 
                            color: "white", 
                            padding: "4px 8px", 
                            borderRadius: "6px",
                            fontWeight: "bold",
                            fontSize: "0.85rem",
                            flexShrink: 0
                          }}>
                            {hotspot.count} personas
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ margin: 0, color: "var(--ink-soft)", fontSize: "0.95rem" }}>
                      No se detectaron puntos específicos con más de un reporte en esta zona.
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
