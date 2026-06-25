import { ReportForm } from "@/components/ReportForm";
import { helpFields } from "@/lib/forms";

export default function HelpPage() {
  return (
    <main className="modal-page">
      <ReportForm
        kind="help"
        title="Pedir ayuda urgente"
        subtitle="Indica que ocurre, donde y que recursos hacen falta. No publiques datos sensibles innecesarios."
        fields={helpFields}
      />
    </main>
  );
}
