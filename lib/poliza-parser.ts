import "server-only";

export interface PolizaExtraida {
  insurer?: string;
  plan?: string;
  policyNo?: string;
  validity?: string;
  status?: string;
  deductible: { annual?: number; used?: number; pending?: number };
  coverages: { type: string; pct: number }[];
  network: string[];
  preexisting?: string;
  raw: Record<string, unknown>;
}

interface Tabla {
  rowCount?: number;
  columnCount?: number;
  cells?: { rowIndex: number; columnIndex: number; content?: string }[];
}

interface DocIntelResult {
  content?: string;
  tables?: Tabla[];
  paragraphs?: { content?: string }[];
}

const NORM = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

function parseMonto(linea: string | undefined): number | undefined {
  if (!linea) return undefined;
  const m = linea.match(/\$?\s*([\d.,]+)/);
  if (!m) return undefined;
  const num = parseFloat(m[1].replace(/,/g, ""));
  return Number.isFinite(num) ? num : undefined;
}

function parsePct(v?: string): number | undefined {
  if (!v) return undefined;
  const m = v.match(/(\d+)\s*%/);
  return m ? parseInt(m[1], 10) : undefined;
}

function despuesDe(content: string, etiqueta: string): string | undefined {
  const re = new RegExp(`${etiqueta}\\s*:?\\s*\\n?\\s*([^\\n]+)`, "i");
  const m = content.match(re);
  return m ? m[1].trim() : undefined;
}

export function parsePolizaExtraida(json: unknown): PolizaExtraida {
  const root = json as { analyzeResult?: DocIntelResult } & DocIntelResult;
  const result: DocIntelResult = root.analyzeResult ?? root;
  const content = result.content ?? "";
  const tablas = result.tables ?? [];

  // Cabecera (primera línea)
  const primeraLinea = content.split("\n")[0] ?? "";
  const insurerMatch = primeraLinea.match(/^(.+?)\s+Plan\s+(.+?)\s+Póliza\s+N°?\s*(\S+)/i);
  const insurer = insurerMatch?.[1]?.trim();
  const plan = insurerMatch?.[2]?.trim();
  const policyNo = insurerMatch?.[3]?.trim();

  // Datos lineales
  const validity = despuesDe(content, "Vigencia");
  const status = despuesDe(content, "Estado");
  const preexisting = despuesDe(content, "Pre-existencias declaradas");

  const dedAnual = parseMonto(despuesDe(content, "Deducible anual"));
  const dedUsado = parseMonto(despuesDe(content, "Consumido en el año"));
  const dedPendiente = parseMonto(despuesDe(content, "Pendiente"));

  // Coberturas: tabla con encabezado "Tipo" y "Porcentaje"
  const coverages: { type: string; pct: number }[] = [];
  for (const t of tablas) {
    if (!t.cells || !t.rowCount || !t.columnCount) continue;
    const header = t.cells.filter((c) => c.rowIndex === 0).map((c) => NORM(c.content ?? ""));
    const tieneTipo = header.some((h) => h.includes("tipo"));
    const tienePct = header.some((h) => h.includes("porcentaje") || h.includes("cubierto"));
    if (!tieneTipo || !tienePct) continue;
    const idxTipo = header.findIndex((h) => h.includes("tipo"));
    const idxPct = header.findIndex((h) => h.includes("porcentaje") || h.includes("cubierto"));
    for (let r = 1; r < t.rowCount; r++) {
      const fila = t.cells.filter((c) => c.rowIndex === r);
      const tipo = fila.find((c) => c.columnIndex === idxTipo)?.content?.trim();
      const pctStr = fila.find((c) => c.columnIndex === idxPct)?.content;
      const pct = parsePct(pctStr);
      if (tipo && pct !== undefined) coverages.push({ type: tipo, pct });
    }
  }

  // Red preferente: el texto entre "RED PREFERENTE DE HOSPITALES" y la siguiente sección
  const network: string[] = [];
  const reRed = /RED PREFERENTE[^\n]*\n([\s\S]+?)(?=\n[A-ZÁÉÍÓÚÑ\s]{4,}\n|Documento\s+ficticio|$)/i;
  const matchRed = content.match(reRed);
  if (matchRed) {
    const bloque = matchRed[1];
    // Cada hospital sigue el patrón "Hospital <nombre> (<ciudad>)"
    const reHosp = /Hospital\s+[A-Za-zÀ-ÿ.+\-\s]+?\s*\([^)]+\)/g;
    const hits = bloque.match(reHosp) ?? [];
    for (const h of hits) {
      network.push(h.replace(/\s+/g, " ").trim());
    }
    if (network.length === 0) {
      // fallback: separar por saltos de línea
      bloque
        .split(/\n+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && !/^Documento/i.test(s))
        .forEach((s) => network.push(s));
    }
  }

  return {
    insurer,
    plan,
    policyNo,
    validity,
    status,
    preexisting,
    deductible: { annual: dedAnual, used: dedUsado, pending: dedPendiente },
    coverages,
    network,
    raw: result as unknown as Record<string, unknown>,
  };
}
