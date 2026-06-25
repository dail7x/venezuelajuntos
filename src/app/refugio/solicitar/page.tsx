import { ReportForm } from "@/components/ReportForm";
import { shelterRequestFields } from "@/lib/forms";

export default function ShelterRequestPage() {
  return (
    <main className="modal-page">
      <ReportForm
        fields={shelterRequestFields}
        kind="shelter_request"
        submitLabel="Solicitar refugio"
        subtitle="Esto ayuda a buscar match con refugios cercanos y a entregar datos agregados a autoridades, iglesias u ONGs."
        title="Solicitar refugio"
      />
    </main>
  );
}
