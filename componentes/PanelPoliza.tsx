import type { Idioma, Paciente } from "@/lib/tipos";
import type { Textos } from "@/lib/i18n";

interface Props {
  paciente: Paciente;
  idioma: Idioma;
  textos: Textos;
}

export function PanelPoliza({ paciente, idioma, textos }: Props) {
  const dedPct = Math.round((paciente.deductible.used / paciente.deductible.annual) * 100);
  const validacion = textos.policyValidations
    .replace("{n}", String(paciente.coverages.length))
    .replace("{m}", String(paciente.network.length));

  return (
    <div>
      <div className="kicker" style={{ marginBottom: 10 }}>{textos.policyKicker}</div>
      <div className="policy-card">
        <div className="policy-head">
          <div className={`insurer-mark ${paciente.insurerTone}`}>{paciente.insurerMark}</div>
          <div>
            <div className="insurer-name">{paciente.insurer}</div>
            <div className="plan-name">{paciente.plan} · #{paciente.policyNo}</div>
          </div>
          <span className="status-pill">{textos.policyValid}</span>
        </div>
        <div className="policy-grid">
          <div className="policy-cell">
            <div className="label">{textos.insured}</div>
            <div className="value">{paciente.name}</div>
          </div>
          <div className="policy-cell">
            <div className="label">{textos.age}</div>
            <div className="value">{paciente.age}<span className="unit">años</span></div>
          </div>
          <div className="policy-cell">
            <div className="label">{textos.validity}</div>
            <div className="value" style={{ fontSize: 12.5, fontFamily: "var(--font-mono)", fontWeight: 400 }}>
              {paciente.validity}
            </div>
          </div>
          <div className="policy-cell">
            <div className="label">{textos.city}</div>
            <div className="value">{paciente.city}</div>
          </div>
          <div className="policy-cell">
            <div className="label">{textos.annualDeductible}</div>
            <div className="value">${paciente.deductible.annual}</div>
          </div>
          <div className="policy-cell">
            <div className="label">{textos.consumed}</div>
            <div className="value" style={{ color: dedPct > 80 ? "var(--amber)" : "var(--ink)" }}>
              ${paciente.deductible.used}<span className="unit">{dedPct}%</span>
            </div>
          </div>
        </div>
        <div className="coverage-bars">
          <div className="kicker" style={{ fontSize: 10, marginBottom: 4 }}>{textos.coverages}</div>
          {paciente.coverages.map((cov, i) => (
            <div className="bar-row" key={i}>
              <div className="bar-top">
                <span className="bar-label">{cov.type[idioma]}</span>
                <span className="bar-pct">{cov.pct}%</span>
              </div>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${cov.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ fontSize: 11.5, color: "var(--ink-3)", fontFamily: "var(--font-mono)", padding: "0 4px" }}>
        ✓ {validacion}
      </div>
    </div>
  );
}
