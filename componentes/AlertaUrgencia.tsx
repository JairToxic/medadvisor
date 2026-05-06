import { Map, Phone } from "@/componentes/Iconos";
import type { Textos } from "@/lib/i18n";

export function AlertaUrgencia({ textos }: { textos: Textos }) {
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
        <button className="btn solid">
          <Phone s={16} /> {textos.call911}
        </button>
        <button className="btn">
          <Map s={16} /> {textos.nearestEmergency}
        </button>
      </div>
    </div>
  );
}
