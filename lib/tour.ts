"use client";

import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import type { Idioma } from "@/lib/tipos";

interface PasoBilingue {
  selector?: string;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  titulo: { es: string; en: string };
  texto: { es: string; en: string };
}

const PASOS: PasoBilingue[] = [
  {
    selector: "#tour-brand",
    side: "bottom",
    align: "start",
    titulo: { es: "MedAdvisor AI", en: "MedAdvisor AI" },
    texto: {
      es: "Tu asistente médico-financiero. Cuéntale lo que sientes y te dice qué hacer y cuánto pagas — todo cruzando tu póliza con la base de hospitales en tiempo real.",
      en: "Your medical-financial assistant. Tell it what you feel and it tells you what to do and how much you'll pay — by crossing your policy with the live hospital base.",
    },
  },
  {
    selector: "#tour-patient-strip",
    side: "bottom",
    align: "start",
    titulo: { es: "Tu perfil activo", en: "Your active profile" },
    texto: {
      es: "Aquí ves quién eres en la demo: tu plan de seguro, ciudad y caso clínico. Cada paciente se carga desde Blob Storage en tiempo real.",
      en: "Here's your demo profile: insurance plan, city and clinical case. Each patient loads from Blob Storage in real time.",
    },
  },
  {
    selector: "#tour-voice",
    side: "bottom",
    align: "end",
    titulo: { es: "Voz Andrea Neural", en: "Andrea Neural voice" },
    texto: {
      es: "Activa la voz ecuatoriana de Azure Speech para que cada respuesta se lea por chunks mientras se escribe, no al final. Click otra vez para probar.",
      en: "Toggle the Ecuadorian Azure Speech voice. Sentences are read aloud as they stream from GPT-4o, not at the end. Click again to test.",
    },
  },
  {
    selector: "#tour-help",
    side: "bottom",
    align: "end",
    titulo: { es: "Volver a ver la guía", en: "Replay the guide" },
    texto: {
      es: "Si te pierdes, abre este botón para repasar la arquitectura completa.",
      en: "If you get lost, open this for the full architecture refresher.",
    },
  },
  {
    selector: "#tour-geo",
    side: "top",
    align: "start",
    titulo: { es: "Activa tu ubicación", en: "Share your location" },
    texto: {
      es: "Sin esto, los hospitales se ordenan por costo. Con esto, AI Search los ordena por distancia geográfica real, y la ambulancia simulada sigue calles reales.",
      en: "Without this, hospitals sort by cost. With it, AI Search sorts by real geo distance and the simulated ambulance follows real streets.",
    },
  },
  {
    selector: "#tour-composer",
    side: "top",
    align: "start",
    titulo: { es: "Cuéntale a MedAdvisor", en: "Tell MedAdvisor" },
    texto: {
      es: "Escribe en lenguaje natural. También puedes dictar por voz, subir una foto del síntoma o usar el chip 'Iniciar caso'.",
      en: "Type freely. You can also dictate by voice, upload a symptom photo or use the 'Start case' chip.",
    },
  },
  {
    selector: "#tour-camera",
    side: "top",
    align: "center",
    titulo: { es: "GPT-4o Vision", en: "GPT-4o Vision" },
    texto: {
      es: "Sube una foto y el modelo la analiza junto con un caption opcional. Si Azure Content Safety la bloquea, el flujo continúa con tu texto.",
      en: "Upload an image and the model analyzes it with an optional caption. If Azure Content Safety blocks it, the flow continues with your text.",
    },
  },
  {
    selector: "#tour-mic",
    side: "top",
    align: "center",
    titulo: { es: "Dictado por voz", en: "Voice dictation" },
    texto: {
      es: "Mantén un click y habla. Tu voz se transcribe en tiempo real al input.",
      en: "Click and talk. Your voice transcribes into the input in real time.",
    },
  },
  {
    selector: "#tour-tabs",
    side: "left",
    align: "start",
    titulo: { es: "5 paneles de transparencia", en: "5 transparency panels" },
    texto: {
      es: "Razonamiento (4 agentes en vivo) · Póliza (OCR + cláusula citada) · Hospitales (AI Search + ruta real) · Costos (desglose) · Historial (con proyección anual).",
      en: "Reasoning (4 live agents) · Policy (OCR + cited clause) · Hospitals (AI Search + real route) · Costs (breakdown) · History (yearly projection).",
    },
  },
  {
    titulo: { es: "¡Empieza tú!", en: "Your turn!" },
    texto: {
      es: "Click en '▶ Iniciar caso' para ver el flujo entero, o escribe libremente lo que sientes. La voz puede leerlo todo si la activaste.",
      en: "Click '▶ Start case' to see the full flow, or type whatever you feel. Andrea's voice will narrate everything if enabled.",
    },
  },
];

const CLAVE_VISTO = "medadvisor:tour-chat-visto";

export function tourFueVisto(): boolean {
  try {
    return localStorage.getItem(CLAVE_VISTO) === "1";
  } catch {
    return false;
  }
}

export function marcarTourVisto() {
  try {
    localStorage.setItem(CLAVE_VISTO, "1");
  } catch {}
}

export function lanzarTour(idioma: Idioma) {
  const d = driver({
    showProgress: true,
    popoverClass: "medadvisor-tour",
    nextBtnText: idioma === "es" ? "Siguiente" : "Next",
    prevBtnText: idioma === "es" ? "Atrás" : "Back",
    doneBtnText: idioma === "es" ? "¡Listo!" : "Done",
    progressText: idioma === "es" ? "Paso {{current}} de {{total}}" : "Step {{current}} of {{total}}",
    onDestroyed: () => {
      marcarTourVisto();
    },
    steps: PASOS.map((p) => ({
      element: p.selector,
      popover: {
        title: p.titulo[idioma],
        description: p.texto[idioma],
        side: p.side,
        align: p.align,
      },
    })),
  });
  d.drive();
}
