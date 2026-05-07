"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BrandMark,
  Cal,
  Camera,
  Clock,
  Coin,
  Doc,
  Map as MapIcon,
  Mic,
  Phone,
  Pin,
  Reset,
  Send,
  Settings,
  Sparkle,
  VolumeOff,
  VolumeOn,
} from "@/componentes/Iconos";
import { BurbujaMensaje } from "@/componentes/BurbujaMensaje";
import { TarjetaCostos } from "@/componentes/TarjetaCostos";
import { AlertaUrgencia } from "@/componentes/AlertaUrgencia";
import { TarjetaConfirmacion } from "@/componentes/TarjetaConfirmacion";
import { TarjetaAmbulancia, type AmbulanciaInfo } from "@/componentes/TarjetaAmbulancia";
import { ModalReserva } from "@/componentes/ModalReserva";
import { PanelRazonamiento } from "@/componentes/PanelRazonamiento";
import { PanelPoliza } from "@/componentes/PanelPoliza";
import { PanelMapa } from "@/componentes/PanelMapa";
import { PanelCostos } from "@/componentes/PanelCostos";
import { PanelHistorial } from "@/componentes/PanelHistorial";
import { ControlesPreferencias } from "@/componentes/ControlesPreferencias";
import { Tutorial } from "@/componentes/Tutorial";
import { lanzarTour, tourFueVisto } from "@/lib/tour";
import { usePreferencias } from "@/componentes/ProveedorPreferencias";
import { avisar, confirmar } from "@/lib/swal";
import type {
  AccionRapida,
  AgenteEjecutado,
  ClausulaCitada,
  EstadoAgente,
  EventoAtencion,
  HospitalRecomendado,
  IdPanel,
  InfoReserva,
  Mensaje,
  Paciente,
} from "@/lib/tipos";

interface Props {
  paciente: Paciente;
  historial: EventoAtencion[];
}

const ESTADOS_INICIALES: EstadoAgente[] = ["pending", "pending", "pending", "pending"];

type EventoSSE =
  | { type: "agent_start"; idx: number }
  | {
      type: "agent_done";
      idx: number;
      ms: number;
      output: Record<string, unknown> | null;
    }
  | { type: "sidepanel"; tab: IdPanel }
  | { type: "bot_start" }
  | { type: "bot_token"; text: string }
  | { type: "bot_end" }
  | { type: "card_cost"; recs: HospitalRecomendado[]; specialty: string }
  | { type: "recs_emergencia"; recs: HospitalRecomendado[] }
  | { type: "clausula"; clausula: ClausulaCitada }
  | { type: "redflag" }
  | { type: "actions"; actions: ("book" | "call911" | "map" | "reschedule" | "cancel")[] }
  | { type: "intent"; intencion: "sintoma" | "gestion_cita" | "general" }
  | { type: "error"; message: string }
  | { type: "done" };

interface ResultadoVoz {
  results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }>;
}
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: ResultadoVoz) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}
interface VentanaConVoz {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
}

export function PantallaChat({ paciente, historial }: Props) {
  const router = useRouter();
  const { idioma, textos } = usePreferencias();

  const agentesIniciales = useMemo<AgenteEjecutado[]>(
    () => textos.agents.map((a) => ({ ...a, ms: 0, output: null })),
    [textos],
  );

  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [estados, setEstados] = useState<EstadoAgente[]>(ESTADOS_INICIALES);
  const [agentes, setAgentes] = useState<AgenteEjecutado[]>(agentesIniciales);
  const [tabActiva, setTabActiva] = useState<IdPanel>("reasoning");
  const [recomendaciones, setRecomendaciones] = useState<HospitalRecomendado[] | null>(null);
  const [especialidadVisible, setEspecialidadVisible] = useState<string | null>(null);
  const [mostrarCosto, setMostrarCosto] = useState(false);
  const [mostrarUrgencia, setMostrarUrgencia] = useState(false);
  const [acciones, setAcciones] = useState<AccionRapida[] | null>(null);
  const [reservaPendiente, setReservaPendiente] = useState<HospitalRecomendado | null>(null);
  const [confirmacion, setConfirmacion] = useState<InfoReserva | null>(null);
  const [reagendada, setReagendada] = useState(false);
  const [composer, setComposer] = useState("");
  const [ejecutando, setEjecutando] = useState(false);
  const [polizaVisible, setPolizaVisible] = useState(false);
  const [clausulaCitada, setClausulaCitada] = useState<ClausulaCitada | null>(null);
  const [ubicacion, setUbicacion] = useState<{ lat: number; lng: number } | null>(null);
  const [estadoUbic, setEstadoUbic] = useState<"idle" | "pidiendo" | "ok" | "error">("idle");
  const [voiceOn, setVoiceOn] = useState(false);
  const [escuchando, setEscuchando] = useState(false);
  const [analizandoImg, setAnalizandoImg] = useState(false);
  const [imagenPendiente, setImagenPendiente] = useState<{ file: File; url: string } | null>(null);
  const [captionImg, setCaptionImg] = useState("");
  const [tutorialAbierto, setTutorialAbierto] = useState(false);
  const [ambulancia, setAmbulancia] = useState<AmbulanciaInfo | null>(null);
  const [conectando911, setConectando911] = useState(false);
  const tipTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const llegadaTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streamRef = useRef<HTMLDivElement | null>(null);
  const cancelRef = useRef<AbortController | null>(null);
  const voiceRef = useRef(false);
  const recogRef = useRef<SpeechRecognitionLike | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const composerRef = useRef<HTMLInputElement | null>(null);

  // Streaming TTS: cola y buffer
  const ttsBufferRef = useRef("");
  const ttsQueueRef = useRef<Promise<HTMLAudioElement | null>[]>([]);
  const ttsPlayingRef = useRef(false);
  const ttsCancelRef = useRef<AbortController | null>(null);
  const audioActivoRef = useRef<HTMLAudioElement | null>(null);

  const limpiarParaTTS = (texto: string): string =>
    texto.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/[*_~`]/g, "").trim();

  const detenerVoz = useCallback(() => {
    ttsCancelRef.current?.abort();
    ttsCancelRef.current = null;
    ttsQueueRef.current = [];
    ttsBufferRef.current = "";
    audioActivoRef.current?.pause();
    audioActivoRef.current = null;
    ttsPlayingRef.current = false;
  }, []);

  const procesarColaTTS = useCallback(async () => {
    if (ttsPlayingRef.current) return;
    ttsPlayingRef.current = true;
    while (ttsQueueRef.current.length > 0) {
      const promise = ttsQueueRef.current.shift()!;
      const audio = await promise;
      if (!audio || !voiceRef.current) continue;
      audioActivoRef.current = audio;
      await new Promise<void>((resolve) => {
        audio.onended = () => resolve();
        audio.onerror = () => resolve();
        audio.play().catch(() => resolve());
      });
      audioActivoRef.current = null;
    }
    ttsPlayingRef.current = false;
  }, []);

  const encolarTTS = useCallback(
    (texto: string) => {
      const limpio = limpiarParaTTS(texto);
      if (!limpio || limpio.length < 3) return;
      const ctl = ttsCancelRef.current ?? new AbortController();
      ttsCancelRef.current = ctl;
      const promise = (async (): Promise<HTMLAudioElement | null> => {
        try {
          const resp = await fetch("/api/voice/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: ctl.signal,
            body: JSON.stringify({ text: limpio, idioma }),
          });
          if (!resp.ok) return null;
          const blob = await resp.blob();
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          audio.addEventListener("ended", () => URL.revokeObjectURL(url));
          return audio;
        } catch {
          return null;
        }
      })();
      ttsQueueRef.current.push(promise);
      procesarColaTTS();
    },
    [idioma, procesarColaTTS],
  );

  // Extrae oraciones completas del buffer y las envía a TTS
  const flushBufferTTS = useCallback(
    (forzar = false) => {
      if (!voiceRef.current) return;
      let buffer = ttsBufferRef.current;
      let extracto = "";
      const RE = /^([\s\S]*?[.!?¿¡])\s+/;
      while (true) {
        const m = buffer.match(RE);
        if (!m) break;
        if (m[1].trim().length < 6) {
          // Demasiado corto, considerar parte de la siguiente
          buffer = buffer.slice(m[0].length);
          extracto += m[1] + " ";
          continue;
        }
        extracto += m[1] + " ";
        buffer = buffer.slice(m[0].length);
      }
      if (forzar && buffer.trim().length > 0) {
        extracto += buffer;
        buffer = "";
      }
      ttsBufferRef.current = buffer;
      if (extracto.trim()) encolarTTS(extracto.trim());
    },
    [encolarTTS],
  );

  useEffect(() => {
    voiceRef.current = voiceOn;
    if (!voiceOn) detenerVoz();
  }, [voiceOn, detenerVoz]);

  useEffect(() => {
    const el = streamRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [mensajes, mostrarCosto, mostrarUrgencia, confirmacion, acciones]);

  const limpiarTimersEmergencia = useCallback(() => {
    tipTimersRef.current.forEach((t) => clearTimeout(t));
    tipTimersRef.current = [];
    if (llegadaTimerRef.current) {
      clearTimeout(llegadaTimerRef.current);
      llegadaTimerRef.current = null;
    }
  }, []);

  const reiniciarEstado = useCallback(() => {
    cancelRef.current?.abort();
    detenerVoz();
    limpiarTimersEmergencia();
    setMensajes([
      {
        role: "bot",
        text:
          idioma === "es"
            ? `Hola **${paciente.name.split(" ")[0]}**. Soy MedAdvisor. Cuéntame qué sientes y te ayudo a entender qué hacer y cuánto pagarás.`
            : `Hi **${paciente.name.split(" ")[0]}**. I'm MedAdvisor. Tell me what you're feeling and I'll help you decide what to do and what you'll pay.`,
      },
    ]);
    setEstados(ESTADOS_INICIALES);
    setAgentes(agentesIniciales);
    setTabActiva("reasoning");
    setRecomendaciones(null);
    setEspecialidadVisible(null);
    setMostrarCosto(false);
    setMostrarUrgencia(false);
    setAcciones(null);
    setConfirmacion(null);
    setPolizaVisible(false);
    setClausulaCitada(null);
    setAmbulancia(null);
    setConectando911(false);
    setReagendada(false);
    setEjecutando(false);
  }, [idioma, paciente.name, agentesIniciales, detenerVoz, limpiarTimersEmergencia]);

  useEffect(() => {
    reiniciarEstado();
  }, [paciente.id, idioma, reiniciarEstado]);

  // Tour interactivo de Driver.js — primera visita al chat
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (tourFueVisto()) return;
    const id = setTimeout(() => lanzarTour(idioma), 700);
    return () => clearTimeout(id);
  }, [idioma]);

  const pedirUbicacion = () => {
    if (!navigator.geolocation) {
      setEstadoUbic("error");
      return;
    }
    setEstadoUbic("pidiendo");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUbicacion({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setEstadoUbic("ok");
      },
      () => setEstadoUbic("error"),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  };

  const probarVoz = useCallback(() => {
    encolarTTS(
      idioma === "es"
        ? "Hola, soy Andrea, tu asistente de MedAdvisor."
        : "Hello, I am Andrea, your MedAdvisor assistant.",
    );
  }, [encolarTTS, idioma]);

  const aplicarEvento = useCallback(
    (ev: EventoSSE) => {
      switch (ev.type) {
        case "agent_start":
          setEstados((s) => {
            const cp = [...s];
            cp[ev.idx] = "active";
            return cp;
          });
          break;
        case "agent_done":
          setEstados((s) => {
            const cp = [...s];
            cp[ev.idx] = "done";
            return cp;
          });
          setAgentes((a) => {
            const cp = [...a];
            if (cp[ev.idx]) {
              cp[ev.idx] = {
                ...cp[ev.idx],
                ms: ev.ms,
                output: (ev.output ?? null) as AgenteEjecutado["output"],
              };
            }
            return cp;
          });
          break;
        case "sidepanel":
          setTabActiva(ev.tab);
          if (ev.tab === "policy") setPolizaVisible(true);
          break;
        case "bot_start":
          ttsBufferRef.current = "";
          setMensajes((m) => [...m, { role: "bot", text: "", streaming: true }]);
          break;
        case "bot_token":
          setMensajes((m) => {
            const cp = [...m];
            const ult = cp[cp.length - 1];
            if (ult && ult.role === "bot" && ult.streaming) {
              cp[cp.length - 1] = { ...ult, text: ult.text + ev.text };
            }
            return cp;
          });
          if (voiceRef.current) {
            ttsBufferRef.current += ev.text;
            flushBufferTTS(false);
          }
          break;
        case "bot_end":
          setMensajes((m) => {
            const cp = [...m];
            const ult = cp[cp.length - 1];
            if (ult && ult.role === "bot" && ult.streaming) {
              cp[cp.length - 1] = { ...ult, streaming: false };
            }
            return cp;
          });
          if (voiceRef.current) flushBufferTTS(true);
          break;
        case "card_cost":
          setRecomendaciones(ev.recs);
          setEspecialidadVisible(ev.specialty);
          setMostrarCosto(true);
          break;
        case "recs_emergencia":
          // Modo emergencia: actualizamos las recomendaciones en silencio
          // (sin mostrar la tarjeta de costos para no distraer del red flag)
          setRecomendaciones(ev.recs);
          break;
        case "clausula":
          setClausulaCitada(ev.clausula);
          setPolizaVisible(true);
          break;
        case "redflag":
          setMostrarUrgencia(true);
          break;
        case "actions":
          setAcciones(ev.actions);
          break;
        case "error":
          setMensajes((m) => [
            ...m,
            {
              role: "bot",
              text:
                idioma === "es"
                  ? `**Error del backend:** ${ev.message}`
                  : `**Backend error:** ${ev.message}`,
            },
          ]);
          break;
        case "done":
          setEjecutando(false);
          break;
      }
    },
    [idioma, flushBufferTTS],
  );

  const correrPipeline = useCallback(
    async (sintoma: string) => {
      cancelRef.current?.abort();
      const ctl = new AbortController();
      cancelRef.current = ctl;

      detenerVoz();
      setMostrarCosto(false);
      setMostrarUrgencia(false);
      setAcciones(null);
      // NOTA: NO limpiamos `confirmacion` — la cita persiste entre mensajes,
      // así el bot puede saber si tiene cita activa al responder gestion_cita.
      // La cita sólo se borra al pulsar "Cancelar cita" o reiniciar el caso.
      setEstados(ESTADOS_INICIALES);
      setAgentes(agentesIniciales);
      setClausulaCitada(null);
      setEjecutando(true);

      try {
        const resp = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: ctl.signal,
          body: JSON.stringify({
            pacienteId: paciente.id,
            sintoma,
            idioma,
            ubicacion: ubicacion ?? undefined,
            citaActiva: confirmacion ?? null,
          }),
        });
        if (!resp.ok || !resp.body) {
          const err = await resp.text();
          aplicarEvento({ type: "error", message: err || `HTTP ${resp.status}` });
          setEjecutando(false);
          return;
        }
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const partes = buffer.split("\n\n");
          buffer = partes.pop() ?? "";
          for (const parte of partes) {
            const linea = parte.split("\n").find((l) => l.startsWith("data: "));
            if (!linea) continue;
            try {
              const ev = JSON.parse(linea.slice(6)) as EventoSSE;
              aplicarEvento(ev);
            } catch {
              // ignorar
            }
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        const msg = err instanceof Error ? err.message : String(err);
        aplicarEvento({ type: "error", message: msg });
      } finally {
        setEjecutando(false);
      }
    },
    [paciente.id, idioma, ubicacion, agentesIniciales, aplicarEvento, detenerVoz],
  );

  const enviarMensaje = useCallback(
    async (texto: string) => {
      if (ejecutando || !texto.trim()) return;
      setMensajes((m) => [...m, { role: "user", text: texto }]);
      await correrPipeline(texto);
    },
    [ejecutando, correrPipeline],
  );

  const enviar = () => {
    const texto = composer.trim();
    if (!texto) return;
    setComposer("");
    enviarMensaje(texto);
  };

  const alternarMicrofono = () => {
    if (escuchando) {
      recogRef.current?.stop();
      return;
    }
    const w = window as unknown as VentanaConVoz;
    const Cls = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Cls) {
      avisar(
        idioma === "es"
          ? "Tu navegador no soporta dictado por voz. Prueba Chrome o Edge."
          : "Your browser doesn't support voice dictation. Try Chrome or Edge.",
        "info",
        idioma === "es" ? "Dictado no disponible" : "Dictation unavailable",
      );
      return;
    }
    const recog = new Cls();
    recog.lang = idioma === "es" ? "es-EC" : "en-US";
    recog.interimResults = true;
    recog.continuous = false;
    recog.onresult = (e) => {
      let texto = "";
      for (let i = 0; i < e.results.length; i++) {
        texto += e.results[i][0].transcript;
      }
      setComposer(texto);
    };
    recog.onerror = () => setEscuchando(false);
    recog.onend = () => setEscuchando(false);
    recogRef.current = recog;
    setEscuchando(true);
    recog.start();
  };

  const subirImagen = () => fileInputRef.current?.click();

  const cancelarImagen = useCallback(() => {
    if (imagenPendiente) URL.revokeObjectURL(imagenPendiente.url);
    setImagenPendiente(null);
    setCaptionImg("");
  }, [imagenPendiente]);

  const analizarImagenPendiente = useCallback(async () => {
    if (!imagenPendiente || analizandoImg || ejecutando) return;
    const { file, url } = imagenPendiente;
    const caption = captionImg.trim();

    // Mensaje del usuario con preview + caption
    const mensajeUsuario = caption
      ? `📷 ${caption}`
      : idioma === "es"
        ? `📷 Imagen del síntoma`
        : `📷 Symptom photo`;
    setMensajes((m) => [...m, { role: "user", text: mensajeUsuario }]);

    setImagenPendiente(null);
    setCaptionImg("");
    setAnalizandoImg(true);

    try {
      const fd = new FormData();
      fd.append("image", file);
      fd.append("idioma", idioma);
      if (caption) fd.append("caption", caption);
      const resp = await fetch("/api/vision/analizar", { method: "POST", body: fd });

      if (!resp.ok) {
        const errData = (await resp.json().catch(() => null)) as
          | { contentFiltered?: boolean; message?: string; error?: string; detail?: string }
          | null;

        if (errData?.contentFiltered) {
          // Fallback: si hay caption, evaluamos sólo con texto
          if (caption.length > 5) {
            const aviso =
              idioma === "es"
                ? `📷 La imagen no pasó el filtro de seguridad de Azure, pero entendí lo que escribiste. Voy a evaluar tu caso con esa información.`
                : `📷 The image was blocked by Azure safety filters, but I got your text. Evaluating with that info.`;
            setMensajes((m) => [...m, { role: "bot", text: aviso }]);
            if (voiceRef.current) {
              ttsBufferRef.current = aviso;
              flushBufferTTS(true);
            }
            setAnalizandoImg(false);
            await correrPipeline(caption);
            return;
          }
          // Sin caption: pedir descripción + foco al input
          setMensajes((m) => [
            ...m,
            {
              role: "bot",
              text:
                idioma === "es"
                  ? `📷 La imagen no pasó el filtro de seguridad de Azure. **Escribe abajo qué pasó** ↓ — ya tienes el cursor listo, solo cuéntame y te evalúo.`
                  : `📷 The image was blocked by Azure safety filter. **Type what happened below** ↓ — cursor is ready, just describe and I'll evaluate.`,
            },
          ]);
          setTimeout(() => composerRef.current?.focus(), 100);
          return;
        }

        // Otro error
        setMensajes((m) => [
          ...m,
          {
            role: "bot",
            text: `**No pude analizar la imagen.** ${errData?.detail ?? errData?.error ?? "Error desconocido"}`,
          },
        ]);
        return;
      }

      const data = (await resp.json()) as {
        descripcion: string;
        respuesta: string;
        especialidadSugerida: string;
        urgencia: string;
      };

      const breve =
        idioma === "es"
          ? `📷 **Veo en tu imagen:** ${data.descripcion}`
          : `📷 **I see in your image:** ${data.descripcion}`;
      setMensajes((m) => [...m, { role: "bot", text: breve }]);
      if (voiceRef.current) {
        ttsBufferRef.current = data.descripcion;
        flushBufferTTS(true);
      }
      setAnalizandoImg(false);

      const sintomaSintetico = caption
        ? `${caption}. Imagen muestra: ${data.descripcion}`
        : `Imagen muestra: ${data.descripcion}`;
      await correrPipeline(sintomaSintetico);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setMensajes((m) => [...m, { role: "bot", text: `**Error de red:** ${msg}` }]);
    } finally {
      setAnalizandoImg(false);
      URL.revokeObjectURL(url);
    }
  }, [imagenPendiente, captionImg, analizandoImg, ejecutando, idioma, correrPipeline, flushBufferTTS]);

  const dispatcharAmbulancia = useCallback(() => {
    if (ambulancia || conectando911) return;

    const hospital = recomendaciones?.[0];
    if (!hospital || !hospital.lat || !hospital.lng) {
      avisar(
        idioma === "es"
          ? "No tengo información de hospital. Inicia un caso de emergencia primero."
          : "No hospital info available. Start an emergency case first.",
        "warning",
        idioma === "es" ? "Sin hospital activo" : "No active hospital",
      );
      return;
    }

    const destino =
      ubicacion ?? {
        lat: hospital.lat + 0.012,
        lng: hospital.lng + 0.012,
      };

    // Extraer triage del agente 0 para el contexto de los tips
    const out0 = agentes[0]?.output;
    const sintomasTriage = typeof out0?.sintomas === "string" ? out0.sintomas : "emergencia médica";
    const especialidadTriage =
      typeof out0?.especialidad === "string" ? out0.especialidad : "Emergencias";

    setConectando911(true);
    setTabActiva("map");

    setTimeout(() => {
      const coberturaEmerg =
        paciente.coverages.find((c) => /emergencia/i.test(c.type.es))?.pct ?? 100;
      const distKm = hospital.distKm > 0 ? hospital.distKm : 3;
      // Simulación realista: 75-120s. Con tips espaciados, da tiempo para "vivir" la espera.
      const duracionMs = Math.min(120000, Math.max(75000, distKm * 12000));
      const minutosReales = Math.max(3, Math.round(distKm * 2.5));
      const inicioTs = Date.now();

      setAmbulancia({
        hospitalNombre: hospital.name,
        hospitalId: hospital.id,
        hospitalLat: hospital.lat,
        hospitalLng: hospital.lng,
        destinoLat: destino.lat,
        destinoLng: destino.lng,
        inicioTs,
        duracionMs,
        cobertura: coberturaEmerg,
        insurer: paciente.insurer,
      });
      setConectando911(false);

      const anuncio =
        idioma === "es"
          ? `**🚑 Ambulancia despachada desde ${hospital.name}.** Llegada estimada en **${minutosReales} minutos**. Tu plan ${paciente.insurer} cubre el ${coberturaEmerg}% del traslado, copago $0. Mientras llega, te voy a guiar paso a paso.`
          : `**🚑 Ambulance dispatched from ${hospital.name}.** ETA: **${minutosReales} minutes**. Your ${paciente.insurer} plan covers ${coberturaEmerg}% — $0 copay. I'll guide you step by step until they arrive.`;
      setMensajes((m) => [...m, { role: "bot", text: anuncio }]);

      if (voiceRef.current) {
        ttsBufferRef.current = anuncio;
        flushBufferTTS(true);
      }

      // Pedir consejos a GPT-4o y programarlos
      (async () => {
        try {
          const resp = await fetch("/api/emergency/guidance", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sintomas: sintomasTriage,
              especialidad: especialidadTriage,
              pacienteNombre: paciente.name.split(" ")[0],
              preexisting: paciente.preexisting,
              durationSeconds: Math.round(duracionMs / 1000),
              idioma,
            }),
          });
          if (!resp.ok) return;
          const { tips } = (await resp.json()) as {
            tips: { atMs: number; icon: string; text: string }[];
          };

          for (const t of tips) {
            const elapsed = Date.now() - inicioTs;
            const delay = Math.max(0, t.atMs - elapsed);
            const timer = setTimeout(() => {
              const iconEmoji =
                t.icon === "calma"
                  ? "🧘"
                  : t.icon === "posicion"
                    ? "🪑"
                    : t.icon === "medicacion"
                      ? "💊"
                      : t.icon === "signos"
                        ? "🩺"
                        : t.icon === "llegada"
                          ? "🚑"
                          : "💡";
              const texto = `${iconEmoji} ${t.text}`;
              setMensajes((m) => [...m, { role: "bot", text: texto }]);
              if (voiceRef.current) {
                ttsBufferRef.current = t.text;
                flushBufferTTS(true);
              }
            }, delay);
            tipTimersRef.current.push(timer);
          }
        } catch {
          // si falla, igual la simulación corre
        }
      })();

      // Mensaje de llegada al final
      llegadaTimerRef.current = setTimeout(() => {
        const llegadaMsg =
          idioma === "es"
            ? `✓ **La ambulancia ha llegado.** Sigue las instrucciones del paramédico. Tu copago final es **$0** porque tu póliza ${paciente.insurer} cubre 100% emergencia. Te acompaño hasta el hospital.`
            : `✓ **The ambulance has arrived.** Follow the paramedic's instructions. Your final copay is **$0** because your ${paciente.insurer} policy covers emergency 100%. I'll keep you company on the way.`;
        setMensajes((m) => [...m, { role: "bot", text: llegadaMsg }]);
        if (voiceRef.current) {
          ttsBufferRef.current = llegadaMsg;
          flushBufferTTS(true);
        }
      }, duracionMs + 500);
    }, 1500);
  }, [
    ambulancia,
    conectando911,
    recomendaciones,
    ubicacion,
    paciente,
    idioma,
    agentes,
    flushBufferTTS,
  ]);

  const abrirReserva = (h: HospitalRecomendado) => setReservaPendiente(h);

  const confirmarReserva = (info: InfoReserva) => {
    const eraReagenda = confirmacion !== null;
    setConfirmacion(info);
    setReservaPendiente(null);
    setAcciones(null);
    setReagendada(eraReagenda);
  };

  const reagendarCita = useCallback(() => {
    if (!confirmacion || !recomendaciones) return;
    // Buscar el hospital de la reserva original por nombre
    const hospital = recomendaciones.find((h) => h.name === confirmacion.hospital);
    if (hospital) setReservaPendiente(hospital);
  }, [confirmacion, recomendaciones]);

  const cancelarCita = useCallback(async () => {
    const ok = await confirmar({
      title: idioma === "es" ? "¿Cancelar la cita?" : "Cancel appointment?",
      text: textos.cancelConfirm,
      confirmText: idioma === "es" ? "Sí, cancelar" : "Yes, cancel",
      cancelText: idioma === "es" ? "Volver" : "Back",
      icon: "warning",
      danger: true,
    });
    if (!ok) return;
    setConfirmacion(null);
    setReagendada(false);
  }, [textos.cancelConfirm, idioma]);

  const tabs: { id: IdPanel; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: "reasoning",
      label: textos.panels.reasoning,
      icon: <Sparkle s={12} />,
      badge: estados.filter((s) => s === "active").length,
    },
    { id: "policy", label: textos.panels.policy, icon: <Doc s={12} /> },
    { id: "map", label: textos.panels.map, icon: <Pin s={12} /> },
    { id: "costs", label: textos.panels.costs, icon: <Coin s={12} /> },
    {
      id: "historial",
      label: textos.panels.historial,
      icon: <Clock s={12} />,
      badge: historial.length || undefined,
    },
  ];

  const tieneUbic = estadoUbic === "ok" && !!ubicacion;

  return (
    <>
      <div className="app">
        <div className="topbar">
          <div className="brand" id="tour-brand">
            <BrandMark />
            <span>
              MedAdvisor<sup>AI</sup>
            </span>
          </div>
          <span className="topbar-pill">
            <span className="dot" />
            <span>{textos.sessionPill}</span>
          </span>
          <div className="topbar-spacer" />
          {voiceOn ? (
            <button
              className="voice-on-indicator"
              style={{ cursor: "pointer" }}
              onClick={probarVoz}
              title="Probar voz"
            >
              ◆ {idioma === "es" ? "Voz Andrea activa · probar" : "Voice Andrea on · test"}
            </button>
          ) : null}
          <span className="topbar-pill" style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
            <span className="dot violet" /> {textos.modelPill}
          </span>
          <ControlesPreferencias />
          <button
            className="icon-btn"
            id="tour-help"
            title={idioma === "es" ? "¿Cómo funciona?" : "How it works"}
            onClick={() => {
              setTutorialAbierto(true);
            }}
            style={{ fontFamily: "var(--font-serif)", fontWeight: 600, fontSize: 16 }}
          >
            ?
          </button>
          <button
            className="icon-btn"
            id="tour-tour"
            title={idioma === "es" ? "Tour interactivo" : "Interactive tour"}
            onClick={() => lanzarTour(idioma)}
            style={{ fontSize: 14 }}
          >
            ✦
          </button>
          <button
            className="icon-btn"
            id="tour-voice"
            title={voiceOn ? "Desactivar voz" : "Activar voz (Andrea)"}
            onClick={() => setVoiceOn((v) => !v)}
          >
            {voiceOn ? <VolumeOn s={15} /> : <VolumeOff s={15} />}
          </button>
          <button
            className="icon-btn"
            title={textos.resetDemo}
            onClick={reiniciarEstado}
            disabled={ejecutando}
          >
            <Reset s={15} />
          </button>
          <button className="icon-btn" title={textos.changeProfile} onClick={() => router.push("/")}>
            <Settings s={15} />
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              if (imagenPendiente) URL.revokeObjectURL(imagenPendiente.url);
              setImagenPendiente({ file, url: URL.createObjectURL(file) });
              setCaptionImg("");
            }
            e.target.value = "";
          }}
        />

        <div className="workspace">
          <div className="chat-col">
            <div className="patient-strip" id="tour-patient-strip">
              <div className={`avatar ${paciente.caseTone}`}>{paciente.initials}</div>
              <div className="patient-meta">
                <span className="name">
                  {paciente.name} · {paciente.age}
                </span>
                <span className="sub">
                  {paciente.insurer} {paciente.plan} · {paciente.city}
                </span>
              </div>
              <span className={`case-tag ${paciente.caseTone}`}>{paciente.caseLabel[idioma]}</span>
              <div className="ps-caso-id" style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
                <span className="kicker">
                  {textos.caseHash} #{paciente.id.toUpperCase().padEnd(5, "0")}
                </span>
              </div>
            </div>

            <div className="chat-stream scroll" ref={streamRef}>
              {mensajes.map((m, i) => (
                <BurbujaMensaje key={i} mensaje={m} />
              ))}
              {analizandoImg ? (
                <div
                  style={{
                    margin: "8px 24px 8px 62px",
                    padding: "10px 14px",
                    background: "var(--accent-ai-soft)",
                    border: "1px solid var(--accent-ai)",
                    borderRadius: "var(--radius-sm)",
                    fontSize: 12.5,
                    color: "var(--accent-ai)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  ◆ {idioma === "es"
                    ? "GPT-4o Vision analizando la imagen…"
                    : "GPT-4o Vision analyzing the image…"}
                </div>
              ) : null}
              {mostrarUrgencia && !ambulancia ? (
                <AlertaUrgencia
                  textos={textos}
                  onLlamar911={dispatcharAmbulancia}
                  onVerMapa={() => setTabActiva("map")}
                  conectando={conectando911}
                />
              ) : null}
              {ambulancia ? <TarjetaAmbulancia ambulancia={ambulancia} idioma={idioma} /> : null}
              {mostrarCosto && recomendaciones && recomendaciones.length > 0 && especialidadVisible ? (
                <TarjetaCostos
                  recomendaciones={recomendaciones}
                  especialidad={especialidadVisible}
                  idioma={idioma}
                  textos={textos}
                  onAgendar={abrirReserva}
                  onVerMapa={() => setTabActiva("map")}
                />
              ) : null}
              {confirmacion ? (
                <TarjetaConfirmacion
                  reserva={confirmacion}
                  textos={textos}
                  reagendada={reagendada}
                  onReagendar={reagendarCita}
                  onCancelar={cancelarCita}
                />
              ) : null}
              {acciones ? (
                <div style={{ margin: "8px 24px 8px 62px", display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {acciones.includes("book") && !confirmacion ? (
                    <button
                      className="btn primary"
                      onClick={() => recomendaciones && abrirReserva(recomendaciones[0])}
                    >
                      <Cal s={14} /> {textos.bookYes}
                    </button>
                  ) : null}
                  {acciones.includes("call911") ? (
                    <button
                      className="btn danger"
                      onClick={dispatcharAmbulancia}
                      disabled={conectando911 || ambulancia !== null}
                    >
                      <Phone s={14} />{" "}
                      {conectando911
                        ? "Conectando ECU 911…"
                        : ambulancia
                          ? idioma === "es"
                            ? "Ambulancia en ruta"
                            : "Ambulance en route"
                          : textos.call911}
                    </button>
                  ) : null}
                  {acciones.includes("map") ? (
                    <button className="btn ghost" onClick={() => setTabActiva("map")}>
                      <MapIcon s={14} /> {textos.seeMap}
                    </button>
                  ) : null}
                  {acciones.includes("reschedule") ? (
                    <button
                      className="btn primary"
                      onClick={reagendarCita}
                      disabled={!confirmacion}
                    >
                      <Cal s={14} /> {textos.reschedule}
                    </button>
                  ) : null}
                  {acciones.includes("cancel") ? (
                    <button
                      className="btn ghost"
                      onClick={cancelarCita}
                      disabled={!confirmacion}
                      style={{ color: "var(--red)", borderColor: "var(--red-soft)" }}
                    >
                      {textos.cancelAppt}
                    </button>
                  ) : null}
                  <button
                    className="btn ghost"
                    onClick={() => setAcciones(null)}
                    style={{ marginLeft: "auto" }}
                  >
                    {textos.later}
                  </button>
                </div>
              ) : null}
            </div>

            <div className="composer-wrap">
              {!tieneUbic && estadoUbic !== "error" ? (
                <div className="geo-banner" id="tour-geo">
                  <div className="geo-emoji">📍</div>
                  <div className="geo-text">
                    <strong>
                      {idioma === "es"
                        ? "Activa tu ubicación para recomendaciones por distancia real"
                        : "Share your location for distance-based recommendations"}
                    </strong>
                    <span>
                      {idioma === "es"
                        ? "Ordenamos los hospitales en red por proximidad real, no por simulación."
                        : "We order in-network hospitals by real proximity, not simulation."}
                    </span>
                  </div>
                  <button onClick={pedirUbicacion} disabled={estadoUbic === "pidiendo"}>
                    {estadoUbic === "pidiendo"
                      ? idioma === "es"
                        ? "Pidiendo…"
                        : "Asking…"
                      : idioma === "es"
                        ? "Activar ubicación"
                        : "Enable location"}
                  </button>
                </div>
              ) : null}
              {tieneUbic && ubicacion ? (
                <div className="geo-active">
                  📍 {idioma === "es" ? "Ubicación activa" : "Location active"} ·{" "}
                  {ubicacion.lat.toFixed(3)}, {ubicacion.lng.toFixed(3)}
                </div>
              ) : null}
              {estadoUbic === "error" ? (
                <div
                  className="geo-active"
                  style={{ background: "var(--amber-soft)", color: "var(--amber)", borderColor: "var(--amber)" }}
                >
                  ⚠ {idioma === "es" ? "Permiso denegado o no disponible" : "Permission denied or unavailable"}
                  <button
                    onClick={pedirUbicacion}
                    style={{ marginLeft: 6, color: "var(--amber)", textDecoration: "underline", fontSize: 11 }}
                  >
                    {idioma === "es" ? "reintentar" : "retry"}
                  </button>
                </div>
              ) : null}
              {imagenPendiente ? (
                <div className="img-pendiente">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imagenPendiente.url} alt="preview" className="img-thumb" />
                  <input
                    type="text"
                    className="img-cap"
                    placeholder={
                      idioma === "es"
                        ? "Cuenta qué pasó (opcional)…"
                        : "Tell what happened (optional)…"
                    }
                    value={captionImg}
                    onChange={(e) => setCaptionImg(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") analizarImagenPendiente();
                      if (e.key === "Escape") cancelarImagen();
                    }}
                    autoFocus
                  />
                  <button className="img-btn cancelar" onClick={cancelarImagen}>
                    {idioma === "es" ? "Cancelar" : "Cancel"}
                  </button>
                  <button
                    className="img-btn analizar"
                    onClick={analizarImagenPendiente}
                    disabled={analizandoImg}
                  >
                    {analizandoImg
                      ? idioma === "es"
                        ? "Analizando…"
                        : "Analyzing…"
                      : idioma === "es"
                        ? "Analizar"
                        : "Analyze"}
                  </button>
                </div>
              ) : null}
              {mensajes.length <= 1 && !ejecutando && !imagenPendiente ? (
                <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
                  <button
                    className="chip"
                    onClick={() => enviarMensaje(paciente.seedQuery[idioma])}
                  >
                    ▶ {textos.startCase}
                  </button>
                  <button className="chip" onClick={subirImagen}>
                    📷 {idioma === "es" ? "Analizar foto del síntoma" : "Analyze symptom photo"}
                  </button>
                  <button className="chip" onClick={alternarMicrofono}>
                    🎤 {idioma === "es" ? "Dictar por voz" : "Voice dictation"}
                  </button>
                </div>
              ) : null}
              <div className="composer" id="tour-composer">
                <button
                  className="tool-btn"
                  id="tour-camera"
                  aria-label="Subir imagen"
                  title={
                    idioma === "es"
                      ? "Subir foto del síntoma (GPT-4o Vision)"
                      : "Upload symptom photo (GPT-4o Vision)"
                  }
                  onClick={subirImagen}
                >
                  <Camera />
                </button>
                <button
                  id="tour-mic"
                  className={`tool-btn${escuchando ? " escuchando" : ""}`}
                  aria-label={escuchando ? "Detener dictado" : "Dictar por voz"}
                  title={
                    escuchando
                      ? idioma === "es"
                        ? "Detener (escuchando…)"
                        : "Stop (listening…)"
                      : idioma === "es"
                        ? "Dictar por voz"
                        : "Voice dictation"
                  }
                  onClick={alternarMicrofono}
                >
                  <Mic />
                </button>
                <input
                  ref={composerRef}
                  placeholder={
                    escuchando
                      ? idioma === "es"
                        ? "Escuchando…"
                        : "Listening…"
                      : textos.composerPlaceholder
                  }
                  value={composer}
                  onChange={(e) => setComposer(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") enviar();
                  }}
                  disabled={ejecutando}
                />
                <button
                  className="send-btn"
                  onClick={enviar}
                  disabled={ejecutando || !composer.trim()}
                  aria-label={textos.sendShortcut}
                >
                  <Send />
                </button>
              </div>
              <div className="composer-hint">
                <span>{ejecutando ? `${textos.typing}…` : textos.sendShortcut}</span>
                <span>HIPAA-aware · {textos.legalNote}</span>
              </div>
            </div>
          </div>

          <div className="side-panel">
            <div className="side-tabs" id="tour-tabs">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  className={`side-tab${tabActiva === t.id ? " active" : ""}`}
                  onClick={() => {
                    setTabActiva(t.id);
                    if (t.id === "policy") setPolizaVisible(true);
                  }}
                >
                  {t.icon}
                  {t.label}
                  {t.badge ? <span className="badge">{t.badge}</span> : null}
                </button>
              ))}
            </div>
            <div className="side-body scroll">
              {tabActiva === "reasoning" ? (
                <PanelRazonamiento agentes={agentes} estados={estados} textos={textos} />
              ) : tabActiva === "policy" ? (
                polizaVisible ? (
                  <PanelPoliza
                    paciente={paciente}
                    idioma={idioma}
                    textos={textos}
                    clausulaCitada={clausulaCitada}
                  />
                ) : (
                  <div className="panel-empty">
                    <div className="ico"><Doc s={22} /></div>
                    <div className="empty-title">{textos.policyEmptyTitle}</div>
                    <div className="empty-sub">{textos.policyEmptySub}</div>
                  </div>
                )
              ) : tabActiva === "map" ? (
                recomendaciones ? (
                  <PanelMapa
                    recomendaciones={recomendaciones}
                    textos={textos}
                    idioma={idioma}
                    ubicacion={ubicacion}
                    ambulancia={ambulancia}
                    onAgendar={abrirReserva}
                  />
                ) : (
                  <div className="panel-empty">
                    <div className="ico"><MapIcon s={22} /></div>
                    <div className="empty-title">{textos.mapEmptyTitle}</div>
                    <div className="empty-sub">{textos.mapEmptySub}</div>
                  </div>
                )
              ) : tabActiva === "costs" ? (
                recomendaciones ? (
                  <PanelCostos
                    recomendaciones={recomendaciones}
                    paciente={paciente}
                    idioma={idioma}
                    textos={textos}
                    onAgendar={abrirReserva}
                  />
                ) : (
                  <div className="panel-empty">
                    <div className="ico"><Coin s={22} /></div>
                    <div className="empty-title">{textos.costsEmptyTitle}</div>
                    <div className="empty-sub">{textos.costsEmptySub}</div>
                  </div>
                )
              ) : tabActiva === "historial" ? (
                <PanelHistorial paciente={paciente} historial={historial} idioma={idioma} />
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <ModalReserva
        abierto={reservaPendiente !== null}
        hospital={reservaPendiente}
        especialidad={paciente.specialty[idioma]}
        textos={textos}
        onCerrar={() => setReservaPendiente(null)}
        onConfirmar={confirmarReserva}
      />
      <Tutorial
        abierto={tutorialAbierto}
        onCerrar={() => setTutorialAbierto(false)}
        idioma={idioma}
      />
    </>
  );
}
