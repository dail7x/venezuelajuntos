import Link from "next/link";
import { kindLabels, statusLabels, type PublicCase } from "@/lib/data";

export function CaseCard({ item, onOpen }: { item: PublicCase; onOpen?: (item: PublicCase) => void }) {
  const content = (
    <>
      {item.photoUrl ? (
        <div className="case-card-image">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt={`Foto de ${item.title}`} src={item.photoUrl} />
        </div>
      ) : null}
      <div className="case-card-top">
        <span className="pill">{kindLabels[item.kind]}</span>
      </div>
      <h3>{item.title}</h3>
      <p>{item.zone}</p>
      <div className="case-meta">
        <span>{statusLabels[item.status]}</span>
        <span>Actualizado {new Date(item.updatedAt).toLocaleString("es-VE", { dateStyle: "short", timeStyle: "short" })}</span>
      </div>
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
      <article className="case-card" style={{ cursor: 'pointer' }} onClick={() => onOpen(item)}>
        {content}
      </article>
    );
  }

  return (
    <Link href={`/casos/${item.slug}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
      <article className="case-card">
        {content}
      </article>
    </Link>
  );
}
