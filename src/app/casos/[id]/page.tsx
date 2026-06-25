import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { kindLabels, statusLabels } from "@/lib/data";
import { getCaseById } from "@/lib/cases-db";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const item = await getCaseById(id);
  
  if (!item) {
    return {
      title: "Caso no encontrado | Venezuela Juntos",
    };
  }

  const title = `${item.title} | ${kindLabels[item.kind] || 'Reporte'} en Venezuela Juntos`;
  const description = `Comparte sólo información confirmada. Zona aproximada: ${item.publicAddress || item.zone}. Estado: ${statusLabels[item.status] || 'Desconocido'}.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [
        {
          url: `/api/og?id=${id}&type=og`,
          width: 1200,
          height: 630,
          alt: `Imagen de búsqueda de ${item.title}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`/api/og?id=${id}&type=og`],
    },
  };
}

export default async function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await getCaseById(id);
  if (!item) notFound();

  return (
    <>
      <Header />
      <main className="case-detail">
        <section className="detail-hero">
          {item.photoUrl && (
            <div className="case-detail-media">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt={`Foto de ${item.title}`} src={item.photoUrl} style={{ width: '100%', maxHeight: '400px', objectFit: 'cover', borderRadius: '8px', marginBottom: '16px' }} />
            </div>
          )}
          <div>
            <p className="eyebrow">{kindLabels[item.kind]}</p>
            <h1>{item.title}</h1>
            <p>{item.description}</p>
          </div>
          <div className="status-panel">
            <span>Estado</span>
            <strong>{statusLabels[item.status]}</strong>
          </div>
        </section>

        <section className="detail-grid">
          <article>
            <h2>Ubicación pública</h2>
            <p>{item.publicAddress}</p>
            <p className="muted">Zona aproximada: {item.zone}. La ubicación exacta y los contactos se protegen.</p>
          </article>
          <article>
            <h2>Última confirmación</h2>
            <p>{item.lastConfirmedAt ? new Date(item.lastConfirmedAt).toLocaleString("es-VE", { dateStyle: "medium", timeStyle: "short" }) : "Sin confirmación reciente"}</p>
            <p className="muted">Reporte cargado por: {item.reporterPublic}</p>
          </article>
          <article>
            <h2>Necesidades</h2>
            <ul>{item.needs.map((need) => <li key={need}>{need}</li>)}</ul>
          </article>
        </section>

        <section className="actions-panel">
          <a className="primary-link" href="/pedir-ayuda">Necesito ayuda similar en esta zona</a>
        </section>
      </main>
    </>
  );
}
