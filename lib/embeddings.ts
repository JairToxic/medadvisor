import "server-only";
import { DEPLOYMENTS, getOpenAI } from "@/lib/azure/openai";

/**
 * Genera un embedding (vector de 3072 dimensiones con text-embedding-3-large).
 */
export async function generarEmbedding(texto: string): Promise<number[]> {
  const oai = getOpenAI();
  const resp = await oai.embeddings.create({
    model: DEPLOYMENTS.embed,
    input: texto,
  });
  return resp.data[0].embedding;
}

export async function generarEmbeddingsLote(textos: string[]): Promise<number[][]> {
  if (textos.length === 0) return [];
  const oai = getOpenAI();
  const resp = await oai.embeddings.create({
    model: DEPLOYMENTS.embed,
    input: textos,
  });
  return resp.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}
