import { Cal, Coin, Map, Sparkle } from "@/componentes/Iconos";
import type { HospitalRecomendado, Idioma } from "@/lib/tipos";
import type { Textos } from "@/lib/i18n";

interface Props {
  recomendaciones: HospitalRecomendado[];
  especialidad: string;
  idioma: Idioma;
  textos: Textos;
  onAgendar: (h: HospitalRecomendado) => void;
  onVerMapa: () => void;
}

export function TarjetaCostos({ recomendaciones, especialidad, idioma, textos, onAgendar, onVerMapa }: Props) {
  if (!recomendaciones || recomendaciones.length === 0) return null;
  const mejor = recomendaciones[0];
  const peor = recomendaciones[recomendaciones.length - 1];
  const ahorro = peor.copago - mejor.copago;

  return (
    <div className="inline-card">
      <div className="card-head">
        <Coin /> <span className="kicker">{textos.costsBreakdown}</span>
        <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-3)" }}>
          {especialidad}
        </span>
      </div>
      <div className="card-body">
        <div className="cost-grid">
          {recomendaciones.map((r, i) => (
            <div
              key={r.id}
              className={`cost-row clickable ${i === 0 ? "best" : i === recomendaciones.length - 1 ? "bad" : "warn"}`}
              onClick={() => onAgendar(r)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") onAgendar(r);
              }}
            >
              <span className="pill-mark" />
              <div>
                <div className="hosp-name">{r.name}</div>
                <div className="hosp-meta">
                  ${r.fee} · {idioma === "es" ? "cubre" : "covers"} {r.coveredPct}% ·{" "}
                  {r.inNet ? textos.inNet : textos.outOfNet}
                  {r.distKm > 0 ? ` · ${r.distKm} km` : ""}
                </div>
                {r.doctorSugerido ? (
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--accent-ai)",
                      fontFamily: "var(--font-mono)",
                      marginTop: 3,
                    }}
                  >
                    ◆ {r.doctorSugerido.name} · {r.doctorSugerido.schedule}
                  </div>
                ) : null}
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="copago">
                  <span className="currency">$</span>
                  {r.copago}
                </div>
                <div className="row-cta">
                  {idioma === "es" ? "Agendar →" : "Book →"}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="savings-line">
          <Sparkle s={12} /> {textos.bestSavings} <strong>${ahorro}</strong>{" "}
          {idioma === "es" ? "eligiendo" : "choosing"} {mejor.name}.{" "}
          {idioma === "es"
            ? "Click en cualquier hospital para agendar ahí."
            : "Click any hospital to book there."}
        </div>
        <div className="cta-row">
          <button className="btn primary" onClick={() => onAgendar(mejor)}>
            <Cal s={14} /> {textos.bookNow}: {mejor.name}
          </button>
          <button className="btn ghost" onClick={onVerMapa}>
            <Map s={14} /> {textos.seeMap}
          </button>
        </div>
      </div>
    </div>
  );
}
