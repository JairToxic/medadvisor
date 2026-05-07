import { Cal, Check } from "@/componentes/Iconos";
import type { InfoReserva } from "@/lib/tipos";
import type { Textos } from "@/lib/i18n";

interface Props {
  reserva: InfoReserva;
  textos: Textos;
  reagendada?: boolean;
  onReagendar?: () => void;
  onCancelar?: () => void;
}

export function TarjetaConfirmacion({ reserva, textos, reagendada, onReagendar, onCancelar }: Props) {
  return (
    <div className="confirm-card">
      <div className="conf-head">
        <Check s={13} />{" "}
        {reagendada ? textos.rescheduled.toUpperCase() : textos.appointmentConfirmed}
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
            <div className="val">{reserva.doctor ?? "Por asignar"}</div>
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
        <div style={{ marginLeft: "auto", display: "flex", gap: 6, flexWrap: "wrap" }}>
          {onReagendar ? (
            <button className="btn ghost" onClick={onReagendar} style={{ fontSize: 12 }}>
              <Cal s={13} /> {textos.reschedule}
            </button>
          ) : null}
          {onCancelar ? (
            <button
              className="btn ghost"
              onClick={onCancelar}
              style={{ fontSize: 12, color: "var(--red)", borderColor: "var(--red-soft)" }}
            >
              {textos.cancelAppt}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
