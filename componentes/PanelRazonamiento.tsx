import { Check, Sparkle } from "@/componentes/Iconos";
import type { AgenteEjecutado, EstadoAgente } from "@/lib/tipos";
import type { Textos } from "@/lib/i18n";

interface Props {
  agentes: AgenteEjecutado[];
  estados: EstadoAgente[];
  textos: Textos;
}

export function PanelRazonamiento({ agentes, estados, textos }: Props) {
  return (
    <div>
      <div className="reasoning-head">
        <div className="ico-brain"><Sparkle s={16} /></div>
        <div>
          <h3>{textos.reasoningTitle}</h3>
          <div className="sub">{textos.reasoningSub}</div>
        </div>
      </div>
      <div className="agent-list">
        {agentes.map((a, i) => {
          const st = estados[i] ?? "pending";
          return (
            <div key={i}>
              <div className={`agent ${st}`}>
                <div className="a-bullet">
                  {st === "done" ? <Check s={13} /> : i + 1}
                </div>
                <div>
                  <div className="a-name">{a.name}</div>
                  <div className="a-task">{a.task}</div>
                </div>
                <div className="a-time">
                  {st === "active" ? "·  ·  ·" : st === "done" ? `${a.ms}ms` : "—"}
                </div>
              </div>
              {st === "done" && a.output ? (
                <div className="agent-out">
                  {Object.entries(a.output)
                    .filter(([, v]) => v !== undefined)
                    .map(([k, v]) => (
                      <div key={k}>
                        <span className="key">{k}:</span>{" "}
                        <span className={`val ${typeof v === "object" ? v!.tone : ""}`}>
                          {typeof v === "object" ? v!.text : v}
                        </span>
                      </div>
                    ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
