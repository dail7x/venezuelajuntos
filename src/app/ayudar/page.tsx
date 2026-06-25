import { Header } from "@/components/Header";
import { MapPanel } from "@/components/MapPanel";
import { ReportForm } from "@/components/ReportForm";
import { volunteerFields } from "@/lib/forms";

export default function VolunteerPage() {
  return (
    <>
      <Header />
      <main className="two-column-page">
        <ReportForm
          kind="volunteer"
          title="Quiero ayudar cerca de mi"
          subtitle="Haz check-in de disponibilidad. Los check-ins activos se consideran vigentes por 4 horas."
          fields={volunteerFields}
          submitLabel="Registrar disponibilidad"
        />
        <aside>
          <MapPanel />
          <div className="privacy-box">
            <strong>Matching operativo</strong>
            Se prioriza por urgencia, habilidades, distancia, frescura del reporte y senales de confianza.
          </div>
        </aside>
      </main>
    </>
  );
}
