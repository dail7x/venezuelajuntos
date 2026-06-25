import { ReportForm } from "@/components/ReportForm";
import { shelterOfferFields } from "@/lib/forms";

export default function ShelterOfferPage() {
  return (
    <main className="modal-page">
      <ReportForm
        fields={shelterOfferFields}
        kind="shelter_offer"
        submitLabel="Ofrecer refugio"
        subtitle="Registra casas, canchas, iglesias, galpones u otros espacios disponibles para coordinar cupos."
        title="Ofrecer refugio"
      />
    </main>
  );
}
