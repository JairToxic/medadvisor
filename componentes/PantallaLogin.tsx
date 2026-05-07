"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Arrow } from "@/componentes/Iconos";
import { usePreferencias } from "@/componentes/ProveedorPreferencias";
import { Tutorial } from "@/componentes/Tutorial";
import type { Paciente } from "@/lib/tipos";

interface Props {
  pacientes: Paciente[];
}

const CLAVE_TUTORIAL = "medadvisor:tutorial-visto";

export function PantallaLogin({ pacientes }: Props) {
  const router = useRouter();
  const { idioma, textos } = usePreferencias();
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

  const personas = pacientes;

  return (
    <div className="login">
      <Tutorial abierto={tutorialAbierto} onCerrar={cerrarTutorial} idioma={idioma} />
      <div className="login-left">
        <div
          className="lo-brand"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/Logo-achachai-vertical.svg"
            alt="achachai"
            style={{ height: 130, width: "auto" }}
          />
          <button onClick={() => setTutorialAbierto(true)} className="lo-cta-help">
            ◆ {idioma === "es" ? "Cómo funciona" : "How it works"}
          </button>
        </div>

        <h1 className="lo-headline" style={{ margin: "auto 0 0", maxWidth: 540 }}>
          {textos.headline.l1}
          <br />
          {textos.headline.l2}
          <br />
          <em>{textos.headline.l3}</em>
        </h1>

        <div
          style={{
            fontSize: 15,
            color: "var(--ink-2)",
            maxWidth: 540,
            lineHeight: 1.55,
            marginTop: 18,
          }}
        >
          {textos.pitch}
        </div>

        {/* Flujo en una línea, sin caja */}
        <div className="lo-flow">
          <span className="lo-pill">{idioma === "es" ? "Síntoma" : "Symptom"}</span>
          <span className="lo-arrow">→</span>
          <span className="lo-pill">{idioma === "es" ? "Triage IA" : "AI triage"}</span>
          <span className="lo-arrow">→</span>
          <span className="lo-pill">{idioma === "es" ? "Cobertura" : "Coverage"}</span>
          <span className="lo-arrow">→</span>
          <span className="lo-pill">{idioma === "es" ? "Hospital" : "Hospital"}</span>
          <span className="lo-arrow">→</span>
          <span className="lo-pill last">{idioma === "es" ? "Copago $" : "Copay $"}</span>
        </div>

        {/* Stack tecnológico en chips */}
        <div className="lo-stack">
          <span className="lo-chip"><span className="lo-chip-ico">◆</span> Azure OpenAI · GPT-4o</span>
          <span className="lo-chip"><span className="lo-chip-ico">◆</span> Document Intelligence</span>
          <span className="lo-chip"><span className="lo-chip-ico">◆</span> AI Search · 3072d</span>
          <span className="lo-chip"><span className="lo-chip-ico">◆</span> Blob Storage</span>
          <span className="lo-chip"><span className="lo-chip-ico">◆</span> Speech · Andrea Neural</span>
          <span className="lo-chip"><span className="lo-chip-ico">◆</span> GPT-4o Vision</span>
          <span className="lo-chip"><span className="lo-chip-ico">◆</span> OpenStreetMap · OSRM</span>
        </div>

        <div className="lo-foot" style={{ marginTop: "auto", paddingTop: 30 }}>
          <span>HackIAthon Viamatica 2026</span>
          <span>·</span>
          <span>{idioma === "es" ? "Reto #3 — Estimador agéntico de copago" : "Challenge #3 — Agentic copay estimator"}</span>
        </div>
      </div>

      <div className="login-right">
        <h2>{idioma === "es" ? "Elige un perfil" : "Pick a profile"}</h2>
        <div className="lo-sub">
          {idioma === "es"
            ? "5 pacientes sintéticos con casos clínicos distintos para que el jurado pueda recorrer todo el flujo."
            : "5 synthetic patients with distinct clinical cases so the jury can walk through the full flow."}
        </div>

        <div className="ph-label">
          {idioma === "es" ? "Perfiles de demostración" : "Demo profiles"}
        </div>
        <div className="persona-pick">
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

        <div className="lo-disclaimer">
          {idioma === "es"
            ? "Datos sintéticos. Aseguradoras y pacientes son ficticios. Aplicación referencial."
            : "Synthetic data. Insurers and patients are fictional. Reference only."}
        </div>
      </div>
    </div>
  );
}
