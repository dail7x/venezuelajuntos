import { Header } from "@/components/Header";
import { seedCases, statusLabels } from "@/lib/data";

const columns = [
  ["reported", "Nuevos"],
  ["needs_verification", "Por verificar"],
  ["duplicate", "Duplicados posibles"],
  ["assigned", "Asignados"],
  ["resolved", "Resueltos"],
  ["closed", "Cerrados"],
];

export default function AdminPage() {
  return (
    <>
      <Header />
      <main className="admin-page">
        <section className="section-heading">
          <p className="eyebrow">Moderacion</p>
          <h1>Panel operativo</h1>
          <p>Vista inicial. Proteger con Auth.js antes de abrir datos privados o acciones destructivas.</p>
        </section>
        <div className="kanban">
          {columns.map(([key, label]) => (
            <section key={key}>
              <h2>{label}</h2>
              {seedCases
                .filter((item) => item.status === key)
                .map((item) => (
                  <article key={item.id}>
                    <strong>{item.title}</strong>
                    <span>{item.zone}</span>
                    <small>{statusLabels[item.status]}</small>
                  </article>
                ))}
            </section>
          ))}
        </div>
      </main>
    </>
  );
}
