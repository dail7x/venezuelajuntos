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
          subtitle="Registra tu disponibilidad."
          fields={volunteerFields}
          submitLabel="Registrar disponibilidad"
        />
        <aside>
          <MapPanel />
        </aside>
      </main>
    </>
  );
}
