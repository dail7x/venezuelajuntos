import Link from "next/link";
import { kindLabels, statusLabels, urgencyLabels, type PublicCase } from "@/lib/data";

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
        <span className={`urgency ${item.urgency}`}>{urgencyLabels[item.urgency]}</span>
      </div>
      <h3>{item.title}</h3>
      <p>{item.zone}</p>
      <div className="case-meta">
        <span>{statusLabels[item.status]}</span>
        <span>Actualizado {new Date(item.updatedAt).toLocaleString("es-VE", { dateStyle: "short", timeStyle: "short" })}</span>
      </div>
    </>
  );

  if (onOpen) {
    return (
      <article className={`case-card ${item.urgency}`} style={{ cursor: 'pointer' }} onClick={() => onOpen(item)}>
        {content}
      </article>
    );
  }

  return (
    <Link href={`/casos/${item.slug}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
      <article className={`case-card ${item.urgency}`}>
        {content}
      </article>
    </Link>
  );
}
