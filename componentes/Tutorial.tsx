"use client";

import { useEffect, useState } from "react";
import type { Idioma } from "@/lib/tipos";

interface Paso {
  emoji: string;
  bg: string;
  sub: string;
  title: string;
  text: string;
  badges: string[];
}

const PASOS_ES: Paso[] = [
  {
    emoji: "✦",
    bg: "linear-gradient(135deg, #0c5b56 0%, #6e5ce8 100%)",
    sub: "Reto #3 · HackIAthon Viamatica 2026",
    title: "MedAdvisor: tu seguro de salud, claro",
    text: "Cruzamos lo que sientes con tu póliza y te decimos qué hacer, a qué hospital ir y cuánto pagas — en 30 segundos. Todo construido sobre Azure AI.",
    badges: ["Estimador agéntico de copago", "Sólo Azure"],
  },
  {
    emoji: "🧠",
    bg: "linear-gradient(135deg, #6e5ce8 0%, #0c5b56 100%)",
    sub: "Lo que ves a la derecha del chat",
    title: "Cadena de 4 agentes razonando",
    text: "TriageAgent clasifica el síntoma. CoverageAgent lee tu póliza. RecommenderAgent compara hospitales y calcula tu copago. Coordinator sintetiza la respuesta empática. Cada uno deja su huella en el panel de Razonamiento.",
    badges: ["Azure OpenAI · GPT-4o", "Streaming token a token", "JSON estructurado"],
  },
  {
    emoji: "📄",
    bg: "linear-gradient(135deg, #2f7a4f 0%, #0c5b56 100%)",
    sub: "Tu póliza, leída por la IA",
    title: "Document Intelligence + RAG vectorial",
    text: "Tu PDF se sube a Blob Storage, Document Intelligence extrae coberturas, deducible y red preferente. Las cláusulas se vectorizan con embeddings 3072-d e se indexan en AI Search. Cuando preguntas, citamos la cláusula textual aplicable.",
    badges: ["Document Intelligence", "AI Search · vector 3072d", "Blob Storage"],
  },
  {
    emoji: "🗺️",
    bg: "linear-gradient(135deg, #b06a13 0%, #6e5ce8 100%)",
    sub: "Datos reales en AI Search",
    title: "Hospitales y doctores reales",
    text: "12 hospitales del Ecuador con coordenadas y especialidades. 30 doctores con sus horarios. 20 procedimientos con costos. Si compartes tu ubicación, ordenamos por distancia geográfica real sobre OpenStreetMap.",
    badges: ["AI Search · directorio", "Geo-search", "OpenStreetMap"],
  },
  {
    emoji: "🎙️",
    bg: "linear-gradient(135deg, #b13a2c 0%, #6e5ce8 100%)",
    sub: "Más allá del texto",
    title: "Voz, visión y emergencias",
    text: "Sube una foto y GPT-4o Vision la analiza. La voz Andrea Neural (ecuatoriana) narra cada respuesta. En una emergencia, despachamos ambulancia simulada en el mapa con consejos en tiempo real durante la espera.",
    badges: ["GPT-4o Vision", "Azure Speech · es-EC-Andrea", "TTS streaming"],
  },
];

const PASOS_EN: Paso[] = [
  {
    emoji: "✦",
    bg: "linear-gradient(135deg, #0c5b56 0%, #6e5ce8 100%)",
    sub: "Challenge #3 · HackIAthon Viamatica 2026",
    title: "MedAdvisor: clear health insurance",
    text: "We cross what you feel against your policy and tell you what to do, where to go and how much you'll pay — in 30 seconds. Built entirely on Azure AI.",
    badges: ["Agentic copay estimator", "Azure-only"],
  },
  {
    emoji: "🧠",
    bg: "linear-gradient(135deg, #6e5ce8 0%, #0c5b56 100%)",
    sub: "What you see right of the chat",
    title: "4-agent reasoning chain",
    text: "TriageAgent classifies the symptom. CoverageAgent reads your policy. RecommenderAgent compares hospitals and computes your copay. Coordinator synthesizes the empathetic answer. Each leaves a trail in the Reasoning panel.",
    badges: ["Azure OpenAI · GPT-4o", "Token-by-token streaming", "Structured JSON"],
  },
  {
    emoji: "📄",
    bg: "linear-gradient(135deg, #2f7a4f 0%, #0c5b56 100%)",
    sub: "Your policy, read by AI",
    title: "Document Intelligence + vector RAG",
    text: "Your PDF uploads to Blob Storage. Document Intelligence extracts coverages, deductible and preferred network. Clauses get embedded (3072 dims) and indexed in AI Search. We cite the actual clause when you ask.",
    badges: ["Document Intelligence", "AI Search · 3072d vectors", "Blob Storage"],
  },
  {
    emoji: "🗺️",
    bg: "linear-gradient(135deg, #b06a13 0%, #6e5ce8 100%)",
    sub: "Real data in AI Search",
    title: "Real hospitals and doctors",
    text: "12 Ecuadorian hospitals with coordinates and specialties. 30 doctors with schedules. 20 procedures with cost ranges. Share your location and we sort by real geo distance over OpenStreetMap.",
    badges: ["AI Search · directory", "Geo-search", "OpenStreetMap"],
  },
  {
    emoji: "🎙️",
    bg: "linear-gradient(135deg, #b13a2c 0%, #6e5ce8 100%)",
    sub: "Beyond text",
    title: "Voice, vision and emergencies",
    text: "Upload a photo and GPT-4o Vision analyzes it. Andrea Neural (Ecuadorian) reads each response aloud. In emergencies, we dispatch a simulated ambulance on the map with real-time tips while you wait.",
    badges: ["GPT-4o Vision", "Azure Speech · es-EC-Andrea", "TTS streaming"],
  },
];

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  idioma: Idioma;
}

export function Tutorial({ abierto, onCerrar, idioma }: Props) {
  const [paso, setPaso] = useState(0);

  useEffect(() => {
    if (!abierto) setPaso(0);
  }, [abierto]);

  useEffect(() => {
    if (!abierto) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
      else if (e.key === "ArrowRight") setPaso((p) => Math.min(PASOS_ES.length - 1, p + 1));
      else if (e.key === "ArrowLeft") setPaso((p) => Math.max(0, p - 1));
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  const pasos = idioma === "es" ? PASOS_ES : PASOS_EN;
  const p = pasos[paso];
  const ultimo = paso === pasos.length - 1;
  const lblSaltar = idioma === "es" ? "Saltar" : "Skip";
  const lblAtras = idioma === "es" ? "Atrás" : "Back";
  const lblSig = idioma === "es" ? "Siguiente" : "Next";
  const lblFin = idioma === "es" ? "Empezar →" : "Start →";

  return (
    <div className="tut-shroud" onClick={onCerrar}>
      <div className="tut-modal" onClick={(e) => e.stopPropagation()}>
        <div className="tut-hero" style={{ background: p.bg }}>
          <span className="tut-emoji">{p.emoji}</span>
          <span className="tut-step-pill">
            {paso + 1} / {pasos.length}
          </span>
        </div>
        <div className="tut-body">
          <div className="tut-sub">{p.sub}</div>
          <h2 className="tut-title">{p.title}</h2>
          <p className="tut-text">{p.text}</p>
          <div className="tut-badges">
            {p.badges.map((b) => (
              <span key={b} className="tut-badge">
                ◆ {b}
              </span>
            ))}
          </div>
        </div>
        <div className="tut-foot">
          <button className="tut-skip" onClick={onCerrar}>
            {lblSaltar}
          </button>
          <div className="tut-dots">
            {pasos.map((_, i) => (
              <span
                key={i}
                className={`tut-dot${i === paso ? " active" : ""}`}
                onClick={() => setPaso(i)}
                style={{ cursor: "pointer" }}
              />
            ))}
          </div>
          <div className="tut-actions">
            {paso > 0 ? (
              <button className="btn ghost" onClick={() => setPaso((p) => p - 1)}>
                {lblAtras}
              </button>
            ) : null}
            <button
              className="btn primary"
              onClick={() => {
                if (ultimo) onCerrar();
                else setPaso((p) => p + 1);
              }}
            >
              {ultimo ? lblFin : lblSig}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
