import "server-only";
import { getContenedorPacientes } from "@/lib/azure/blob";
import type { Paciente } from "@/lib/tipos";

interface CacheEntrada<T> {
  en: number;
  valor: T;
}

const TTL_MS = 60 * 1000;
const cacheUno = new Map<string, CacheEntrada<Paciente>>();
let cacheLista: CacheEntrada<Paciente[]> | null = null;

async function descargar(blob: string): Promise<string | null> {
  const cont = getContenedorPacientes();
  const cli = cont.getBlockBlobClient(blob);
  try {
    const buffer = await cli.downloadToBuffer();
    return buffer.toString("utf-8");
  } catch {
    return null;
  }
}

export async function obtenerPaciente(id: string): Promise<Paciente | null> {
  const cached = cacheUno.get(id);
  if (cached && Date.now() - cached.en < TTL_MS) return cached.valor;

  const txt = await descargar(`${id}.json`);
  if (!txt) return null;
  const valor = JSON.parse(txt) as Paciente;
  cacheUno.set(id, { en: Date.now(), valor });
  return valor;
}

export async function listarPacientes(): Promise<Paciente[]> {
  if (cacheLista && Date.now() - cacheLista.en < TTL_MS) return cacheLista.valor;

  const cont = getContenedorPacientes();
  const ids: string[] = [];
  try {
    for await (const blob of cont.listBlobsFlat()) {
      if (blob.name.endsWith(".json")) {
        ids.push(blob.name.replace(/\.json$/, ""));
      }
    }
  } catch {
    return [];
  }

  const pacientes = await Promise.all(ids.map((id) => obtenerPaciente(id)));
  const valor = pacientes.filter((p): p is Paciente => p !== null);

  // Orden estable: el orden semilla (juan, maria, pedro, lucia, roberto) primero,
  // luego alfabético.
  const orden = ["juan", "maria", "pedro", "lucia", "roberto"];
  valor.sort((a, b) => {
    const ia = orden.indexOf(a.id);
    const ib = orden.indexOf(b.id);
    if (ia >= 0 && ib >= 0) return ia - ib;
    if (ia >= 0) return -1;
    if (ib >= 0) return 1;
    return a.name.localeCompare(b.name);
  });

  cacheLista = { en: Date.now(), valor };
  return valor;
}

export function invalidarCachePacientes() {
  cacheUno.clear();
  cacheLista = null;
}
