import { Map, Phone } from "@/componentes/Iconos";
import type { Textos } from "@/lib/i18n";

interface Props {
  textos: Textos;
  onLlamar911?: () => void;
  onVerMapa?: () => void;
  conectando?: boolean;
}

export function AlertaUrgencia({ textos, onLlamar911, onVerMapa, conectando = false }: Props) {
  return (
    <div className="redflag">
      <div className="rf-head">
        <span className="rf-pulse" />
        {textos.emergencyTriage}
      </div>
      <div className="rf-body">
        {textos.emergencyBody.l1}
        <br />
        <strong>{textos.emergencyBody.l2}</strong>
      </div>
      <div className="rf-actions">
        <button
          className="btn solid"
          onClick={onLlamar911}
          disabled={conectando}
          style={{ minWidth: 160 }}
        >
          <Phone s={16} />{" "}
          {conectando
            ? "Conectando ECU 911…"
            : textos.call911}
        </button>
        <button className="btn" onClick={onVerMapa}>
          <Map s={16} /> {textos.nearestEmergency}
        </button>
      </div>
    </div>
  );
}
