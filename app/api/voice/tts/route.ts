import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { config } from "@/lib/azure/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  text: z.string().min(1).max(2000),
  idioma: z.enum(["es", "en"]).default("es"),
});

function escaparXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { text, idioma } = parsed.data;

  // Limpiar markdown del texto antes de TTS (** → nada, etc.)
  const limpio = text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/[*_~`]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const voz = idioma === "es" ? config.speech.voiceEs : config.speech.voiceEn;
  const lang = idioma === "es" ? "es-EC" : "en-US";

  const ssml = `<speak version='1.0' xml:lang='${lang}'>
  <voice name='${voz}'>
    <prosody rate='-3%' pitch='+1%'>${escaparXml(limpio)}</prosody>
  </voice>
</speak>`;

  const url = `https://${config.speech.region}.tts.speech.microsoft.com/cognitiveservices/v1`;

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": config.speech.key,
      "Content-Type": "application/ssml+xml",
      "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
      "User-Agent": "medadvisor",
    },
    body: ssml,
  });

  if (!resp.ok) {
    const detail = await resp.text();
    return NextResponse.json({ error: `Speech TTS ${resp.status}`, detail }, { status: 502 });
  }

  const audio = await resp.arrayBuffer();
  return new Response(audio, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
    },
  });
}
