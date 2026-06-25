import { ImageResponse } from "next/og";
import { getCaseById } from "@/lib/cases-db";
import { kindLabels, statusLabels } from "@/lib/data";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const id = searchParams.get("id");
  const type = searchParams.get("type") || "og"; // "og" or "story"

  if (!id) {
    return new Response("Missing id", { status: 400 });
  }

  const item = await getCaseById(id);
  if (!item) {
    return new Response("Not found", { status: 404 });
  }

  const isStory = type === "story";
  const width = isStory ? 1080 : 1200;
  const height = isStory ? 1920 : 630;

  const photoSrc = item.photoUrl
    ? item.photoUrl.startsWith("http")
      ? item.photoUrl
      : `${origin}${item.photoUrl}`
    : null;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          backgroundColor: "#f8fafc",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flex: 1, flexDirection: isStory ? "column" : "row" }}>
          
          <div style={{
            display: "flex",
            flex: isStory ? 1.5 : 1,
            backgroundColor: "#e2e8f0",
            overflow: "hidden",
            position: "relative",
            justifyContent: "center",
            alignItems: "center",
          }}>
            {photoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoSrc}
                alt={item.title}
                style={{
                  objectFit: "cover",
                  width: "100%",
                  height: "100%",
                  position: "absolute",
                  inset: 0,
                }}
              />
            ) : (
              <span style={{ fontSize: "2rem", color: "#64748b", fontWeight: "bold" }}>Sin foto registrada</span>
            )}
            
            <div style={{
              position: "absolute",
              top: isStory ? "40px" : "30px",
              left: isStory ? "40px" : "30px",
              backgroundColor: item.status === "missing" ? "#dc2626" : item.status === "located" || item.status === "reunified" ? "#16a34a" : "#ca8a04",
              color: "white",
              padding: "12px 24px",
              borderRadius: "8px",
              fontSize: isStory ? "2.2rem" : "1.5rem",
              fontWeight: "bold",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
            }}>
              {statusLabels[item.status] || "Reportado"}
            </div>
          </div>

          <div style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            padding: isStory ? "60px 40px" : "40px 60px",
            justifyContent: "center",
          }}>
            <h2 style={{
              fontSize: isStory ? "2.5rem" : "2rem",
              color: "#3b82f6",
              fontWeight: "bold",
              margin: "0 0 16px 0",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}>
              ¡Ayúdame a difundir!
            </h2>
            
            <h1 style={{
              fontSize: isStory ? "4.5rem" : "3.5rem",
              color: "#0f172a",
              fontWeight: "bold",
              margin: "0 0 32px 0",
              lineHeight: 1.1,
            }}>
              {item.kind === "missing" ? "Buscamos a " : "Reporte: "}{item.title}
            </h1>
            
            <div style={{ display: "flex", flexDirection: "column", gap: isStory ? "32px" : "24px" }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ color: "#64748b", fontSize: isStory ? "1.8rem" : "1.4rem", fontWeight: "bold", textTransform: "uppercase", marginBottom: "4px" }}>Ubicación / Zona</span>
                <span style={{ color: "#334155", fontSize: isStory ? "2.4rem" : "1.8rem", fontWeight: "bold" }}>{item.publicAddress || item.zone}</span>
              </div>
              
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ color: "#64748b", fontSize: isStory ? "1.8rem" : "1.4rem", fontWeight: "bold", textTransform: "uppercase", marginBottom: "4px" }}>Tipo de Reporte</span>
                <span style={{ color: "#334155", fontSize: isStory ? "2.4rem" : "1.8rem", fontWeight: "bold" }}>{kindLabels[item.kind] || item.kind}</span>
              </div>
            </div>

            <div style={{
              marginTop: "auto",
              paddingTop: "40px",
              display: "flex",
              alignItems: "center",
              gap: "16px",
            }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#dbeafe",
                color: "#1e3a8a",
                padding: "8px 16px",
                borderRadius: "999px",
                fontSize: isStory ? "2rem" : "1.4rem",
                fontWeight: "bold",
              }}>
                venezuelajuntos.online/casos/{item.id}
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width,
      height,
    }
  );
}
