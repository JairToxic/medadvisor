import { DISTANCIAS_KM, HOSPITALES } from "@/datos/hospitales";
import type { HospitalRecomendado, IdHospital, Paciente } from "@/lib/tipos";

export function recomendarHospitales(
  paciente: Paciente,
  candidatos: IdHospital[],
  porcentajeCubierto: number,
): HospitalRecomendado[] {
  const enRed = new Set(paciente.network);
  const recs = candidatos.map<HospitalRecomendado>((id) => {
    const h = HOSPITALES[id];
    const inNet = enRed.has(h.id);
    const coveredPct = inNet ? porcentajeCubierto : 0;
    const copago = Math.round(h.fee * (1 - coveredPct / 100));
    return {
      ...h,
      inNet,
      coveredPct,
      copago,
      distKm: DISTANCIAS_KM[h.id] ?? 2,
    };
  });

  recs.sort((a, b) => {
    if (a.inNet !== b.inNet) return a.inNet ? -1 : 1;
    return a.copago - b.copago;
  });

  return recs.slice(0, 3);
}
