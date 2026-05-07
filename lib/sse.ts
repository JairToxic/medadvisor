export type EventoSSE =
  | { type: "agent_start"; idx: number }
  | { type: "agent_done"; idx: number; ms: number; output: Record<string, unknown> | null }
  | { type: "sidepanel"; tab: "reasoning" | "policy" | "map" | "costs" }
  | { type: "bot_start" }
  | { type: "bot_token"; text: string }
  | { type: "bot_end" }
  | { type: "card_cost"; recs: unknown[]; specialty: string }
  | { type: "recs_emergencia"; recs: unknown[] }
  | { type: "clausula"; clausula: { seccion: string; texto: string; pacienteId: string } }
  | { type: "redflag" }
  | { type: "actions"; actions: ("book" | "call911" | "map" | "reschedule" | "cancel")[] }
  | { type: "intent"; intencion: "sintoma" | "gestion_cita" | "general" }
  | { type: "error"; message: string }
  | { type: "done" };

export function sseEncoder(controller: ReadableStreamDefaultController<Uint8Array>) {
  const encoder = new TextEncoder();
  return (ev: EventoSSE) => {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify(ev)}\n\n`));
  };
}
