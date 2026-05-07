import "server-only";
import DocumentIntelligence from "@azure-rest/ai-document-intelligence";
import { config } from "./config";

type Cliente = ReturnType<typeof DocumentIntelligence>;

let cliente: Cliente | null = null;

export function getDocIntel(): Cliente {
  if (cliente) return cliente;
  cliente = DocumentIntelligence(config.docIntel.endpoint, {
    key: config.docIntel.apiKey,
  });
  return cliente;
}
