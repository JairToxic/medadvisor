import "server-only";
import { DEPLOYMENTS, getOpenAI } from "@/lib/azure/openai";
import { getSearchClient } from "@/lib/azure/search";
import { cargarPolizaParseada } from "@/lib/poliza-loader";
import { generarEmbedding } from "@/lib/embeddings";
import { contextoCoordinator, PROMPT_COORDINATOR, PROMPT_TRIAGE } from "@/lib/prompts";
import type {
  ClausulaCitada,
  Doctor,
  EventoAtencion,
  HospitalRecomendado,
  Idioma,
  Paciente,
} from "@/lib/tipos";

export interface ResultadoTriage {
  sintomas: string;
  especialidad: string;
  urgencia: "normal" | "urgente" | "emergencia";
  redFlags: string[];
  resumenClinico: string;
  tipoConsulta: "propio" | "tercero";
}

export interface ResultadoCobertura {
  porcentaje: number;
  deducible: number;
  preexistenciaCubierta: boolean;
  nota: string;
  fuente: "blob-ocr" | "fallback-local";
  coberturaUsada: string;
  clausulaCitada?: ClausulaCitada;
}

export async function ejecutarTriage(
  sintoma: string,
  paciente: Paciente,
  idioma: Idioma,
  historial: EventoAtencion[],
): Promise<ResultadoTriage> {
  const openai = getOpenAI();
  const historialResumen =
    historial.length === 0
      ? "Sin atenciones previas registradas."
      : historial
          .slice(-3)
          .map((e) => `- ${e.fecha}: ${e.especialidad} por "${e.motivo}" (${e.diagnostico ?? "sin nota"})`)
          .join("\n");
  const userMsg = `Paciente: ${paciente.name}, ${paciente.age} años, ${paciente.city}. Pre-existencias: ${paciente.preexisting.join(", ") || "ninguna"}.\n\nÚltimas atenciones:\n${historialResumen}\n\nSíntoma actual: "${sintoma}"\nIdioma del síntoma: ${idioma === "es" ? "español" : "English"}`;

  const respuesta = await openai.chat.completions.create({
    model: DEPLOYMENTS.chat,
    messages: [
      { role: "system", content: PROMPT_TRIAGE },
      { role: "user", content: userMsg },
    ],
    temperature: 0.2,
    response_format: { type: "json_object" },
    max_tokens: 400,
  });

  const txt = respuesta.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(txt) as ResultadoTriage;
  return {
    sintomas: parsed.sintomas ?? "síntoma sin clasificar",
    especialidad: parsed.especialidad ?? "Medicina General",
    urgencia: (parsed.urgencia ?? "normal") as ResultadoTriage["urgencia"],
    redFlags: Array.isArray(parsed.redFlags) ? parsed.redFlags : [],
    resumenClinico: parsed.resumenClinico ?? "",
    tipoConsulta: parsed.tipoConsulta === "tercero" ? "tercero" : "propio",
  };
}

interface DocClausula {
  id: string;
  pacienteId: string;
  seccion: string;
  texto: string;
  insurer: string;
  policyNo: string;
  texto_vector?: number[];
}

export async function ejecutarCobertura(
  triage: ResultadoTriage,
  paciente: Paciente,
): Promise<ResultadoCobertura> {
  let porcentaje = 0;
  let coberturaUsada = "Consulta externa";
  let deducible = 0;
  let fuente: ResultadoCobertura["fuente"] = "blob-ocr";

  // 1. Cálculo determinístico desde el JSON parseado del OCR
  try {
    const poliza = await cargarPolizaParseada(paciente.id);

    if (triage.urgencia === "emergencia") {
      const emerg = poliza.coverages.find((c) => /emergencia/i.test(c.type));
      if (emerg) {
        porcentaje = emerg.pct;
        coberturaUsada = emerg.type;
      }
    }

    if (porcentaje === 0) {
      const especialidadLower = triage.especialidad.toLowerCase();
      // Buscar match exacto primero (cardiología, neurología...)
      let match = poliza.coverages.find((c) => c.type.toLowerCase().includes(especialidadLower));
      // Si no, fallback a Hospitalización (la mayor) o Consulta externa
      if (!match) {
        const hosp = poliza.coverages.find((c) => /hospital/i.test(c.type));
        const cons = poliza.coverages.find((c) => /consulta/i.test(c.type));
        match = hosp ?? cons;
      }
      if (match) {
        porcentaje = match.pct;
        coberturaUsada = match.type;
      }
    }

    deducible =
      poliza.deductible.pending ??
      Math.max(0, (poliza.deductible.annual ?? 0) - (poliza.deductible.used ?? 0));
  } catch {
    fuente = "fallback-local";
    const especialidadLower = triage.especialidad.toLowerCase();
    const cov =
      paciente.coverages.find((c) => c.type.es.toLowerCase().includes(especialidadLower)) ??
      paciente.coverages.find((c) => /hospital/i.test(c.type.es)) ??
      paciente.coverages.find((c) => /consulta/i.test(c.type.es));
    if (cov) {
      porcentaje = cov.pct;
      coberturaUsada = cov.type.es;
    }
    if (triage.urgencia === "emergencia") {
      const emerg = paciente.coverages.find((c) => /emergencia/i.test(c.type.es));
      if (emerg) {
        porcentaje = emerg.pct;
        coberturaUsada = emerg.type.es;
      }
    }
    deducible = Math.max(0, paciente.deductible.annual - paciente.deductible.used);
  }

  // 2. RAG vectorial para citar la cláusula textual aplicable
  let clausulaCitada: ClausulaCitada | undefined;
  try {
    const consulta = `Cobertura para ${triage.especialidad}${triage.urgencia === "emergencia" ? " (emergencia)" : ""}`;
    const vector = await generarEmbedding(consulta);
    const cli = getSearchClient<DocClausula>("polizas-clausulas");
    const resp = await cli.search(undefined, {
      filter: `pacienteId eq '${paciente.id}'`,
      top: 1,
      vectorSearchOptions: {
        queries: [
          {
            kind: "vector",
            vector,
            kNearestNeighborsCount: 5,
            fields: ["texto_vector"],
          },
        ],
      },
    });
    for await (const r of resp.results) {
      const doc = r.document as DocClausula;
      clausulaCitada = {
        seccion: doc.seccion,
        texto: doc.texto,
        pacienteId: doc.pacienteId,
      };
      break;
    }
  } catch (err) {
    console.warn("[cobertura] RAG vectorial falló:", err);
  }

  const preexistenciaRelacionada = paciente.preexisting.some((pre) => {
    if (triage.especialidad === "Neurología" && /migra/i.test(pre)) return true;
    if (triage.especialidad === "Cardiología" && /(diabet|cardi|hipert)/i.test(pre)) return true;
    if (triage.especialidad === "Reumatología" && /(artrit|fibr|lupus)/i.test(pre)) return true;
    return false;
  });

  return {
    porcentaje,
    deducible,
    preexistenciaCubierta: preexistenciaRelacionada,
    coberturaUsada,
    fuente,
    clausulaCitada,
    nota:
      triage.urgencia === "emergencia"
        ? `Cobertura ${porcentaje}% por urgencia emergente`
        : `${porcentaje}% en red preferente para ${triage.especialidad}`,
  };
}

interface DocHospital {
  id: string;
  tipo: string;
  name: string;
  city: string;
  fee: number;
  rating: number;
  wait: number;
  lat?: number;
  lng?: number;
  location?: unknown;
  specialties?: string[];
  acceptsInsurers?: string[];
}

interface DocDoctor {
  id: string;
  tipo: string;
  name: string;
  specialty: string;
  hospitalId: string;
  rating: number;
  schedule: string;
}

function distanciaKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return R * c;
}

export async function recomendarConSearch(
  triage: ResultadoTriage,
  paciente: Paciente,
  cobertura: ResultadoCobertura,
  ubicacion?: { lat: number; lng: number },
): Promise<HospitalRecomendado[]> {
  const cliDir = getSearchClient<DocHospital | DocDoctor>("directorio");

  // Filtros: solo hospitales que ofrezcan la especialidad y acepten al insurer
  const especialidadEsc = triage.especialidad.replace(/'/g, "''");
  const insurerEsc = paciente.insurer.replace(/'/g, "''");
  const filtroPartes = [
    "tipo eq 'hospital'",
    `specialties/any(s: s eq '${especialidadEsc}')`,
    `acceptsInsurers/any(i: i eq '${insurerEsc}')`,
  ];

  const orderBy: string[] = [];
  if (ubicacion) {
    orderBy.push(`geo.distance(location, geography'POINT(${ubicacion.lng} ${ubicacion.lat})') asc`);
  } else {
    // Sin ubicación: ordenar por ciudad del paciente primero, luego por fee
    orderBy.push("fee asc");
  }

  const resp = await cliDir.search("*", {
    filter: filtroPartes.join(" and "),
    orderBy,
    top: 8,
  });

  const hospitales: DocHospital[] = [];
  for await (const r of resp.results) {
    const doc = r.document as DocHospital;
    if (doc.tipo === "hospital") hospitales.push(doc);
  }

  // Si no hay matches con todos los filtros, relajar (sin acepta_insurer)
  if (hospitales.length === 0) {
    const respLax = await cliDir.search("*", {
      filter: `tipo eq 'hospital' and specialties/any(s: s eq '${especialidadEsc}')`,
      orderBy,
      top: 8,
    });
    for await (const r of respLax.results) {
      const doc = r.document as DocHospital;
      if (doc.tipo === "hospital") hospitales.push(doc);
    }
  }

  const enRed = new Set(paciente.network);

  const top = hospitales.slice(0, 5);

  // Buscar 1 doctor por hospital recomendado
  const doctores = new Map<string, Doctor>();
  for (const h of top) {
    try {
      const respDoc = await cliDir.search("*", {
        filter: `tipo eq 'doctor' and hospitalId eq '${h.id}' and specialty eq '${especialidadEsc}'`,
        orderBy: ["rating desc"],
        top: 1,
      });
      for await (const r of respDoc.results) {
        const d = r.document as DocDoctor;
        doctores.set(h.id, {
          id: d.id,
          name: d.name,
          specialty: d.specialty,
          hospitalId: d.hospitalId,
          hospitalName: h.name,
          rating: d.rating,
          yearsExperience: 0,
          languages: [],
          schedule: d.schedule,
          bio: "",
        });
      }
    } catch {
      // Si falla la búsqueda de doctor, seguimos sin él
    }
  }

  const recs: HospitalRecomendado[] = top.map((h) => {
    const inNet = enRed.has(h.id);
    const aplicarCop = inNet || h.acceptsInsurers?.includes(paciente.insurer);
    const coveredPct = aplicarCop ? cobertura.porcentaje : 0;
    const copago = Math.round(h.fee * (1 - coveredPct / 100));
    const lat = typeof h.lat === "number" ? h.lat : 0;
    const lng = typeof h.lng === "number" ? h.lng : 0;
    const distKm =
      ubicacion && lat !== 0 && lng !== 0
        ? Number(distanciaKm({ lat: ubicacion.lat, lng: ubicacion.lng }, { lat, lng }).toFixed(1))
        : 0;
    const doc = doctores.get(h.id);
    return {
      id: h.id,
      name: h.name,
      city: h.city,
      fee: h.fee,
      rating: h.rating,
      wait: h.wait,
      lat,
      lng,
      inNet,
      coveredPct,
      copago,
      distKm,
      doctorSugerido: doc
        ? { id: doc.id, name: doc.name, rating: doc.rating, schedule: doc.schedule }
        : undefined,
    };
  });

  // Orden final: en red primero, luego copago ascendente
  recs.sort((a, b) => {
    if (a.inNet !== b.inNet) return a.inNet ? -1 : 1;
    if (ubicacion) return a.distKm - b.distKm;
    return a.copago - b.copago;
  });

  return recs.slice(0, 3);
}

export async function* streamCoordinator(args: {
  paciente: Paciente;
  idioma: Idioma;
  triage: ResultadoTriage;
  cobertura: ResultadoCobertura;
  recomendaciones: HospitalRecomendado[];
  historial: EventoAtencion[];
}): AsyncGenerator<string> {
  const openai = getOpenAI();
  const ctx = contextoCoordinator({
    paciente: args.paciente,
    idioma: args.idioma,
    triage: args.triage,
    cobertura: args.cobertura,
    recomendaciones: args.recomendaciones,
    historial: args.historial,
  });

  const stream = await openai.chat.completions.create({
    model: DEPLOYMENTS.chat,
    messages: [
      { role: "system", content: PROMPT_COORDINATOR },
      { role: "user", content: ctx },
    ],
    temperature: 0.6,
    max_tokens: 360,
    stream: true,
  });

  for await (const chunk of stream) {
    const token = chunk.choices?.[0]?.delta?.content;
    if (token) yield token;
  }
}
