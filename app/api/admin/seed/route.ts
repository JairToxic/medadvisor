import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { tieneAdminToken } from "@/lib/rate-limit";
import {
  type SearchField,
  type SearchIndex,
  type VectorSearch,
} from "@azure/search-documents";
import { generarPolizaPdf } from "@/lib/poliza-pdf";
import { parsePolizaExtraida, type PolizaExtraida } from "@/lib/poliza-parser";
import {
  getContenedorPolizas,
  getContenedorPacientes,
  getContenedorHistorial,
} from "@/lib/azure/blob";
import { getDocIntel } from "@/lib/azure/docintel";
import { getSearchClient, getSearchIndexClient } from "@/lib/azure/search";
import { config as azureConfig } from "@/lib/azure/config";
import { generarEmbeddingsLote } from "@/lib/embeddings";
import { SEED_PACIENTES } from "@/lib/pacientes-seed";
import { SEED_HOSPITALES } from "@/lib/hospitales-seed";
import { SEED_DOCTORES } from "@/lib/doctores-seed";
import { SEED_PROCEDIMIENTOS } from "@/lib/procedimientos-seed";
import { SEED_HISTORIALES } from "@/lib/historiales-seed";
import { invalidarCachePacientes } from "@/lib/pacientes-azure";
import { invalidarCachePoliza } from "@/lib/poliza-loader";
import { invalidarCacheHistorial } from "@/lib/historial-azure";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

interface AnalyzeStatus {
  status?: "notStarted" | "running" | "succeeded" | "failed";
  analyzeResult?: Record<string, unknown>;
  error?: { message?: string };
}

// ============================================================
// 1. Esquema del índice DIRECTORIO (hospitales + doctores)
// ============================================================
const fieldsDirectorio: SearchField[] = [
  { name: "id", type: "Edm.String", key: true, filterable: true },
  { name: "tipo", type: "Edm.String", filterable: true, facetable: true },
  { name: "name", type: "Edm.String", searchable: true, sortable: false },
  { name: "city", type: "Edm.String", filterable: true, facetable: true },
  { name: "district", type: "Edm.String", filterable: true },
  { name: "address", type: "Edm.String", searchable: true },
  { name: "phone", type: "Edm.String" },
  { name: "rating", type: "Edm.Double", filterable: true, sortable: true },
  { name: "description", type: "Edm.String", searchable: true },
  { name: "location", type: "Edm.GeographyPoint", filterable: true, sortable: true },
  { name: "lat", type: "Edm.Double", filterable: true },
  { name: "lng", type: "Edm.Double", filterable: true },
  // hospital
  { name: "hospitalType", type: "Edm.String", filterable: true, facetable: true },
  { name: "level", type: "Edm.Int32", filterable: true },
  { name: "fee", type: "Edm.Int32", filterable: true, sortable: true },
  { name: "wait", type: "Edm.Int32", filterable: true, sortable: true },
  { name: "specialties", type: "Collection(Edm.String)", filterable: true, facetable: true },
  { name: "acceptsInsurers", type: "Collection(Edm.String)", filterable: true, facetable: true },
  { name: "services", type: "Collection(Edm.String)", filterable: true },
  // doctor
  { name: "specialty", type: "Edm.String", filterable: true, facetable: true },
  { name: "hospitalId", type: "Edm.String", filterable: true },
  { name: "hospitalName", type: "Edm.String", filterable: true, searchable: true },
  { name: "yearsExperience", type: "Edm.Int32", filterable: true, sortable: true },
  { name: "languages", type: "Collection(Edm.String)", filterable: true },
  { name: "schedule", type: "Edm.String" },
  { name: "bio", type: "Edm.String", searchable: true },
];

// ============================================================
// 2. Esquema del índice POLIZAS-CLAUSULAS (vectorial)
// ============================================================
const VECTOR_PROFILE = "perfil-vector";
const VECTOR_ALGO = "algo-hnsw";

const vectorSearch: VectorSearch = {
  algorithms: [
    {
      name: VECTOR_ALGO,
      kind: "hnsw",
      parameters: { m: 4, efConstruction: 400, efSearch: 500, metric: "cosine" },
    },
  ],
  profiles: [
    {
      name: VECTOR_PROFILE,
      algorithmConfigurationName: VECTOR_ALGO,
    },
  ],
};

const fieldsPolizas: SearchField[] = [
  { name: "id", type: "Edm.String", key: true, filterable: true },
  { name: "pacienteId", type: "Edm.String", filterable: true, facetable: true },
  { name: "policyNo", type: "Edm.String", filterable: true },
  { name: "insurer", type: "Edm.String", filterable: true, facetable: true },
  { name: "seccion", type: "Edm.String", filterable: true, facetable: true },
  { name: "texto", type: "Edm.String", searchable: true },
  {
    name: "texto_vector",
    type: "Collection(Edm.Single)",
    searchable: true,
    vectorSearchDimensions: 3072,
    vectorSearchProfileName: VECTOR_PROFILE,
  },
];

// ============================================================
// 3. Esquema del índice PROCEDIMIENTOS
// ============================================================
const fieldsProcedimientos: SearchField[] = [
  { name: "id", type: "Edm.String", key: true, filterable: true },
  { name: "name", type: "Edm.String", searchable: true },
  { name: "specialty", type: "Edm.String", filterable: true, facetable: true },
  { name: "avgCostLow", type: "Edm.Int32", filterable: true, sortable: true },
  { name: "avgCostHigh", type: "Edm.Int32", filterable: true, sortable: true },
  { name: "description", type: "Edm.String", searchable: true },
  { name: "requires", type: "Edm.String" },
];

// ============================================================
// Helpers
// ============================================================

function partirPolizaEnClausulas(paciente: { id: string; insurer: string; policyNo: string }, parsed: PolizaExtraida) {
  const clausulas: { seccion: string; texto: string }[] = [];

  // Cláusula deducible
  if (parsed.deductible.annual !== undefined) {
    clausulas.push({
      seccion: "Deducible",
      texto: `Deducible anual de la póliza: $${parsed.deductible.annual}. Consumido año actual: $${parsed.deductible.used ?? 0}. Pendiente por consumir: $${parsed.deductible.pending ?? (parsed.deductible.annual - (parsed.deductible.used ?? 0))}. El deducible aplica a la suma de copagos antes de que el seguro cubra el porcentaje contratado.`,
    });
  }

  // Cláusula vigencia
  if (parsed.validity) {
    clausulas.push({
      seccion: "Vigencia",
      texto: `Período de vigencia de la póliza: ${parsed.validity}. Estado: ${parsed.status ?? "VIGENTE"}.`,
    });
  }

  // Una cláusula por cobertura
  for (const cov of parsed.coverages) {
    clausulas.push({
      seccion: "Coberturas",
      texto: `Cobertura para ${cov.type}: el plan cubre el ${cov.pct}% del costo total cuando la atención se presta en la red preferente del asegurado. ${cov.pct === 100 ? "No se aplica copago en este rubro." : `El asegurado paga un copago del ${100 - cov.pct}%.`}`,
    });
  }

  // Red preferente
  if (parsed.network.length > 0) {
    clausulas.push({
      seccion: "Red preferente",
      texto: `Red preferente de hospitales y centros médicos asociados: ${parsed.network.join("; ")}. La atención fuera de esta red puede no estar cubierta o aplicar copagos mayores.`,
    });
  }

  // Pre-existencias
  if (parsed.preexisting && parsed.preexisting.trim() && parsed.preexisting !== "ninguna") {
    clausulas.push({
      seccion: "Pre-existencias",
      texto: `Pre-existencias declaradas y aceptadas en la póliza: ${parsed.preexisting}. Estas condiciones quedan cubiertas en los porcentajes establecidos en el plan, sin períodos de carencia adicionales una vez aceptadas.`,
    });
  }

  // Exclusiones genéricas (sintetizadas)
  clausulas.push({
    seccion: "Exclusiones",
    texto: `Exclusiones generales del plan ${paciente.insurer}: tratamientos cosméticos no derivados de accidente, fertilidad asistida, lesiones autoinfligidas, gastos derivados de la práctica de deportes profesionales no declarados, y atenciones por pre-existencias no declaradas al momento de contratar la póliza.`,
  });

  // Procedimientos cubiertos (sintetizada)
  clausulas.push({
    seccion: "Procedimientos cubiertos",
    texto: `Procedimientos comunes cubiertos por la red preferente: consultas médicas y de especialista, exámenes de laboratorio (biometría, perfil lipídico, glucosa), imagen (radiografía, ecografía, tomografía, resonancia), procedimientos cardiológicos (electrocardiograma, ecocardiograma, holter), endoscopias, cirugías ambulatorias y emergencias 24 horas según los porcentajes contratados.`,
  });

  return clausulas.map((c, i) => ({
    id: `${paciente.id}-${c.seccion.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${i}`,
    pacienteId: paciente.id,
    policyNo: paciente.policyNo,
    insurer: paciente.insurer,
    seccion: c.seccion,
    texto: c.texto,
  }));
}

interface DocDirectorio {
  id: string;
  tipo: "hospital" | "doctor";
  name: string;
  city?: string;
  district?: string;
  address?: string;
  phone?: string;
  rating?: number;
  description?: string;
  location?: { type: "Point"; coordinates: [number, number] };
  lat?: number;
  lng?: number;
  hospitalType?: string;
  level?: number;
  fee?: number;
  wait?: number;
  specialties?: string[];
  acceptsInsurers?: string[];
  services?: string[];
  specialty?: string;
  hospitalId?: string;
  hospitalName?: string;
  yearsExperience?: number;
  languages?: string[];
  schedule?: string;
  bio?: string;
}

// ============================================================
// POST /api/admin/seed
// ============================================================
export async function POST(req: NextRequest) {
  // El seed re-genera índices, OCR-ea PDFs y sube blobs — operación cara.
  // Sólo accesible con el token administrativo.
  if (!tieneAdminToken(req)) {
    return NextResponse.json(
      {
        error: "unauthorized",
        message:
          "Este endpoint requiere el header `Authorization: Bearer <ADMIN_TOKEN>`. Configura ADMIN_TOKEN en el servidor.",
      },
      { status: 401 },
    );
  }

  const reporte: Record<string, unknown> = {};

  try {
    const indexClient = getSearchIndexClient();

    // ========== ÍNDICE 1: directorio (hospitales + doctores) ==========
    // Borrar el índice viejo "hospitales" si existe
    try {
      await indexClient.deleteIndex(azureConfig.search.indiceHospitales);
    } catch {
      // ignore
    }

    const idxDirectorio: SearchIndex = { name: "directorio", fields: fieldsDirectorio };
    await indexClient.createOrUpdateIndex(idxDirectorio);

    const hospitalDocs: DocDirectorio[] = SEED_HOSPITALES.map((h) => ({
      id: h.id,
      tipo: "hospital",
      name: h.name,
      city: h.city,
      district: h.district,
      address: h.address,
      phone: h.phone,
      rating: h.rating,
      description: h.description,
      location: { type: "Point", coordinates: [h.lng, h.lat] },
      lat: h.lat,
      lng: h.lng,
      hospitalType: h.type,
      level: h.level,
      fee: h.fee,
      wait: h.wait,
      specialties: h.specialties,
      acceptsInsurers: h.acceptsInsurers,
      services: h.services,
    }));

    const hospitalesPorId = Object.fromEntries(SEED_HOSPITALES.map((h) => [h.id, h]));
    const doctorDocs: DocDirectorio[] = SEED_DOCTORES.map((d) => {
      const h = hospitalesPorId[d.hospitalId];
      return {
        id: d.id,
        tipo: "doctor",
        name: d.name,
        rating: d.rating,
        bio: d.bio,
        specialty: d.specialty,
        hospitalId: d.hospitalId,
        hospitalName: d.hospitalName,
        yearsExperience: d.yearsExperience,
        languages: d.languages,
        schedule: d.schedule,
        location: h ? { type: "Point", coordinates: [h.lng, h.lat] } : undefined,
        lat: h?.lat,
        lng: h?.lng,
        city: h?.city,
      };
    });

    const cliDir = getSearchClient<DocDirectorio>("directorio");
    const upHosp = await cliDir.mergeOrUploadDocuments(hospitalDocs);
    const upDoc = await cliDir.mergeOrUploadDocuments(doctorDocs);

    reporte.directorio = {
      indice: "directorio",
      hospitales: hospitalDocs.length,
      doctores: doctorDocs.length,
      ok:
        upHosp.results.every((r) => r.succeeded) &&
        upDoc.results.every((r) => r.succeeded),
    };

    // ========== ÍNDICE 3: procedimientos ==========
    const idxProced: SearchIndex = { name: "procedimientos", fields: fieldsProcedimientos };
    await indexClient.createOrUpdateIndex(idxProced);

    const cliProc = getSearchClient<typeof SEED_PROCEDIMIENTOS[number]>("procedimientos");
    const upProc = await cliProc.mergeOrUploadDocuments(SEED_PROCEDIMIENTOS);
    reporte.procedimientos = {
      indice: "procedimientos",
      docs: SEED_PROCEDIMIENTOS.length,
      ok: upProc.results.every((r) => r.succeeded),
    };

    // ========== Pacientes a Blob ==========
    const contPac = getContenedorPacientes();
    await contPac.createIfNotExists();
    for (const p of SEED_PACIENTES) {
      const blob = contPac.getBlockBlobClient(`${p.id}.json`);
      await blob.uploadData(Buffer.from(JSON.stringify(p, null, 2)), {
        blobHTTPHeaders: { blobContentType: "application/json" },
      });
    }
    reporte.pacientes = SEED_PACIENTES.length;

    // ========== Historiales a Blob ==========
    const contHist = getContenedorHistorial();
    await contHist.createIfNotExists();
    let totalEventos = 0;
    for (const [id, eventos] of Object.entries(SEED_HISTORIALES)) {
      const blob = contHist.getBlockBlobClient(`${id}.json`);
      await blob.uploadData(Buffer.from(JSON.stringify(eventos, null, 2)), {
        blobHTTPHeaders: { blobContentType: "application/json" },
      });
      totalEventos += eventos.length;
    }
    reporte.historial = { pacientes: Object.keys(SEED_HISTORIALES).length, eventos: totalEventos };

    // ========== ÍNDICE 2: polizas-clausulas (vectorial) ==========
    const idxPolizas: SearchIndex = {
      name: "polizas-clausulas",
      fields: fieldsPolizas,
      vectorSearch,
    };
    await indexClient.createOrUpdateIndex(idxPolizas);

    // ========== Pólizas: PDF + Doc Intel + cláusulas vectorizadas ==========
    const contPol = getContenedorPolizas();
    await contPol.createIfNotExists();
    const di = getDocIntel();
    const polizasReporte: Record<string, unknown> = {};
    const todasClausulas: Array<{
      id: string;
      pacienteId: string;
      policyNo: string;
      insurer: string;
      seccion: string;
      texto: string;
    }> = [];

    for (const paciente of SEED_PACIENTES) {
      const id = paciente.id;
      const pdf = await generarPolizaPdf(paciente);

      const blobPdf = contPol.getBlockBlobClient(`${id}.pdf`);
      await blobPdf.uploadData(pdf, {
        blobHTTPHeaders: { blobContentType: "application/pdf" },
      });

      const inicial = await di
        .path("/documentModels/{modelId}:analyze", "prebuilt-layout")
        .post({
          contentType: "application/octet-stream",
          body: pdf,
        });

      if (inicial.status !== "202") {
        polizasReporte[id] = { error: "Doc Intel no aceptó", detail: inicial.body };
        continue;
      }
      const opLoc = inicial.headers["operation-location"] as string | undefined;
      if (!opLoc) {
        polizasReporte[id] = { error: "operation-location ausente" };
        continue;
      }

      let extraido: Record<string, unknown> | null = null;
      for (let i = 0; i < 30; i++) {
        const resp = await fetch(opLoc, {
          headers: { "Ocp-Apim-Subscription-Key": azureConfig.docIntel.apiKey },
        });
        const body = (await resp.json()) as AnalyzeStatus;
        if (body.status === "succeeded") {
          extraido = body.analyzeResult ?? (body as unknown as Record<string, unknown>);
          break;
        }
        if (body.status === "failed") {
          polizasReporte[id] = { error: "OCR falló", detail: body.error?.message };
          break;
        }
        await new Promise((r) => setTimeout(r, 1500));
      }
      if (!extraido) {
        if (!polizasReporte[id]) polizasReporte[id] = { error: "timeout OCR" };
        continue;
      }

      const parsed = parsePolizaExtraida(extraido);

      const blobJson = contPol.getBlockBlobClient(`${id}.extraido.json`);
      await blobJson.uploadData(Buffer.from(JSON.stringify(extraido, null, 2)), {
        blobHTTPHeaders: { blobContentType: "application/json" },
      });
      const blobParsed = contPol.getBlockBlobClient(`${id}.poliza.json`);
      await blobParsed.uploadData(Buffer.from(JSON.stringify(parsed, null, 2)), {
        blobHTTPHeaders: { blobContentType: "application/json" },
      });

      const clausulas = partirPolizaEnClausulas(paciente, parsed);
      todasClausulas.push(...clausulas);

      polizasReporte[id] = {
        pdf: blobPdf.url,
        coberturasDetectadas: parsed.coverages.length,
        deducibleAnual: parsed.deductible.annual,
        clausulasGeneradas: clausulas.length,
      };
    }

    // Embed todas las cláusulas en lote
    if (todasClausulas.length > 0) {
      const vectores = await generarEmbeddingsLote(todasClausulas.map((c) => c.texto));
      const docsClausulas = todasClausulas.map((c, i) => ({ ...c, texto_vector: vectores[i] }));

      const cliPol = getSearchClient<(typeof docsClausulas)[number]>("polizas-clausulas");
      const upClau = await cliPol.mergeOrUploadDocuments(docsClausulas);

      reporte.clausulas = {
        indice: "polizas-clausulas",
        docs: docsClausulas.length,
        embeddings_dim: vectores[0]?.length ?? 0,
        ok: upClau.results.every((r) => r.succeeded),
      };
    }

    reporte.polizas = polizasReporte;

    invalidarCachePacientes();
    invalidarCachePoliza();
    invalidarCacheHistorial();

    return NextResponse.json({ ok: true, reporte });
  } catch (err) {
    console.error("[seed] error:", err);
    return NextResponse.json(
      {
        ok: false,
        error: String(err),
        stack: err instanceof Error ? err.stack : undefined,
        reporte,
      },
      { status: 500 },
    );
  }
}
