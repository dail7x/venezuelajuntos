import Link from "next/link";
import { kindLabels, type PublicCase } from "@/lib/data";
import { CheckCircle2, Search } from "lucide-react";

export function CaseCard({ item, onOpen }: { item: PublicCase; onOpen?: (item: PublicCase) => void }) {
  const isFound = item.kind === "found";
  const isMissing = item.kind === "missing";
  const borderStyle = isFound ? "2px solid var(--green)" : undefined;

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

  const content = (
    <>
      {item.photoUrl ? (
        <div className="case-card-image" style={{ position: "relative" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt={`Foto de ${item.title}`} src={item.photoUrl} />
          <div style={{ position: "absolute", top: "10px", right: "10px" }}>
            <span className="pill" style={pillStyle}>{pillContent}</span>
          </div>
        </div>
      ) : (
        <div className="case-card-top">
          <span className="pill" style={pillStyle}>{pillContent}</span>
        </div>
      )}
      <h3>{item.title}</h3>
      <p>{item.zone}</p>
      {item.sourceDomain && (
        <div style={{ marginTop: "1rem", fontSize: "0.85rem", color: "#5b6b7b", borderTop: "1px solid #e6ecf2", paddingTop: "0.5rem" }}>
          <span aria-hidden="true">🌐 </span>
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
      <article className="case-card" style={{ cursor: 'pointer', border: borderStyle }} onClick={() => onOpen(item)}>
        {content}
      </article>
    );
  }

  return (
    <Link href={`/casos/${item.slug}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
      <article className="case-card" style={{ border: borderStyle }}>
        {content}
      </article>
    </Link>
  );
}
