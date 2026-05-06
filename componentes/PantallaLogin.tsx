"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Arrow, BrandMark, Lock } from "@/componentes/Iconos";
import { ID_PACIENTES, PACIENTES } from "@/datos/pacientes";
import { usePreferencias } from "@/componentes/ProveedorPreferencias";

const CODIGO = "HACKIATHON-VIAMATICA-2026";
const LONGITUD_CODIGO = CODIGO.replace(/-/g, "").length;

export function PantallaLogin() {
  const router = useRouter();
  const { idioma, textos } = usePreferencias();
  const [llenadas, setLlenadas] = useState(0);
  const [animando, setAnimando] = useState(false);

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

  const personas = ID_PACIENTES.map((id) => PACIENTES[id]);

  return (
    <div className="login">
      <div className="login-left">
        <div className="lo-brand">
          <BrandMark />
          <span>
            MedAdvisor<sup>AI</sup>
          </span>
        </div>
        <h1 className="lo-headline">
          {textos.headline.l1}
          <br />
          {textos.headline.l2}
          <br />
          <em>{textos.headline.l3}</em>
        </h1>
        <div>
          <div style={{ fontSize: 15, color: "var(--ink-2)", maxWidth: 460, lineHeight: 1.5, marginBottom: 28 }}>
            {textos.pitch}
          </div>
          <div className="stat-strip">
            <div className="stat">
              <span className="num">
                35<span style={{ fontSize: 14, color: "var(--ink-3)", marginLeft: 2 }}>s</span>
              </span>
              <span className="lab">{textos.vsCallCenter}</span>
            </div>
            <div className="stat">
              <span className="num">$87</span>
              <span className="lab">{textos.averageSavings}</span>
            </div>
            <div className="stat">
              <span className="num">4</span>
              <span className="lab">{textos.agentsKpi}</span>
            </div>
          </div>
        </div>
        <div className="lo-foot" style={{ marginTop: 40 }}>
          <span>{textos.evtFooter}</span>
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
