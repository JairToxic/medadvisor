import "server-only";
import { getContenedorPolizas } from "@/lib/azure/blob";
import type { PolizaExtraida } from "@/lib/poliza-parser";

const cache = new Map<string, { en: number; valor: PolizaExtraida }>();
const TTL_MS = 5 * 60 * 1000;

async function descargarTexto(blobName: string): Promise<string> {
  const cont = getContenedorPolizas();
  const blob = cont.getBlockBlobClient(blobName);
  const buffer = await blob.downloadToBuffer();
  return buffer.toString("utf-8");
}

export async function cargarPolizaParseada(idPaciente: string): Promise<PolizaExtraida> {
  const cached = cache.get(idPaciente);
  if (cached && Date.now() - cached.en < TTL_MS) return cached.valor;

  const txt = await descargarTexto(`${idPaciente}.poliza.json`);
  const valor = JSON.parse(txt) as PolizaExtraida;
  cache.set(idPaciente, { en: Date.now(), valor });
  return valor;
}

export function invalidarCachePoliza(idPaciente?: string) {
  if (idPaciente) cache.delete(idPaciente);
  else cache.clear();
}
