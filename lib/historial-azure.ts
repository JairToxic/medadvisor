import "server-only";
import { getContenedorHistorial } from "@/lib/azure/blob";
import type { EventoAtencion } from "@/lib/tipos";

const cache = new Map<string, { en: number; valor: EventoAtencion[] }>();
const TTL_MS = 60 * 1000;

export async function cargarHistorial(idPaciente: string): Promise<EventoAtencion[]> {
  const cached = cache.get(idPaciente);
  if (cached && Date.now() - cached.en < TTL_MS) return cached.valor;

  const cont = getContenedorHistorial();
  const blob = cont.getBlockBlobClient(`${idPaciente}.json`);
  try {
    const buffer = await blob.downloadToBuffer();
    const valor = JSON.parse(buffer.toString("utf-8")) as EventoAtencion[];
    cache.set(idPaciente, { en: Date.now(), valor });
    return valor;
  } catch {
    return [];
  }
}

export function invalidarCacheHistorial() {
  cache.clear();
}
