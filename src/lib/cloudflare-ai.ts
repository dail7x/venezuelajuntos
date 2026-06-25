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

Devuelve ÚNICAMENTE el JSON, sin texto adicional ni bloques de markdown. 
Ejemplo de formato: {"location_zone": "La Guaira", "location_normalized": "Edificio Los Cocos, Av Principal, La Guaira"}
IMPORTANTE: Usa los nombres y lugares de la 'Dirección cruda'. NO uses el texto del ejemplo anterior si no está en la 'Dirección cruda'. Si la dirección no menciona edificios, no los inventes. Si no estás seguro o es muy ambigua, simplemente repite la 'Dirección cruda' en 'location_normalized'.`;

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
      return { location_zone: null, location_normalized: null };
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
      location_zone: parsed.location_zone || null,
      location_normalized: parsed.location_normalized || null
    };
  } catch (error) {
    console.error("Failed to parse address with AI:", error);
    return { location_zone: null, location_normalized: null };
  }
}

export async function extractNamesFromHospitalList(sourceType: "image" | "tweet", sourceData: string) {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!accountId || !apiToken) {
    throw new Error("Cloudflare AI credentials missing");
  }

  const prompt = `Eres un asistente que extrae información de listas de pacientes en hospitales.
De la información provista, extrae todos los nombres de personas y devuelve un JSON.
El formato debe ser EXACTAMENTE este:
{
  "hospital_name": "Nombre del hospital si se menciona, o null",
  "people": [
    {
      "full_name": "Nombre completo",
      "cedula_identidad": numero_o_null,
      "age_estimated": numero_o_null,
      "status": "located" o "deceased"
    }
  ]
}
Devuelve ÚNICAMENTE el JSON, sin markdown, sin explicaciones.`;

  let messages: any[] = [];

  if (sourceType === "image") {
    // sourceData is a base64 encoded image
    // Note: Cloudflare's multimodal API format usually expects base64 inside the message or via bytes array.
    // Llama 3.2 Vision uses a specific format.
    messages = [
      { role: "user", content: prompt },
      { role: "user", content: "Extrae de la siguiente imagen:" },
      // The image format depends on the exact CF API, but generally it's passed as an object with `image`
      { role: "user", content: [{ type: "image_url", image_url: { url: `data:image/jpeg;base64,${sourceData}` } }] }
    ];
  } else {
    // sourceData is text/tweet
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
      cleanJson = responseRaw.replace(/```json/gi, '').replace(/```/g, '').trim();
    } else if (typeof responseRaw === 'object' && responseRaw !== null) {
      cleanJson = JSON.stringify(responseRaw);
    }
    
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error("Failed to extract names with AI:", error);
    throw error;
  }
}
