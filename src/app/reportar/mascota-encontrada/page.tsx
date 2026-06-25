import { ReportForm } from "@/components/ReportForm";
import { petFoundFields } from "@/lib/forms";

export default function PetFoundPage() {
  return (
    <main className="modal-page">
      <ReportForm
        fields={petFoundFields}
        kind="pet_found"
        submitLabel="Publicar mascota recuperada"
        subtitle="Indica donde esta, su estado y si puedes tenerla temporalmente en transito."
        title="Reportar mascota recuperada"
      />
    </main>
  );
}
