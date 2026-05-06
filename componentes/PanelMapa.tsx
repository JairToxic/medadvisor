import type { HospitalRecomendado, Idioma } from "@/lib/tipos";
import type { Textos } from "@/lib/i18n";

interface Props {
  recomendaciones: HospitalRecomendado[];
  textos: Textos;
  idioma: Idioma;
}

export function PanelMapa({ recomendaciones, textos, idioma }: Props) {
  if (recomendaciones.length === 0) return null;

  return (
    <div>
      <div className="kicker" style={{ marginBottom: 10 }}>{textos.mapsKicker}</div>
      <div className="map-card">
        <div className="map-canvas">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M -5 75 Q 25 65 50 78 T 105 70" stroke="#bfd3da" strokeWidth="3" fill="none" opacity="0.7" />
            <g stroke="#c7c4b6" strokeWidth="0.4" fill="none" opacity="0.7">
              <path d="M 10 0 L 12 100" />
              <path d="M 30 0 L 35 100" />
              <path d="M 60 0 L 58 100" />
              <path d="M 85 0 L 82 100" />
              <path d="M 0 20 L 100 18" />
              <path d="M 0 45 L 100 48" />
              <path d="M 0 65 L 100 67" />
              <path d="M 0 88 L 100 86" />
            </g>
            <g stroke="#c7c4b6" strokeWidth="0.2" fill="none" opacity="0.5">
              <path d="M 0 10 L 100 11" />
              <path d="M 0 30 L 100 32" />
              <path d="M 0 56 L 100 57" />
              <path d="M 20 0 L 22 100" />
              <path d="M 45 0 L 47 100" />
              <path d="M 73 0 L 71 100" />
            </g>
            <rect x="40" y="22" width="14" height="10" fill="#d4dfb7" opacity="0.7" rx="1" />
            <rect x="62" y="55" width="10" height="8" fill="#d4dfb7" opacity="0.7" rx="1" />
          </svg>
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "55%",
              transform: "translate(-50%,-50%)",
              width: 14,
              height: 14,
              borderRadius: 99,
              background: "#3a83f3",
              border: "3px solid white",
              boxShadow: "0 0 0 6px rgba(58,131,243,.2)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: "calc(50% + 12px)",
              top: "calc(55% - 6px)",
              fontFamily: "var(--font-mono)",
              fontSize: 9,
              color: "var(--ink-2)",
              background: "var(--bg-elev)",
              padding: "1px 5px",
              borderRadius: 4,
              border: "1px solid var(--line)",
            }}
          >
            {idioma === "es" ? "TÚ" : "YOU"}
          </div>
          {recomendaciones.map((r, i) => {
            const tone = r.tone || (i === 0 ? "" : i === 1 ? "warn" : "bad");
            return (
              <div
                key={r.id}
                className={`map-pin ${tone}`}
                style={{ left: `${r.lat}%`, top: `${r.lng}%` }}
              >
                <div className="pin-body">{i + 1}</div>
                <div className="pin-tail" />
              </div>
            );
          })}
        </div>
        <div className="map-list">
          {recomendaciones.map((r, i) => (
            <div key={r.id} className={`map-row${i === 0 ? " best" : ""}`}>
              <span className="m-num">0{i + 1}</span>
              <div>
                <div style={{ fontWeight: 500 }}>{r.name}</div>
                <div className="m-meta">
                  {r.distKm} km · ★ {r.rating} · {r.wait}min
                </div>
              </div>
              <div>
                <div className="m-cost">${r.copago}</div>
                <div className="m-meta" style={{ textAlign: "right" }}>{textos.copay}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
