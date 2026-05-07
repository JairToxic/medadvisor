import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getDocIntel } from "@/lib/azure/docintel";
import { getContenedorPolizas } from "@/lib/azure/blob";
import { config as azureConfig } from "@/lib/azure/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface AnalyzeStatus {
  status?: "notStarted" | "running" | "succeeded" | "failed";
  analyzeResult?: Record<string, unknown>;
  error?: { message?: string };
}

export async function POST(req: NextRequest) {
  const formData = await req.formData().catch(() => null);
  const archivo = formData?.get("file");
  if (!(archivo instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo (campo 'file')" }, { status: 400 });
  }

  const buffer = Buffer.from(await archivo.arrayBuffer());
  const idDoc = randomUUID();

  const contenedor = getContenedorPolizas();
  await contenedor.createIfNotExists();
  const blob = contenedor.getBlockBlobClient(`${idDoc}-${archivo.name}`);
  await blob.uploadData(buffer, {
    blobHTTPHeaders: { blobContentType: archivo.type || "application/pdf" },
  });

  const di = getDocIntel();
  const inicial = await di
    .path("/documentModels/{modelId}:analyze", "prebuilt-layout")
    .post({
      contentType: "application/octet-stream",
      body: buffer,
    });

  if (inicial.status !== "202") {
    return NextResponse.json(
      { error: "Document Intelligence rechazó la solicitud", detail: inicial.body },
      { status: 502 },
    );
  }

  const operationLocation = inicial.headers["operation-location"];
  if (!operationLocation) {
    return NextResponse.json(
      { error: "Falta operation-location del análisis" },
      { status: 502 },
    );
  }

  // Polling manual via fetch (la URL operation-location es completa, no relativa)
  let extraido: Record<string, unknown> | null = null;
  for (let i = 0; i < 30; i++) {
    const resp = await fetch(operationLocation as string, {
      headers: { "Ocp-Apim-Subscription-Key": azureConfig.docIntel.apiKey },
    });
    const body = (await resp.json()) as AnalyzeStatus;
    if (body.status === "succeeded") {
      extraido = body.analyzeResult ?? (body as unknown as Record<string, unknown>);
      break;
    }
    if (body.status === "failed") {
      return NextResponse.json(
        { error: "Análisis falló", detail: body.error?.message ?? "sin detalle" },
        { status: 502 },
      );
    }
    await new Promise((r) => setTimeout(r, 1500));
  }

  if (!extraido) {
    return NextResponse.json({ error: "Timeout esperando análisis" }, { status: 504 });
  }

  return NextResponse.json({
    ok: true,
    blobUrl: blob.url,
    docId: idDoc,
    extraido,
  });
}
