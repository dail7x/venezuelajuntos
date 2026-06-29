export async function normalizeAddressWithAI(rawAddress: string) {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!accountId || !apiToken) {
    console.warn("Cloudflare AI credentials missing, returning raw address.");
    return { zona_ubicacion: null, ubicacion_normalizada: null };
  }

  if (!rawAddress || rawAddress.trim().length === 0) {
    return { zona_ubicacion: null, ubicacion_normalizada: null };
  }

  const prompt = `Eres un asistente experto en parsear direcciones en Venezuela, especialmente en zonas afectadas por desastres naturales (como La Guaira, Vargas, Caracas, etc).
Te daré una dirección extraída de un reporte ciudadano, que puede tener errores ortográficos o ser informal.
Debes devolver un JSON con dos campos:
1. "zona_ubicacion": Una categoría macro de la zona (ej. "La Guaira", "Caracas", "Macuto", "Maiquetia", "Naiguatá"). Si no estás seguro, devuelve la zona más probable o "Vargas".
2. "ubicacion_normalizada": La dirección atomizada y formalizada (ej. si dice "la dguaira urb palmar edf caribe", devuelves "Urb. Palmar, Edf. Caribe, La Guaira").

Dirección cruda: "${rawAddress}"

Devuelve ÚNICAMENTE el JSON, sin texto adicional ni bloques de markdown. 
Ejemplo de formato: {"zona_ubicacion": "La Guaira", "ubicacion_normalizada": "Edificio Los Cocos, Av Principal, La Guaira"}
IMPORTANTE: Usa los nombres y lugares de la 'Dirección cruda'. NO uses el texto del ejemplo anterior si no está en la 'Dirección cruda'. Si la dirección no menciona edificios, no los inventes. Si no estás seguro o es muy ambigua, simplemente repite la 'Dirección cruda' en 'ubicacion_normalizada'.`;

  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/meta/llama-3.1-8b-instruct`,
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
      return { zona_ubicacion: null, ubicacion_normalizada: null };
    }

    const data = await res.json();
    const responseRaw = data.result?.response;
    let parsed: any = {};
    
    if (typeof responseRaw === 'string') {
      const cleanJson = responseRaw.replace(/```json/gi, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleanJson);
    } else if (typeof responseRaw === 'object' && responseRaw !== null) {
      parsed = responseRaw;
    }
    
    return {
      zona_ubicacion: parsed.zona_ubicacion || null,
      ubicacion_normalizada: parsed.ubicacion_normalizada || null
    };
  } catch (error) {
    console.error("Failed to parse address with AI:", error);
    return { zona_ubicacion: null, ubicacion_normalizada: null };
  }
}

export async function extractNamesFromHospitalList(
  sourceType: "image" | "tweet" | "excel" | "pdf",
  sourceData: string,
  context?: { manualHospitalName?: string, listDate?: string }
) {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!accountId || !apiToken) {
    throw new Error("Cloudflare AI credentials missing");
  }

  const prompt = `Eres un asistente que extrae información de listas de pacientes en hospitales, centros de primeros auxilios y refugios.
De la información provista, extrae todos los nombres de personas y devuelve un JSON.
${context?.manualHospitalName ? `OJO: El usuario indica que este listado pertenece a: "${context.manualHospitalName}".` : ""}
${context?.listDate ? `OJO: El usuario indica que la fecha de este listado es: "${context.listDate}".` : ""}
El formato debe ser EXACTAMENTE este:
{
  "hospital_name": "Nombre del hospital o refugio si se menciona, o null",
  "people": [
    {
      "full_name": "Nombre completo",
      "cedula_identidad": numero_o_null,
      "age_estimated": numero_o_null,
      "status": "localizado" o "fallecido"
    }
  ]
}
¡MUY IMPORTANTE!: Debes responder ÚNICA Y EXCLUSIVAMENTE con un objeto JSON válido. No incluyas absolutamente nada de texto antes ni después. El primer carácter de tu respuesta debe ser { y el último debe ser }. Si no encuentras nombres legibles, devuelve {"hospital_name": null, "people": []}.`;

  let messages: any[] = [];

  if (sourceType === "image") {
    messages = [
      { role: "user", content: prompt },
      { role: "user", content: "Extrae de la siguiente imagen:" },
      { role: "user", content: [{ type: "image_url", image_url: { url: `data:image/jpeg;base64,${sourceData}` } }] }
    ];
  } else if (sourceType === "tweet" || sourceType === "excel" || sourceType === "pdf") {
    messages = [
      { role: "user", content: prompt + "\n\nTexto:\n" + sourceData }
    ];
  }

  // Use llama-3.2-11b-vision-instruct for images, 3.1-8b for text
  const model = sourceType === "image" 
    ? "@cf/meta/llama-3.2-11b-vision-instruct" 
    : "@cf/meta/llama-3.1-8b-instruct";

  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages }),
      }
    );

    if (!res.ok) {
      console.error("Cloudflare AI error:", await res.text());
      throw new Error("AI extraction failed");
    }

    const data = await res.json();
    const responseRaw = data.result?.response;
    let cleanJson = "";
    
    if (typeof responseRaw === 'string') {
      // Find the first { and the last }
      const firstBrace = responseRaw.indexOf('{');
      const lastBrace = responseRaw.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        cleanJson = responseRaw.substring(firstBrace, lastBrace + 1);
      } else {
        // Fallback to previous logic if no braces found (unlikely for JSON)
        cleanJson = responseRaw.replace(/```json/gi, '').replace(/```/g, '').trim();
      }
    } else if (typeof responseRaw === 'object' && responseRaw !== null) {
      cleanJson = JSON.stringify(responseRaw);
    }
    
    try {
      return JSON.parse(cleanJson);
    } catch (parseError) {
      console.warn("AI returned invalid JSON, falling back to empty list. Response was:", responseRaw);
      // If the model completely ignored the JSON instruction (e.g. said "I can't read this"),
      // we gracefully return an empty list so the frontend doesn't crash.
      return { hospital_name: null, people: [] };
    }
  } catch (error) {
    console.error("Failed to extract names with AI:", error);
    throw error;
  }
}
