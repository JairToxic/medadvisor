import "server-only";
import { NextRequest } from "next/server";
import { z } from "zod";
import { obtenerPaciente } from "@/lib/pacientes-azure";
import { cargarHistorial } from "@/lib/historial-azure";
import {
  ejecutarCobertura,
  ejecutarTriage,
  recomendarConSearch,
  streamCoordinator,
} from "@/lib/agentes";
import { sseEncoder, type EventoSSE } from "@/lib/sse";
import { checkRateLimit, respuesta429 } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  pacienteId: z.string(),
  sintoma: z.string().min(1).max(800),
  idioma: z.enum(["es", "en"]).default("es"),
  ubicacion: z
    .object({
      lat: z.number(),
      lng: z.number(),
    })
    .optional(),
  citaActiva: z
    .object({
      day: z.string(),
      time: z.string(),
      hospital: z.string(),
      doctor: z.string().optional(),
      specialty: z.string(),
      copago: z.number(),
      code: z.string(),
    })
    .nullable()
    .optional(),
});

export async function POST(req: NextRequest) {
  // 60 chats / hora / IP. Suficiente para la demo, blinda contra spammeo trivial.
  const lim = checkRateLimit(req, "chat", 60, 60 * 60 * 1000);
  if (!lim.ok) return respuesta429(lim.retryAfterSeconds!);

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  const { pacienteId, sintoma, idioma, ubicacion, citaActiva } = parsed.data;
  const paciente = await obtenerPaciente(pacienteId);
  if (!paciente) {
    return new Response(JSON.stringify({ error: "paciente no encontrado en Blob Storage" }), {
      status: 404,
    });
  }
  const historial = await cargarHistorial(pacienteId);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = sseEncoder(controller);
      try {
        send({ type: "sidepanel", tab: "reasoning" });

        const t0 = Date.now();
        send({ type: "agent_start", idx: 0 });
        const triage = await ejecutarTriage(sintoma, paciente, idioma, historial);
        send({ type: "intent", intencion: triage.intencion });
        send({
          type: "agent_done",
          idx: 0,
          ms: Date.now() - t0,
          output: {
            intencion:
              triage.intencion === "sintoma"
                ? "consulta clínica"
                : triage.intencion === "gestion_cita"
                  ? { text: "GESTIÓN DE CITA", tone: "v-good" }
                  : { text: "GENERAL", tone: "v-good" },
            sintomas: triage.sintomas || "—",
            especialidad: triage.especialidad,
            urgencia: triage.urgencia,
            tipo_consulta:
              triage.tipoConsulta === "tercero"
                ? { text: "TERCERA PERSONA", tone: "v-bad" }
                : "propia",
            historial_consultado:
              historial.length > 0 ? `${historial.length} atenciones previas` : "sin antecedentes",
            red_flags:
              triage.redFlags.length === 0
                ? { text: "ninguno", tone: "v-good" }
                : { text: triage.redFlags.join(" · "), tone: "v-bad" },
          },
        });

        // Caso "gestión de cita" o "general": no corremos cobertura ni recomendador.
        // Respondemos conversacionalmente, conociendo si hay una cita activa.
        if (triage.intencion === "gestion_cita" || triage.intencion === "general") {
          const nombre = paciente.name.split(" ")[0];
          let respuesta: string;
          let acciones: ("reschedule" | "cancel")[] = [];

          if (triage.intencion === "gestion_cita") {
            if (citaActiva) {
              const docTxt = citaActiva.doctor ? ` con ${citaActiva.doctor}` : "";
              respuesta =
                idioma === "es"
                  ? `Hola ${nombre}. Tu cita actual es el **${citaActiva.day} a las ${citaActiva.time}** en **${citaActiva.hospital}**${docTxt} para ${citaActiva.specialty}. ¿Quieres reagendarla o cancelarla?`
                  : `Hi ${nombre}. Your current appointment is **${citaActiva.day} at ${citaActiva.time}** at **${citaActiva.hospital}**${docTxt} for ${citaActiva.specialty}. Want to reschedule or cancel it?`;
              acciones = ["reschedule", "cancel"];
            } else {
              respuesta =
                idioma === "es"
                  ? `Hola ${nombre}, ahora mismo no tienes una cita activa. Si quieres agendar una, descríbeme qué síntoma tienes y te ayudo a encontrar el hospital con menor copago.`
                  : `Hi ${nombre}, you don't have any active appointment right now. If you want to book one, tell me your symptom and I'll find the lowest-copay hospital for you.`;
            }
          } else {
            // general
            if (citaActiva) {
              respuesta =
                idioma === "es"
                  ? `Hola ${nombre}, ¿en qué te ayudo? Recuerda que tienes una cita el ${citaActiva.day} a las ${citaActiva.time} en ${citaActiva.hospital}.`
                  : `Hi ${nombre}, how can I help? Remember you have an appointment ${citaActiva.day} at ${citaActiva.time} at ${citaActiva.hospital}.`;
            } else {
              respuesta =
                idioma === "es"
                  ? `Hola ${nombre}, soy MedAdvisor. Cuéntame qué sientes y te ayudo a entender tu cobertura, encontrar el hospital más conveniente y agendar.`
                  : `Hi ${nombre}, I'm MedAdvisor. Tell me what you feel and I'll help with coverage, hospital choice and booking.`;
            }
          }

          send({ type: "bot_start" });
          for (const ch of respuesta) {
            send({ type: "bot_token", text: ch });
            await sleep(8);
          }
          send({ type: "bot_end" });

          if (acciones.length > 0) {
            send({ type: "actions", actions: acciones });
          }
          send({ type: "done" });
          controller.close();
          return;
        }

        // Caso "tercera persona": no aplica cobertura del usuario para tratamiento,
        // pero SÍ necesitamos el hospital de emergencia más cercano para poder
        // despachar una ambulancia si el rescatador llama al 911.
        if (triage.tipoConsulta === "tercero") {
          if (triage.urgencia === "emergencia") {
            send({ type: "redflag" });

            try {
              const dummyCob = {
                porcentaje: 100,
                deducible: 0,
                preexistenciaCubierta: false,
                nota: "emergencia 100%",
                fuente: "blob-ocr" as const,
                coberturaUsada: "Emergencia",
              };
              const recsEmerg = await recomendarConSearch(
                { ...triage, especialidad: "Emergencias" },
                paciente,
                dummyCob,
                ubicacion,
              );
              if (recsEmerg.length > 0) {
                send({
                  type: "recs_emergencia",
                  recs: recsEmerg.map((r) => ({
                    id: r.id,
                    name: r.name,
                    fee: r.fee,
                    rating: r.rating,
                    wait: r.wait,
                    inNet: r.inNet,
                    coveredPct: r.coveredPct,
                    copago: r.copago,
                    distKm: r.distKm,
                    city: r.city,
                    lat: r.lat,
                    lng: r.lng,
                    doctorSugerido: r.doctorSugerido,
                  })),
                });
              }
            } catch (e) {
              console.warn("[chat/tercero+emergencia] recomendar falló:", e);
            }
          }
          send({ type: "bot_start" });
          for await (const tok of streamCoordinator({
            paciente,
            idioma,
            triage,
            cobertura: {
              porcentaje: 0,
              deducible: 0,
              preexistenciaCubierta: false,
              nota: "no aplica (consulta por tercero)",
              fuente: "fallback-local",
              coberturaUsada: "—",
            },
            recomendaciones: [],
            historial,
          })) {
            send({ type: "bot_token", text: tok });
          }
          send({ type: "bot_end" });
          if (triage.urgencia === "emergencia") {
            send({ type: "actions", actions: ["call911", "map"] });
          }
          send({ type: "done" });
          controller.close();
          return;
        }

        if (triage.urgencia === "emergencia") {
          send({ type: "redflag" });
          const cobEmerg = await ejecutarCobertura(triage, paciente);

          // Buscar hospitales de emergencia para que la app sepa dónde despachar la ambulancia
          let recsEmerg: Awaited<ReturnType<typeof recomendarConSearch>> = [];
          try {
            recsEmerg = await recomendarConSearch(
              { ...triage, especialidad: "Emergencias" },
              paciente,
              cobEmerg,
              ubicacion,
            );
          } catch (e) {
            console.warn("[chat/emergencia] recomendar falló:", e);
          }

          if (recsEmerg.length > 0) {
            send({
              type: "recs_emergencia",
              recs: recsEmerg.map((r) => ({
                id: r.id,
                name: r.name,
                fee: r.fee,
                rating: r.rating,
                wait: r.wait,
                inNet: r.inNet,
                coveredPct: r.coveredPct,
                copago: r.copago,
                distKm: r.distKm,
                city: r.city,
                lat: r.lat,
                lng: r.lng,
                doctorSugerido: r.doctorSugerido,
              })),
            });
          }

          send({ type: "bot_start" });
          for await (const tok of streamCoordinator({
            paciente,
            idioma,
            triage,
            cobertura: cobEmerg,
            recomendaciones: recsEmerg,
            historial,
          })) {
            send({ type: "bot_token", text: tok });
          }
          send({ type: "bot_end" });
          send({ type: "actions", actions: ["call911", "map"] });
          send({ type: "done" });
          controller.close();
          return;
        }

        const t1 = Date.now();
        send({ type: "agent_start", idx: 1 });
        const cobertura = await ejecutarCobertura(triage, paciente);
        send({
          type: "agent_done",
          idx: 1,
          ms: Date.now() - t1,
          output: {
            plan: `${paciente.insurer} ${paciente.plan}`,
            cobertura_aplicada: `${cobertura.coberturaUsada} · ${cobertura.porcentaje}%`,
            deducible_pendiente: `$${cobertura.deducible}`,
            fuente:
              cobertura.fuente === "blob-ocr"
                ? { text: "OCR + RAG vectorial", tone: "v-good" }
                : { text: "perfil local", tone: "v-bad" },
            preexistencia: cobertura.preexistenciaCubierta
              ? { text: "DECLARADA · cubierta", tone: "v-good" }
              : "no aplica",
          },
        });

        if (cobertura.clausulaCitada) {
          send({ type: "clausula", clausula: cobertura.clausulaCitada });
        }

        const t2 = Date.now();
        send({ type: "agent_start", idx: 2 });
        const recs = await recomendarConSearch(triage, paciente, cobertura, ubicacion);
        const mejor = recs[0];
        const peor = recs[recs.length - 1];
        send({
          type: "agent_done",
          idx: 2,
          ms: Date.now() - t2,
          output: {
            hospitales: `${recs.length} candidatos${ubicacion ? " (geo)" : ""}`,
            mejor: mejor
              ? {
                  text: `${mejor.name} · $${mejor.copago}${mejor.doctorSugerido ? ` · ${mejor.doctorSugerido.name}` : ""}`,
                  tone: "v-good",
                }
              : "sin opciones",
            peor:
              peor && peor !== mejor
                ? { text: `${peor.name} · $${peor.copago}`, tone: "v-bad" }
                : "—",
          },
        });

        send({ type: "sidepanel", tab: "policy" });
        await sleep(250);
        send({ type: "sidepanel", tab: "map" });
        await sleep(250);
        send({ type: "sidepanel", tab: "costs" });
        // Sólo emitimos la tarjeta de costos si hay al menos un hospital recomendado
        if (recs.length > 0) {
          send({
            type: "card_cost",
            recs: recs.map((r) => ({
              id: r.id,
              name: r.name,
              fee: r.fee,
              rating: r.rating,
              wait: r.wait,
              inNet: r.inNet,
              coveredPct: r.coveredPct,
              copago: r.copago,
              distKm: r.distKm,
              city: r.city,
              lat: r.lat,
              lng: r.lng,
              doctorSugerido: r.doctorSugerido,
            })),
            specialty: triage.especialidad,
          });
        }

        const t3 = Date.now();
        send({ type: "agent_start", idx: 3 });
        send({ type: "bot_start" });
        for await (const tok of streamCoordinator({
          paciente,
          idioma,
          triage,
          cobertura,
          recomendaciones: recs,
          historial,
        })) {
          send({ type: "bot_token", text: tok });
        }
        send({ type: "bot_end" });
        send({ type: "agent_done", idx: 3, ms: Date.now() - t3, output: null });
        send({ type: "actions", actions: ["book", "map"] });
        send({ type: "done" });
        controller.close();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error desconocido";
        send({ type: "error", message: msg } satisfies EventoSSE);
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
