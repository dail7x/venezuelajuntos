import { ReportForm } from "@/components/ReportForm";
import { missingFields } from "@/lib/forms";

export default function MissingPage() {
  return (
    <main className="modal-page">
      <ReportForm
        kind="missing"
        title="Reportar a una persona desaparecida"
        subtitle="Comparte lo que sepas. Cada dato ayuda a que alguien la reconozca."
        fields={missingFields}
      />
    </main>
  );
}
