"use client";

import { useEffect, useMemo, useState } from "react";
import { Check } from "@/componentes/Iconos";
import { parseHorario, slotTomado } from "@/lib/horario-doctor";
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

function generarCodigo() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function ModalReserva({ abierto, hospital, especialidad, textos, onCerrar, onConfirmar }: Props) {
  const doctor = hospital?.doctorSugerido;
  const horario = useMemo(() => (doctor ? parseHorario(doctor.schedule) : null), [doctor]);

  // Generar 14 días desde hoy y filtrar los que el doctor atiende.
  const dias = useMemo(() => {
    const hoy = new Date(2026, 4, 7);
    const out: { fecha: string; dow: string; dnum: number; month: string; trabaja: boolean; idx: number }[] = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(hoy);
      d.setDate(d.getDate() + i);
      const dia = d.getDay();
      const trabaja = horario?.workDays.includes(dia) ?? true;
      const fechaStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      out.push({
        fecha: fechaStr,
        dow: DOW_ES[dia],
        dnum: d.getDate(),
        month: MES_ES[d.getMonth()],
        trabaja,
        idx: i,
      });
    }
    return out;
  }, [horario]);

  // Día seleccionado: por defecto el primero que el doctor atiende
  const primerDiaTrabajado = dias.find((d) => d.trabaja)?.idx ?? 0;
  const [diaIdx, setDiaIdx] = useState(primerDiaTrabajado);
  const [slot, setSlot] = useState<string | null>(null);

  useEffect(() => {
    setDiaIdx(primerDiaTrabajado);
    setSlot(null);
  }, [primerDiaTrabajado, doctor?.id]);

  if (!abierto || !hospital) return null;

  const diaSel = dias[diaIdx] ?? dias[0];
  const slots = horario?.hours ?? ["09:00", "10:00", "11:00", "14:00", "15:30", "17:00"];

  const tomados = new Set(
    doctor ? slots.filter((s) => slotTomado(doctor.id, diaSel.fecha, s)) : [],
  );
  const disponibles = slots.filter((s) => !tomados.has(s)).length;

  const slotElegido = slot ?? slots.find((s) => !tomados.has(s)) ?? slots[0];

  const confirmar = () => {
    onConfirmar({
      day: `${diaSel.dow} ${diaSel.dnum} ${diaSel.month}`,
      time: slotElegido,
      hospital: hospital.name,
      doctor: doctor?.name,
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
          {doctor ? (
            <div
              style={{
                marginTop: 12,
                padding: "10px 12px",
                borderRadius: 10,
                background: "var(--accent-ai-soft)",
                border: "1px solid var(--accent-ai)",
                fontSize: 12.5,
                color: "var(--ink-2)",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10.5,
                  color: "var(--accent-ai)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginBottom: 4,
                }}
              >
                ◆ Doctor sugerido
              </div>
              <div style={{ fontWeight: 500, color: "var(--ink)", fontSize: 13.5 }}>{doctor.name}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, marginTop: 2 }}>
                {doctor.schedule} · ★ {doctor.rating.toFixed(1)}
              </div>
            </div>
          ) : null}
        </div>
        <div className="modal-body">
          <div className="kicker" style={{ marginBottom: 8 }}>
            {textos.dayLabel}
            {horario && !horario.is24h ? (
              <span style={{ marginLeft: 8, color: "var(--ink-3)", textTransform: "none", letterSpacing: 0 }}>
                · días en gris no atiende
              </span>
            ) : null}
          </div>
          <div className="day-grid" style={{ gridTemplateColumns: "repeat(7, 1fr)" }}>
            {dias.slice(0, 7).map((d) => (
              <div
                key={d.idx}
                className={`day-cell${d.idx === diaIdx ? " active" : ""}`}
                style={!d.trabaja ? { opacity: 0.3, cursor: "not-allowed" } : undefined}
                onClick={() => d.trabaja && setDiaIdx(d.idx)}
              >
                <div className="dow">{d.dow}</div>
                <div className="dnum">{d.dnum}</div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, opacity: 0.6, marginTop: 1 }}>
                  {d.month}
                </div>
              </div>
            ))}
          </div>
          <div className="kicker" style={{ marginBottom: 8 }}>
            {textos.hourLabel}
            <span style={{ marginLeft: 8, color: "var(--ink-3)", textTransform: "none", letterSpacing: 0 }}>
              · {disponibles} libres de {slots.length}
            </span>
          </div>
          <div
            className="slot-grid"
            style={{ gridTemplateColumns: "repeat(6, 1fr)", maxHeight: 140, overflowY: "auto" }}
          >
            {slots.map((s) => {
              const ocupado = tomados.has(s);
              const elegido = s === slotElegido && !ocupado;
              return (
                <div
                  key={s}
                  className={`slot${elegido ? " active" : ""}${ocupado ? " taken" : ""}`}
                  onClick={() => !ocupado && setSlot(s)}
                >
                  {s}
                </div>
              );
            })}
          </div>
        </div>
        <div className="modal-foot">
          <div className="summary">
            <strong>{diaSel.dow} {diaSel.dnum} {diaSel.month}</strong> · <strong>{slotElegido}</strong>
            {doctor ? (
              <span style={{ color: "var(--ink-3)" }}> · {doctor.name}</span>
            ) : null}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn ghost" onClick={onCerrar}>{textos.bookCancel}</button>
            <button className="btn primary" onClick={confirmar} disabled={!diaSel.trabaja}>
              <Check s={14} /> {textos.bookConfirm}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
