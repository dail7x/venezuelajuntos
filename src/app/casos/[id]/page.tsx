import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { SignalButtons } from "@/components/SignalButtons";
import { kindLabels, statusLabels, urgencyLabels } from "@/lib/data";
import { getPublicCasesFromDb } from "@/lib/cases-db";

export default async function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cases = await getPublicCasesFromDb();
  const item = cases.find(c => c.id === id || c.slug === id);
  if (!item) notFound();

  return (
    <>
      <Header />
      <main className="case-detail">
        <section className={`detail-hero ${item.urgency}`}>
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
            <span>Urgencia</span>
            <strong>{urgencyLabels[item.urgency]}</strong>
          </div>
        </section>

        <section className="detail-grid">
          <article>
            <h2>Ubicacion publica</h2>
            <p>{item.publicAddress}</p>
            <p className="muted">Zona aproximada: {item.zone}. La ubicacion exacta y contactos se protegen.</p>
          </article>
          <article>
            <h2>Ultima confirmacion</h2>
            <p>{item.lastConfirmedAt ? new Date(item.lastConfirmedAt).toLocaleString("es-VE", { dateStyle: "medium", timeStyle: "short" }) : "Sin confirmacion reciente"}</p>
            <p className="muted">Fuente publica: {item.reporterPublic}</p>
          </article>
          <article>
            <h2>Necesidades</h2>
            <ul>{item.needs.map((need) => <li key={need}>{need}</li>)}</ul>
          </article>
        </section>

        <section className="actions-panel">
          <h2>Actualizar este caso</h2>
          <SignalButtons caseId={item.id} kind={item.kind} />
          <a className="primary-link" href="/pedir-ayuda">Necesito ayuda similar en esta zona</a>
        </section>
      </main>
    </>
  );
}
