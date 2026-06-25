import { ReportForm } from "@/components/ReportForm";
import { foundFields } from "@/lib/forms";

export default function FoundPage() {
  return (
    <main className="modal-page">
      <ReportForm
        kind="found"
        title="Reportar una persona encontrada"
        subtitle="Registra informacion con cuidado. Las coincidencias las revisa un equipo de verificacion."
        fields={foundFields}
      />
    </main>
  );
}
