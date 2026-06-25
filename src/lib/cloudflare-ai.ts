export async function normalizeAddressWithAI(rawAddress: string) {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!accountId || !apiToken) {
    console.warn("Cloudflare AI credentials missing, returning raw address.");
    return { location_zone: null, location_normalized: null };
  }

  if (!rawAddress || rawAddress.trim().length === 0) {
    return { location_zone: null, location_normalized: null };
  }

  const prompt = `Eres un asistente experto en parsear direcciones en Venezuela, especialmente en zonas afectadas por desastres naturales (como La Guaira, Vargas, Caracas, etc).
Te daré una dirección extraída de un reporte ciudadano, que puede tener errores ortográficos o ser informal.
Debes devolver un JSON con dos campos:
1. "location_zone": Una categoría macro de la zona (ej. "La Guaira", "Caracas", "Macuto", "Maiquetia", "Naiguatá"). Si no estás seguro, devuelve la zona más probable o "Vargas".
2. "location_normalized": La dirección atomizada y formalizada (ej. si dice "la dguaira urb palmar edf caribe", devuelves "Urb. Palmar, Edf. Caribe, La Guaira").

Dirección cruda: "${rawAddress}"

Devuelve ÚNICAMENTE el JSON, sin texto adicional ni bloques de markdown (ni \`\`\`json). Ejemplo de respuesta: {"location_zone": "La Guaira", "location_normalized": "Edificio Caribe, La Guaira"}`;

  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/meta/llama-3-8b-instruct`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: prompt }],
        }),
      }
    );

    if (!res.ok) {
      console.error("Cloudflare AI error:", res.status, res.statusText, await res.text());
      return { location_zone: null, location_normalized: null };
    }

    const data = await res.json();
    const responseText = data.result?.response || "";
    
    // Parse the JSON (handle potential markdown formatting just in case)
    const cleanJson = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);
    
    return {
      location_zone: parsed.location_zone || null,
      location_normalized: parsed.location_normalized || null
    };
  } catch (error) {
    console.error("Failed to parse address with AI:", error);
    return { location_zone: null, location_normalized: null };
  }
}
