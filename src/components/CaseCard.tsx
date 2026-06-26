import Link from "next/link";
import { kindLabels, type PublicCase } from "@/lib/data";
import { CheckCircle2, Search, MapPin } from "lucide-react";

export function CaseCard({ item, onOpen }: { item: PublicCase; onOpen?: (item: PublicCase) => void }) {
  const isFound = item.kind === "found";
  const isMissing = item.kind === "missing";
  const borderStyle = isFound ? "2px solid var(--green)" : undefined;
  const backgroundStyle = isFound ? "#ebf5ed" : "white";

  let pillContent = <span>{kindLabels[item.kind]}</span>;
  let pillStyle: React.CSSProperties = {};

  if (isFound) {
    pillContent = (
      <>
        <CheckCircle2 size={14} /> Localizado/a a salvo
      </>
    );
    pillStyle = { background: "var(--green)", color: "white", display: "flex", alignItems: "center", gap: "4px" };
  } else if (isMissing) {
    pillContent = (
      <>
        <Search size={14} /> Buscado/a
      </>
    );
    pillStyle = { background: "var(--orange)", color: "white", display: "flex", alignItems: "center", gap: "4px" };
  }

  function getInitials(name: string) {
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  const content = (
    <>
      <div className="case-card-image" style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", background: item.photoUrl ? undefined : "#f1f5fb", marginBottom: "12px" }}>
        {item.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt={`Foto de ${item.title}`} src={item.photoUrl.split(',')[0]} />
        ) : (
          <span style={{ fontSize: "3rem", fontWeight: "bold", color: "#94a3b8" }}>{getInitials(item.title)}</span>
        )}
        
        {(item.inHospitalList || (item.foundNotes && item.foundNotes.toLowerCase().includes("hospital"))) && (
          <div style={{ position: "absolute", top: "8px", left: "8px", padding: "4px 10px", borderRadius: "999px", fontSize: "0.75rem", fontWeight: "bold", background: "#0ea5e9", color: "white", display: "flex", alignItems: "center", gap: "4px", zIndex: 2, boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }}>
            🏥 En lista de hospital
          </div>
        )}
        <div style={{ position: "absolute", top: "10px", right: "10px" }}>
          <span className="pill" style={pillStyle}>{pillContent}</span>
        </div>
      </div>
      <h3 style={{ margin: "0 0 8px 0" }}>{item.title}</h3>
      <p style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'var(--wash)', padding: '4px 8px', borderRadius: '6px', fontSize: '0.85rem', color: 'var(--ink-soft)', margin: 0 }}>
        <MapPin size={14} /> {item.publicAddress}
      </p>
      {isFound && item.foundNotes && (
        <div style={{ marginTop: "1rem", fontSize: "0.85rem", color: "var(--ink-soft)", background: "var(--green-light, #e0f2e9)", padding: "8px", borderRadius: "8px", whiteSpace: 'pre-line' }}>
          <strong>Detalles de localización:</strong><br />
          {item.foundNotes}
        </div>
      )}
      
      {item.duplicates && item.duplicates.length > 0 && (
        <div style={{ marginTop: "1rem", borderTop: "1px solid var(--wash-dark)", paddingTop: "1rem" }}>
          <h4 style={{ margin: "0 0 8px 0", fontSize: "0.9rem", color: "var(--ink-main)" }}>Actualizaciones de la comunidad</h4>
          
          {/* Gallery of duplicate photos if any have unique photos */}
          {(() => {
            const uniquePhotos = new Set<string>();
            if (item.photoUrl) uniquePhotos.add(item.photoUrl);
            
            const extraPhotos = item.duplicates.map(d => d.photoUrl).filter(Boolean) as string[];
            extraPhotos.forEach(p => uniquePhotos.add(p));
            
            if (uniquePhotos.size > 1) {
              const allPhotos = Array.from(uniquePhotos);
              return (
                <div style={{ display: "flex", gap: "8px", overflowX: "auto", marginBottom: "12px", paddingBottom: "4px" }}>
                  {allPhotos.map((url, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={url.split(',')[0]} alt="Foto adicional" style={{ height: "60px", width: "60px", objectFit: "cover", borderRadius: "8px", flexShrink: 0 }} />
                  ))}
                </div>
              );
            }
            return null;
          })()}

          {item.duplicates.map((dup) => (
            <div key={dup.id} style={{ background: "var(--wash)", padding: "8px", borderRadius: "6px", marginBottom: "8px", fontSize: "0.85rem" }}>
              <div style={{ fontWeight: "bold" }}>Reporte similar: {dup.title}</div>
              {dup.reporterName && <div>Por: {dup.reporterName}</div>}
              {dup.description && <div style={{ color: "var(--ink-soft)", marginTop: "4px" }}>{dup.description}</div>}
            </div>
          ))}
        </div>
      )}

      {item.sourceDomain && (
        <div style={{ marginTop: "1rem", fontSize: "0.85rem", color: "#5b6b7b", borderTop: "1px solid #e6ecf2", paddingTop: "0.5rem" }}>
          {item.sourceUrl ? (
            <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#2563a8", textDecoration: "underline" }} onClick={(e) => e.stopPropagation()}>
              Fuente: {item.sourceDomain} · sin verificar
            </a>
          ) : (
            <span>Fuente: {item.sourceDomain} · sin verificar</span>
          )}
        </div>
      )}
    </>
  );

  if (onOpen) {
    return (
      <article className="case-card" style={{ cursor: 'pointer', border: borderStyle, background: backgroundStyle }} onClick={() => onOpen(item)}>
        {content}
      </article>
    );
  }

  return (
    <Link href={`/casos/${item.slug}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
      <article className="case-card" style={{ border: borderStyle, background: backgroundStyle }}>
        {content}
      </article>
    </Link>
  );
}
