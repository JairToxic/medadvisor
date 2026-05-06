"use client";

import { useMemo, useState } from "react";
import { Check } from "@/componentes/Iconos";
import type { HospitalRecomendado, InfoReserva } from "@/lib/tipos";
import type { Textos } from "@/lib/i18n";

interface Props {
  abierto: boolean;
  hospital: HospitalRecomendado | null;
  especialidad: string;
  textos: Textos;
  onCerrar: () => void;
  onConfirmar: (info: InfoReserva) => void;
}

const DOW_ES = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];
const MES_ES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const SLOTS = ["09:00", "10:30", "11:00", "13:30", "14:00", "15:30", "16:00", "17:30"];
const OCUPADOS = new Set(["10:30", "13:30"]);

function generarCodigo() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function ModalReserva({ abierto, hospital, especialidad, textos, onCerrar, onConfirmar }: Props) {
  const dias = useMemo(() => {
    const hoy = new Date(2026, 4, 6);
    return Array.from({ length: 5 }, (_, i) => {
      const d = new Date(hoy);
      d.setDate(d.getDate() + i);
      return {
        dow: DOW_ES[d.getDay()],
        dnum: d.getDate(),
        month: MES_ES[d.getMonth()],
      };
    });
  }, []);

  const [diaIdx, setDiaIdx] = useState(0);
  const [slot, setSlot] = useState("16:00");

  if (!abierto || !hospital) return null;

  const diaSel = dias[diaIdx];

  const confirmar = () => {
    onConfirmar({
      day: `${diaSel.dow} ${diaSel.dnum} ${diaSel.month}`,
      time: slot,
      hospital: hospital.name,
      specialty: especialidad,
      copago: hospital.copago,
      code: generarCodigo(),
    });
  };

  return (
    <div className="modal-shroud" onClick={onCerrar}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>{textos.bookingTitle} {hospital.name}</h2>
          <div className="sub">
            {especialidad} · {textos.bookingSub} <strong>${hospital.copago}</strong>
          </div>
        </div>
        <div className="modal-body">
          <div className="kicker" style={{ marginBottom: 8 }}>{textos.dayLabel}</div>
          <div className="day-grid">
            {dias.map((d, i) => (
              <div
                key={i}
                className={`day-cell${i === diaIdx ? " active" : ""}`}
                onClick={() => setDiaIdx(i)}
              >
                <div className="dow">{d.dow}</div>
                <div className="dnum">{d.dnum}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, opacity: 0.6, marginTop: 1 }}>
                  {d.month}
                </div>
              </div>
            ))}
          </div>
          <div className="kicker" style={{ marginBottom: 8 }}>{textos.hourLabel}</div>
          <div className="slot-grid">
            {SLOTS.map((s) => (
              <div
                key={s}
                className={`slot${s === slot ? " active" : ""}${OCUPADOS.has(s) ? " taken" : ""}`}
                onClick={() => !OCUPADOS.has(s) && setSlot(s)}
              >
                {s}
              </div>
            ))}
          </div>
        </div>
        <div className="modal-foot">
          <div className="summary">
            <strong>{diaSel.dow} {diaSel.dnum} {diaSel.month}</strong> · <strong>{slot}</strong>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn ghost" onClick={onCerrar}>{textos.bookCancel}</button>
            <button className="btn primary" onClick={confirmar}>
              <Check s={14} /> {textos.bookConfirm}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
