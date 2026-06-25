"use client";

import { useState } from "react";

const actions = [
  ["confirmed", "Confirmo activo"],
  ["canHelp", "Puedo ayudar"],
  ["duplicate", "Duplicado"],
  ["falseReport", "Parece falso"],
  ["resolved", "Ya resuelto"],
] as const;

export function SignalButtons({ caseId, kind }: { caseId: string; kind?: string }) {
  const [sent, setSent] = useState<string | null>(null);

  async function signal(type: string) {
    setSent(type);
    await fetch("/api/signals", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ caseId, type }),
    }).catch(() => undefined);
  }

  return (
    <div className="signal-grid">
      {actions.map(([type, label]) => {
        let finalLabel: string = label;
        if (type === "resolved") {
          if (kind === "missing" || kind === "found") {
            finalLabel = "Ya apareció";
          } else if (kind === "pet_lost" || kind === "pet_found") {
            finalLabel = "Mascota encontrada";
          }
        }
        return (
          <button key={type} className={sent === type ? "selected" : ""} onClick={() => signal(type)}>
            {finalLabel}
          </button>
        );
      })}
    </div>
  );
}
