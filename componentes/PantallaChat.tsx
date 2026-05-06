"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BrandMark,
  Cal,
  Camera,
  Coin,
  Doc,
  Map as MapIcon,
  Mic,
  Paperclip,
  Phone,
  Pin,
  Reset,
  Send,
  Settings,
  Sparkle,
} from "@/componentes/Iconos";
import { BurbujaMensaje } from "@/componentes/BurbujaMensaje";
import { TarjetaCostos } from "@/componentes/TarjetaCostos";
import { AlertaUrgencia } from "@/componentes/AlertaUrgencia";
import { TarjetaConfirmacion } from "@/componentes/TarjetaConfirmacion";
import { ModalReserva } from "@/componentes/ModalReserva";
import { PanelRazonamiento } from "@/componentes/PanelRazonamiento";
import { PanelPoliza } from "@/componentes/PanelPoliza";
import { PanelMapa } from "@/componentes/PanelMapa";
import { PanelCostos } from "@/componentes/PanelCostos";
import { ControlesPreferencias } from "@/componentes/ControlesPreferencias";
import { usePreferencias } from "@/componentes/ProveedorPreferencias";
import { ESCENARIOS } from "@/datos/escenarios";
import type {
  AccionRapida,
  AgenteEjecutado,
  EstadoAgente,
  HospitalRecomendado,
  IdPanel,
  IdPaciente,
  InfoReserva,
  Mensaje,
  Paciente,
} from "@/lib/tipos";

interface Props {
  paciente: Paciente;
}

const ESTADOS_INICIALES: EstadoAgente[] = ["pending", "pending", "pending", "pending"];

const dormir = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function PantallaChat({ paciente }: Props) {
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
  const [composer, setComposer] = useState("");
  const [ejecutando, setEjecutando] = useState(false);
  const [polizaVisible, setPolizaVisible] = useState(false);
  const streamRef = useRef<HTMLDivElement | null>(null);
  const tokenEjecucion = useRef(0);

  useEffect(() => {
    const el = streamRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [mensajes, mostrarCosto, mostrarUrgencia, confirmacion, acciones]);

  useEffect(() => {
    tokenEjecucion.current += 1;
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
    setEjecutando(false);
  }, [paciente.id, idioma, agentesIniciales, paciente.name]);

  const transmitirBot = useCallback(
    (texto: string, token: number) =>
      new Promise<void>((resolve) => {
        let i = 0;
        setMensajes((m) => [...m, { role: "bot", text: "", streaming: true }]);
        const paso = Math.max(1, Math.floor(texto.length / 60));
        const intv = setInterval(() => {
          if (token !== tokenEjecucion.current) {
            clearInterval(intv);
            resolve();
            return;
          }
          i += paso;
          if (i >= texto.length) {
            clearInterval(intv);
            setMensajes((m) => {
              const cp = [...m];
              cp[cp.length - 1] = { role: "bot", text: texto, streaming: false };
              return cp;
            });
            resolve();
          } else {
            const corte = i;
            setMensajes((m) => {
              const cp = [...m];
              cp[cp.length - 1] = { role: "bot", text: texto.slice(0, corte), streaming: true };
              return cp;
            });
          }
        }, 22);
      }),
    [],
  );

  const reproducirEscenario = useCallback(async () => {
    if (ejecutando) return;
    tokenEjecucion.current += 1;
    const token = tokenEjecucion.current;
    setEjecutando(true);
    setMostrarCosto(false);
    setMostrarUrgencia(false);
    setAcciones(null);
    setConfirmacion(null);
    setEstados(ESTADOS_INICIALES);

    const flujo = ESCENARIOS[paciente.id as IdPaciente](paciente, idioma);
    for (const ev of flujo) {
      if (token !== tokenEjecucion.current) return;
      switch (ev.type) {
        case "user":
          setMensajes((m) => [...m, { role: "user", text: ev.text }]);
          break;
        case "wait":
          await dormir(ev.ms);
          break;
        case "sidepanel":
          setTabActiva(ev.tab);
          if (ev.tab === "policy") setPolizaVisible(true);
          break;
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
            cp[ev.idx] = { ...cp[ev.idx], ms: ev.ms, output: ev.output };
            return cp;
          });
          break;
        case "bot":
          await transmitirBot(ev.text, token);
          break;
        case "card":
          if (ev.kind === "cost") {
            setRecomendaciones(ev.recs);
            setEspecialidadVisible(ev.specialty);
            setMostrarCosto(true);
          }
          break;
        case "redflag":
          setMostrarUrgencia(true);
          break;
        case "actions":
          setAcciones(ev.actions);
          break;
        case "done":
          setEjecutando(false);
          break;
      }
    }
    setEjecutando(false);
  }, [ejecutando, paciente, idioma, transmitirBot]);

  const enviar = () => {
    if (!composer.trim() || ejecutando) return;
    setComposer("");
    reproducirEscenario();
  };

  const abrirReserva = (h: HospitalRecomendado) => setReservaPendiente(h);
  const confirmarReserva = (info: InfoReserva) => {
    setConfirmacion(info);
    setReservaPendiente(null);
    setAcciones(null);
  };

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
  ];

  const etiquetaInicio = textos.caseLabelByType[paciente.case];

  return (
    <>
      <div className="app">
        <div className="topbar">
          <div className="brand">
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
          <span className="topbar-pill" style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
            <span className="dot violet" /> {textos.modelPill}
          </span>
          <ControlesPreferencias />
          <button
            className="icon-btn"
            title={textos.resetDemo}
            onClick={reproducirEscenario}
            disabled={ejecutando}
          >
            <Reset s={15} />
          </button>
          <button className="icon-btn" title={textos.changeProfile} onClick={() => router.push("/")}>
            <Settings s={15} />
          </button>
        </div>

        <div className="workspace">
          <div className="chat-col">
            <div className="patient-strip">
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
              <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
                <span className="kicker">
                  {textos.caseHash} #{paciente.id.toUpperCase().padEnd(5, "0")}
                </span>
              </div>
            </div>

            <div className="chat-stream scroll" ref={streamRef}>
              {mensajes.map((m, i) => (
                <BurbujaMensaje key={i} mensaje={m} />
              ))}
              {mostrarUrgencia ? <AlertaUrgencia textos={textos} /> : null}
              {mostrarCosto && recomendaciones && especialidadVisible ? (
                <TarjetaCostos
                  recomendaciones={recomendaciones}
                  especialidad={especialidadVisible}
                  idioma={idioma}
                  textos={textos}
                  onAgendar={abrirReserva}
                  onVerMapa={() => setTabActiva("map")}
                />
              ) : null}
              {confirmacion ? <TarjetaConfirmacion reserva={confirmacion} textos={textos} /> : null}
              {acciones && !confirmacion ? (
                <div style={{ margin: "8px 24px 8px 62px", display: "flex", gap: 8 }}>
                  {acciones.includes("book") ? (
                    <button
                      className="btn primary"
                      onClick={() => recomendaciones && abrirReserva(recomendaciones[0])}
                    >
                      <Cal s={14} /> {textos.bookYes}
                    </button>
                  ) : null}
                  {acciones.includes("call911") ? (
                    <button className="btn danger">
                      <Phone s={14} /> {textos.call911}
                    </button>
                  ) : null}
                  {acciones.includes("map") ? (
                    <button className="btn ghost" onClick={() => setTabActiva("map")}>
                      <MapIcon s={14} /> {textos.seeMap}
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
              {mensajes.length <= 1 && !ejecutando ? (
                <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
                  <button className="chip" onClick={reproducirEscenario}>
                    ▶ {textos.startCase} · {etiquetaInicio}
                  </button>
                  <button className="chip">📎 {textos.uploadPolicy}</button>
                  <button className="chip">📷 {textos.uploadImage}</button>
                  <button className="chip">🎤 {textos.voice}</button>
                </div>
              ) : null}
              <div className="composer">
                <button className="tool-btn" aria-label="Adjuntar"><Paperclip /></button>
                <button className="tool-btn" aria-label="Cámara"><Camera /></button>
                <button className="tool-btn" aria-label="Voz"><Mic /></button>
                <input
                  placeholder={textos.composerPlaceholder}
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
            <div className="side-tabs">
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
                  <PanelPoliza paciente={paciente} idioma={idioma} textos={textos} />
                ) : (
                  <div className="panel-empty">
                    <div className="ico"><Doc s={22} /></div>
                    <div className="empty-title">{textos.policyEmptyTitle}</div>
                    <div className="empty-sub">{textos.policyEmptySub}</div>
                  </div>
                )
              ) : tabActiva === "map" ? (
                recomendaciones ? (
                  <PanelMapa recomendaciones={recomendaciones} textos={textos} idioma={idioma} />
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
                  />
                ) : (
                  <div className="panel-empty">
                    <div className="ico"><Coin s={22} /></div>
                    <div className="empty-title">{textos.costsEmptyTitle}</div>
                    <div className="empty-sub">{textos.costsEmptySub}</div>
                  </div>
                )
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
    </>
  );
}
