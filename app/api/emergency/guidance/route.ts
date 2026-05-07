import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { DEPLOYMENTS, getOpenAI } from "@/lib/azure/openai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  sintomas: z.string(),
  especialidad: z.string().optional(),
  pacienteNombre: z.string().optional(),
  preexisting: z.array(z.string()).optional(),
  durationSeconds: z.number().min(15).max(300),
  idioma: z.enum(["es", "en"]).default("es"),
});

const PROMPT = `Eres un asistente médico que da CONSEJOS DE PRIMEROS AUXILIOS a un paciente que está esperando una ambulancia, mientras llega.

REGLAS DE SEGURIDAD:
- Consejos cortos, accionables, una oración cada uno.
- No diagnostiques. No prescribas dosis específicas excepto medidas universalmente seguras (ej. aspirina masticable 100-300mg en sospecha de síndrome coronario, salvo alergia conocida).
- Tono empático, firme, claro.
- Acciones que el paciente PUEDE hacer AHORA, sin equipo médico.
- Llama al paciente por su nombre de pila.
- Considera sus pre-existencias.

DEVUELVE EXACTAMENTE 4 TIPS en JSON. El último debe ser un anuncio de llegada inminente:

{
  "tips": [
    {"icon": "calma", "text": "..."},
    {"icon": "posicion|medicacion|signos", "text": "..."},
    {"icon": "posicion|medicacion|signos", "text": "..."},
    {"icon": "llegada", "text": "..."}
  ]
}

Iconos sugeridos: calma · posicion · medicacion · signos · llegada
Idioma: el indicado por el usuario.`;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { sintomas, especialidad, pacienteNombre, preexisting, durationSeconds, idioma } = parsed.data;

  const userMsg =
    `Síntoma: "${sintomas}"\n` +
    `Especialidad sugerida: ${especialidad ?? "Emergencias"}\n` +
    `Paciente: ${pacienteNombre ?? "el paciente"}\n` +
    `Pre-existencias: ${(preexisting ?? []).join(", ") || "ninguna"}\n` +
    `Duración total de la espera: ${durationSeconds} segundos\n` +
    `Idioma de respuesta: ${idioma === "es" ? "español" : "English"}`;

  try {
    const openai = getOpenAI();
    const resp = await openai.chat.completions.create({
      model: DEPLOYMENTS.chat,
      messages: [
        { role: "system", content: PROMPT },
        { role: "user", content: userMsg },
      ],
      temperature: 0.5,
      response_format: { type: "json_object" },
      max_tokens: 500,
    });

    const txt = resp.choices[0]?.message?.content ?? "{}";
    const data = JSON.parse(txt) as { tips?: { icon?: string; text?: string }[] };
    const lista = (data.tips ?? []).filter((t) => t.text).slice(0, 4);

    // Programación: 5%, 30%, 60%, 85% de la duración
    const fracs = [0.05, 0.3, 0.6, 0.85];
    const totalMs = durationSeconds * 1000;
    const tips = lista.map((t, i) => ({
      atMs: Math.round(totalMs * (fracs[i] ?? 0.5)),
      icon: t.icon ?? "calma",
      text: t.text!,
    }));

    return NextResponse.json({ tips });
  } catch (err) {
    return NextResponse.json(
      { error: "guidance falló", detail: String(err) },
      { status: 502 },
    );
  }
}
