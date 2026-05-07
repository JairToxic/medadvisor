import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { DEPLOYMENTS, getOpenAI } from "@/lib/azure/openai";
import { checkRateLimit, respuesta429 } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const PROMPT_VISION = `Eres un asistente médico que describe brevemente lo que ve en una imagen subida por un paciente.

REGLAS ESTRICTAS:
- No diagnostiques. No recetes medicamentos.
- Describe lo que ves clínicamente: ubicación, color, tamaño, características relevantes.
- Sugiere la especialidad médica más adecuada para evaluarlo.
- Indica si hay signos de alarma que requieran atención inmediata.
- Máximo 3 oraciones.
- Si la imagen no muestra algo de relevancia clínica, indícalo amablemente.
- Resalta la especialidad sugerida con **negritas**.

ESQUEMA DE RESPUESTA:
{
  "descripcion": "string, una frase describiendo lo que se observa",
  "especialidadSugerida": "string, una de: Dermatología, Traumatología, Oftalmología, ...",
  "urgencia": "string, una de: normal | urgente | emergencia",
  "respuesta": "string, respuesta completa al paciente con tono empático (1-3 frases)"
}

Devuelve SOLO el JSON, sin texto adicional.`;

export async function POST(req: NextRequest) {
  // 20 análisis de imagen / hora / IP — Vision es más caro
  const lim = checkRateLimit(req, "vision", 20, 60 * 60 * 1000);
  if (!lim.ok) return respuesta429(lim.retryAfterSeconds!);

  const formData = await req.formData().catch(() => null);
  const archivo = formData?.get("image");
  const idioma = (formData?.get("idioma") as string) ?? "es";
  const captionRaw = formData?.get("caption");
  const caption = typeof captionRaw === "string" ? captionRaw.trim() : "";

  if (!(archivo instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo (campo 'image')" }, { status: 400 });
  }
  if (!archivo.type.startsWith("image/")) {
    return NextResponse.json({ error: "El archivo no es una imagen" }, { status: 400 });
  }
  if (archivo.size > 8 * 1024 * 1024) {
    return NextResponse.json({ error: "Imagen demasiado grande (>8MB)" }, { status: 413 });
  }

  const buffer = Buffer.from(await archivo.arrayBuffer());
  const base64 = buffer.toString("base64");
  const dataUrl = `data:${archivo.type};base64,${base64}`;

  const openai = getOpenAI();

  try {
    const textoUsuario = caption
      ? `El paciente dice: "${caption}". Analiza la imagen junto con ese contexto y sugiere especialidad médica. Idioma de respuesta: ${idioma === "es" ? "español" : "English"}.`
      : `Analiza esta imagen y sugiere especialidad médica. Idioma de respuesta: ${idioma === "es" ? "español" : "English"}.`;

    const resp = await openai.chat.completions.create({
      model: DEPLOYMENTS.chat,
      messages: [
        { role: "system", content: PROMPT_VISION },
        {
          role: "user",
          content: [
            { type: "text", text: textoUsuario },
            {
              type: "image_url",
              image_url: { url: dataUrl },
            },
          ],
        },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
      max_tokens: 400,
    });

    const txt = resp.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(txt) as {
      descripcion?: string;
      especialidadSugerida?: string;
      urgencia?: string;
      respuesta?: string;
    };

    return NextResponse.json({
      ok: true,
      descripcion: parsed.descripcion ?? "",
      especialidadSugerida: parsed.especialidadSugerida ?? "Medicina General",
      urgencia: parsed.urgencia ?? "normal",
      respuesta:
        parsed.respuesta ??
        parsed.descripcion ??
        (idioma === "es"
          ? "No pude analizar bien la imagen, ¿podrías describir lo que ves?"
          : "I couldn't analyze the image well — could you describe what you see?"),
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    const lower = detail.toLowerCase();
    const filtrado =
      lower.includes("content safety") ||
      lower.includes("content_filter") ||
      lower.includes("responsibleaipolicyviolation") ||
      lower.includes("not allowed by our content");

    if (filtrado) {
      return NextResponse.json(
        {
          contentFiltered: true,
          message:
            idioma === "es"
              ? "Azure Content Safety bloqueó la imagen. Describe lo que pasó por texto y te ayudo."
              : "Azure Content Safety blocked the image. Describe what happened in text and I'll help.",
        },
        { status: 422 },
      );
    }

    return NextResponse.json(
      { error: "Vision fallo", detail },
      { status: 502 },
    );
  }
}
