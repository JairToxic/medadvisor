import type { HospitalRecomendado, Idioma, Paciente } from "@/lib/tipos";
import type { Textos } from "@/lib/i18n";

interface Props {
  recomendaciones: HospitalRecomendado[];
  paciente: Paciente;
  idioma: Idioma;
  textos: Textos;
}

export function PanelCostos({ recomendaciones, paciente, idioma, textos }: Props) {
  if (recomendaciones.length === 0) return null;
  const mejor = recomendaciones[0];
  const peor = recomendaciones[recomendaciones.length - 1];
  const ahorro = peor.copago - mejor.copago;

  return (
    <div>
      <div className="kicker" style={{ marginBottom: 10 }}>{textos.costsKicker}</div>
      <div
        style={{
          background: "var(--bg-elev)",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius)",
          padding: 18,
          boxShadow: "var(--shadow-1)",
        }}
      >
        <div style={{ fontSize: 12, color: "var(--ink-3)", fontFamily: "var(--font-mono)", marginBottom: 4 }}>
          {textos.procedure}
        </div>
        <div style={{ fontFamily: "var(--font-serif)", fontSize: 22, letterSpacing: "-0.01em", marginBottom: 18 }}>
          {idioma === "es" ? "Consulta" : "Visit"} {paciente.specialty[idioma]}
        </div>
        <div className="cost-grid">
          {recomendaciones.map((r, i) => (
            <div
              key={r.id}
              className={`cost-row ${i === 0 ? "best" : i === recomendaciones.length - 1 ? "bad" : "warn"}`}
            >
              <span className="pill-mark" />
              <div>
                <div className="hosp-name">{r.name}</div>
                <div className="hosp-meta">
                  ${r.fee} · {idioma === "es" ? "cubre" : "covers"} {r.coveredPct}% ·{" "}
                  {r.inNet ? textos.inNet : textos.outOfNet}
                </div>
              </div>
              <div className="copago">
                <span className="currency">$</span>
                {r.copago}
              </div>
            </div>
          ))}
        </div>
        <div className="savings-line">
          {textos.bestSavings} <strong>${ahorro}</strong>{" "}
          {idioma === "es" ? "eligiendo" : "choosing"} {mejor.name}.
        </div>
      </div>
    </div>
  );
}
