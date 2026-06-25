"use client";

import Link from "next/link";

export function EmergencyHelpModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section aria-label="Aviso antes de pedir ayuda" aria-modal="true" className="emergency-modal" role="dialog">
        <button aria-label="Cerrar aviso" className="modal-close" onClick={onClose} type="button">x</button>
        <p className="eyebrow">Antes de continuar</p>
        <h2>Si hay peligro inmediato, llama primero a los servicios oficiales.</h2>
        <div className="emergency-number">
          <span>Linea unica de emergencia VEN 9-1-1</span>
          <strong>911</strong>
        </div>
        <p>
          Tu reporte puede orientar a voluntarios y equipos de apoyo, pero no reemplaza los canales oficiales ni asegura atención inmediata. Comparte la información con la mayor precisión posible.
        </p>
        <div className="modal-actions">
          <button className="secondary-button" onClick={onClose} type="button">Cancelar</button>
          <Link className="primary-button" href="/pedir-ayuda">Registrar solicitud</Link>
        </div>
      </section>
    </div>
  );
}
