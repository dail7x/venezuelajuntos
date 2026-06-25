import { ReportForm } from "@/components/ReportForm";
import { petLostFields } from "@/lib/forms";

export default function PetLostPage() {
  return (
    <main className="modal-page">
      <ReportForm
        fields={petLostFields}
        kind="pet_lost"
        submitLabel="Publicar mascota perdida"
        subtitle="Registra zona, descripcion y contacto. La foto ayuda mucho a reconocerla."
        title="Reportar mascota perdida"
      />
    </main>
  );
}
