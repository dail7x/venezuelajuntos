"use client";

import { useState } from "react";

const actions = [
  ["confirmed", "Confirmo activo"],
  ["canHelp", "Puedo ayudar"],
  ["duplicate", "Duplicado"],
  ["falseReport", "Parece falso"],
  ["resolved", "Ya resuelto"],
] as const;

export function SignalButtons({ caseId }: { caseId: string }) {
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
      {actions.map(([type, label]) => (
        <button key={type} className={sent === type ? "selected" : ""} onClick={() => signal(type)}>
          {label}
        </button>
      ))}
    </div>
  );
}
