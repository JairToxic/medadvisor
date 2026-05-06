import { Check, Doc } from "@/componentes/Iconos";
import type { InfoReserva } from "@/lib/tipos";
import type { Textos } from "@/lib/i18n";

interface Props {
  reserva: InfoReserva;
  textos: Textos;
}

export function TarjetaConfirmacion({ reserva, textos }: Props) {
  return (
    <div className="confirm-card">
      <div className="conf-head">
        <Check s={13} /> {textos.appointmentConfirmed}
      </div>
      <div className="conf-body">
        <h4>
          {reserva.day}, {reserva.time} · {reserva.hospital}
        </h4>
        <div className="conf-grid">
          <div>
            <div className="key">{textos.specialtyKey}</div>
            <div className="val">{reserva.specialty}</div>
          </div>
          <div>
            <div className="key">{textos.estimatedCopay}</div>
            <div className="val">${reserva.copago}</div>
          </div>
          <div>
            <div className="key">{textos.doctor}</div>
            <div className="val">Dra. M. González</div>
          </div>
          <div>
            <div className="key">{textos.emailSent}</div>
            <div className="val">✓ paciente@correo.com</div>
          </div>
        </div>
      </div>
      <div className="conf-foot">
        <div className="qr-code" />
        <div className="conf-code">
          {textos.preValidationCode}
          <br />
          <strong>MA-{reserva.code}</strong>
        </div>
        <button className="btn ghost" style={{ marginLeft: "auto" }}>
          <Doc s={14} /> {textos.downloadPdf}
        </button>
      </div>
    </div>
  );
}
