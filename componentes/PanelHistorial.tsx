import type { EventoAtencion, Idioma, Paciente } from "@/lib/tipos";

interface Props {
  paciente: Paciente;
  historial: EventoAtencion[];
  idioma: Idioma;
}

function formatearFecha(iso: string, idioma: Idioma): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(idioma === "es" ? "es-EC" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function calcularProyeccion(historial: EventoAtencion[]) {
  const fechas = historial
    .map((e) => new Date(e.fecha).getTime())
    .filter((t) => Number.isFinite(t))
    .sort((a, b) => a - b);

  if (fechas.length < 2) {
    return { proximaFecha: null as Date | null, visitasAnno: historial.length || 1 };
  }

  const dt = (fechas[fechas.length - 1] - fechas[0]) / (fechas.length - 1);
  if (dt <= 0) {
    return { proximaFecha: null, visitasAnno: historial.length };
  }

  const proxima = new Date(fechas[fechas.length - 1] + dt);
  const visitasAnno = Math.max(1, Math.round((365 * 86400000) / dt));
  return { proximaFecha: proxima, visitasAnno };
}

export function PanelHistorial({ paciente, historial, idioma }: Props) {
  const totalGastado = historial.reduce((acc, e) => acc + e.copago, 0);
  const totalFacturado = historial.reduce((acc, e) => acc + e.total, 0);
  const ahorroAcumulado = totalFacturado - totalGastado;
  const especialidades = Array.from(new Set(historial.map((e) => e.especialidad)));

  const { proximaFecha, visitasAnno } = calcularProyeccion(historial);
  const gastoMedio = historial.length > 0 ? totalGastado / historial.length : 0;
  const proyeccionAnual = Math.round(gastoMedio * visitasAnno);

  return (
    <div style={{ minWidth: 0 }}>
      <div className="kicker" style={{ marginBottom: 10 }}>
        {idioma === "es" ? "Historial · " : "History · "}
        {historial.length} {idioma === "es" ? "atenciones" : "visits"}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 6,
          marginBottom: 10,
        }}
      >
        <div style={kpi}>
          <div style={kpiNum}>${totalGastado}</div>
          <div style={kpiLab}>{idioma === "es" ? "pagado" : "paid"}</div>
        </div>
        <div style={{ ...kpi, borderColor: "var(--green)" }}>
          <div style={{ ...kpiNum, color: "var(--green)" }}>${ahorroAcumulado}</div>
          <div style={kpiLab}>{idioma === "es" ? "ahorrado" : "saved"}</div>
        </div>
        <div style={kpi}>
          <div style={kpiNum}>{especialidades.length}</div>
          <div style={kpiLab}>{idioma === "es" ? "esp." : "spec."}</div>
        </div>
      </div>

      {historial.length >= 2 ? (
        <div
          style={{
            marginBottom: 14,
            padding: "10px 12px",
            background: "var(--accent-ai-soft)",
            border: "1px solid var(--accent-ai)",
            borderRadius: "var(--radius-sm)",
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
            gap: 8,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={proyKicker}>◆ {idioma === "es" ? "Proyección año" : "Yearly est."}</div>
            <div style={proyNum}>~${proyeccionAnual}</div>
            <div style={proySub}>
              {visitasAnno} {idioma === "es" ? "visitas/año" : "visits/yr"}
            </div>
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={proyKicker}>◆ {idioma === "es" ? "Próxima visita" : "Next visit"}</div>
            <div style={{ ...proyNum, fontSize: 16 }}>
              {proximaFecha
                ? proximaFecha.toLocaleDateString(idioma === "es" ? "es-EC" : "en-US", {
                    month: "short",
                    day: "numeric",
                  })
                : "—"}
            </div>
            <div style={proySub}>{idioma === "es" ? "estimado" : "estimated"}</div>
          </div>
        </div>
      ) : null}

      {historial.length === 0 ? (
        <div className="panel-empty" style={{ padding: 20 }}>
          <div className="empty-title">
            {idioma === "es" ? "Sin atenciones registradas" : "No visits on file"}
          </div>
          <div className="empty-sub">
            {idioma === "es"
              ? "Cuando agendes con MedAdvisor, las consultas aparecerán aquí."
              : "Once you book through MedAdvisor, visits will show here."}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {historial
            .slice()
            .sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
            .map((e, i) => (
              <div
                key={i}
                style={{
                  background: "var(--bg-elev)",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--radius-sm)",
                  padding: "10px 12px",
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    gap: 8,
                    marginBottom: 4,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10.5,
                      color: "var(--ink-3)",
                      letterSpacing: "0.04em",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {formatearFecha(e.fecha, idioma)}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-serif)",
                      fontSize: 16,
                      color: e.copago === 0 ? "var(--green)" : "var(--ink)",
                    }}
                  >
                    ${e.copago}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    marginBottom: 2,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {e.especialidad} · {e.motivo}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--ink-3)",
                    fontFamily: "var(--font-mono)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {e.hospitalName}
                  {e.doctorName ? ` · ${e.doctorName}` : ""}
                </div>
                {e.diagnostico ? (
                  <div
                    style={{
                      fontSize: 11.5,
                      color: "var(--ink-2)",
                      fontStyle: "italic",
                      borderTop: "1px dashed var(--line)",
                      paddingTop: 5,
                      marginTop: 5,
                    }}
                  >
                    {e.diagnostico}
                  </div>
                ) : null}
              </div>
            ))}
        </div>
      )}

      <div
        style={{
          marginTop: 14,
          padding: "8px 11px",
          background: "var(--bg-elev)",
          border: "1px dashed var(--line)",
          borderRadius: "var(--radius-sm)",
          fontSize: 11,
          color: "var(--ink-2)",
          fontFamily: "var(--font-mono)",
        }}
      >
        {idioma === "es"
          ? "El agente conoce este historial al evaluar nuevos síntomas."
          : "The agent uses this history to evaluate new symptoms."}
      </div>
    </div>
  );
}

const kpi: React.CSSProperties = {
  background: "var(--bg-elev)",
  border: "1px solid var(--line)",
  borderRadius: "var(--radius-sm)",
  padding: "8px 9px",
  minWidth: 0,
};
const kpiNum: React.CSSProperties = {
  fontFamily: "var(--font-serif)",
  fontSize: 18,
  letterSpacing: "-0.02em",
  lineHeight: 1.05,
  color: "var(--ink)",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};
const kpiLab: React.CSSProperties = {
  fontSize: 9.5,
  color: "var(--ink-3)",
  fontFamily: "var(--font-mono)",
  letterSpacing: "0.05em",
  marginTop: 2,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};
const proyKicker: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 9.5,
  color: "var(--accent-ai)",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  marginBottom: 2,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};
const proyNum: React.CSSProperties = {
  fontFamily: "var(--font-serif)",
  fontSize: 20,
  color: "var(--ink)",
  lineHeight: 1.1,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};
const proySub: React.CSSProperties = {
  fontSize: 9.5,
  color: "var(--ink-3)",
  fontFamily: "var(--font-mono)",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};
