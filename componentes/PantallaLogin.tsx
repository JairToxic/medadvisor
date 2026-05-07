"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Arrow, BrandMark, Lock } from "@/componentes/Iconos";
import { usePreferencias } from "@/componentes/ProveedorPreferencias";
import { Tutorial } from "@/componentes/Tutorial";
import type { Paciente } from "@/lib/tipos";

const CODIGO = "HACKIATHON-VIAMATICA-2026";
const LONGITUD_CODIGO = CODIGO.replace(/-/g, "").length;

interface Props {
  pacientes: Paciente[];
}

const CLAVE_TUTORIAL = "medadvisor:tutorial-visto";

export function PantallaLogin({ pacientes }: Props) {
  const router = useRouter();
  const { idioma, textos } = usePreferencias();
  const [llenadas, setLlenadas] = useState(0);
  const [animando, setAnimando] = useState(false);
  const [tutorialAbierto, setTutorialAbierto] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(CLAVE_TUTORIAL)) setTutorialAbierto(true);
    } catch {}
  }, []);

  const cerrarTutorial = () => {
    setTutorialAbierto(false);
    try {
      localStorage.setItem(CLAVE_TUTORIAL, "1");
    } catch {}
  };

  useEffect(() => {
    if (!animando) return;
    const id = setInterval(() => {
      setLlenadas((f) => {
        if (f >= LONGITUD_CODIGO) {
          clearInterval(id);
          return f;
        }
        return f + 1;
      });
    }, 55);
    return () => clearInterval(id);
  }, [animando]);

  const iniciarAuto = () => {
    setLlenadas(0);
    setAnimando(true);
  };

  const celdas: React.ReactNode[] = [];
  let idx = 0;
  CODIGO.split("").forEach((ch, i) => {
    if (ch === "-") {
      celdas.push(<div key={`s${i}`} className="otp-sep" />);
    } else {
      const llena = idx < llenadas;
      celdas.push(
        <div key={i} className={`otp-cell${llena ? " filled" : ""}`}>
          {llena ? ch : ""}
        </div>,
      );
      idx++;
    }
  });

  const personas = pacientes;

  return (
    <div className="login">
      <Tutorial abierto={tutorialAbierto} onCerrar={cerrarTutorial} idioma={idioma} />
      <div className="login-left">
        <div className="lo-brand" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <BrandMark />
            <span>
              MedAdvisor<sup>AI</sup>
            </span>
          </span>
          <button onClick={() => setTutorialAbierto(true)} className="lo-cta-help">
            ◆ {idioma === "es" ? "Cómo funciona" : "How it works"}
          </button>
        </div>

        <h1 className="lo-headline" style={{ margin: "auto 0 8px" }}>
          {textos.headline.l1}
          <br />
          {textos.headline.l2}
          <br />
          <em>{textos.headline.l3}</em>
        </h1>

        <div style={{ fontSize: 15, color: "var(--ink-2)", maxWidth: 520, lineHeight: 1.55 }}>
          {textos.pitch}
        </div>

        {/* Flujo en una línea */}
        <div className="lo-flow">
          <div className="lo-flow-title">
            {idioma === "es" ? "◆ Cómo funciona" : "◆ How it works"}
          </div>
          <div className="lo-flow-row">
            <span className="lo-pill">{idioma === "es" ? "1. Síntoma" : "1. Symptom"}</span>
            <span className="lo-arrow">→</span>
            <span className="lo-pill">{idioma === "es" ? "2. Triage IA" : "2. AI triage"}</span>
            <span className="lo-arrow">→</span>
            <span className="lo-pill">{idioma === "es" ? "3. Cobertura" : "3. Coverage"}</span>
            <span className="lo-arrow">→</span>
            <span className="lo-pill">{idioma === "es" ? "4. Hospital" : "4. Hospital"}</span>
            <span className="lo-arrow">→</span>
            <span className="lo-pill" style={{ background: "var(--green-soft)", color: "var(--green)" }}>
              {idioma === "es" ? "5. Copago $" : "5. Copay $"}
            </span>
          </div>
        </div>

        {/* Stack visible */}
        <div className="lo-stack">
          <div className="lo-stack-card">
            <span className="ls-emoji">🧠</span>
            <div>
              <strong>{idioma === "es" ? "4 agentes GPT-4o" : "4 GPT-4o agents"}</strong>
              <span>Azure OpenAI · streaming</span>
            </div>
          </div>
          <div className="lo-stack-card">
            <span className="ls-emoji">📄</span>
            <div>
              <strong>{idioma === "es" ? "OCR de pólizas" : "Policy OCR"}</strong>
              <span>Document Intelligence</span>
            </div>
          </div>
          <div className="lo-stack-card">
            <span className="ls-emoji">🔎</span>
            <div>
              <strong>{idioma === "es" ? "RAG vectorial" : "Vector RAG"}</strong>
              <span>AI Search · 3072d</span>
            </div>
          </div>
          <div className="lo-stack-card">
            <span className="ls-emoji">🗺️</span>
            <div>
              <strong>{idioma === "es" ? "Geo + ruta real" : "Geo + real route"}</strong>
              <span>OpenStreetMap · OSRM</span>
            </div>
          </div>
          <div className="lo-stack-card">
            <span className="ls-emoji">🎙️</span>
            <div>
              <strong>{idioma === "es" ? "Voz Andrea Neural" : "Andrea Neural voice"}</strong>
              <span>Azure Speech · es-EC</span>
            </div>
          </div>
          <div className="lo-stack-card">
            <span className="ls-emoji">📷</span>
            <div>
              <strong>{idioma === "es" ? "Visión + ambulancia" : "Vision + ambulance"}</strong>
              <span>GPT-4o Vision · ECU 911</span>
            </div>
          </div>
        </div>

        <div className="lo-foot" style={{ marginTop: "auto", paddingTop: 28 }}>
          <span>HackIAthon Viamatica 2026</span>
          <span>·</span>
          <span>Reto #3 — Estimador agéntico de copago</span>
        </div>
      </div>
      <div className="login-right">
        <h2>{textos.accessTitle}</h2>
        <div className="lo-sub">{textos.accessSub}</div>

        <div className="kicker" style={{ marginBottom: 8 }}>{textos.accessCode}</div>
        <div className="otp-row" onClick={iniciarAuto} style={{ cursor: "pointer" }}>
          {celdas}
        </div>
        <div
          style={{
            fontSize: 11.5,
            color: "var(--ink-3)",
            fontFamily: "var(--font-mono)",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Lock /> {textos.autoFillHint}
        </div>

        <div className="persona-pick">
          <div className="ph-label">{textos.chooseProfile}</div>
          {personas.map((p) => (
            <div
              key={p.id}
              className="persona-card"
              onClick={() => router.push(`/consulta/${p.id}`)}
            >
              <div className={`avatar ${p.caseTone}`}>{p.initials}</div>
              <div>
                <div className="pname">
                  {p.name} · {p.age}
                </div>
                <div className="pcase">
                  {p.insurer} {p.plan} · {p.caseLabel[idioma]}
                </div>
              </div>
              <span className="arrow">
                <Arrow s={16} />
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
