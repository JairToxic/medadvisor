/**
 * Convierte el campo `schedule` del doctor en estructura útil para la UI:
 * - workDays: días de la semana en que atiende (0=domingo, 1=lunes, ..., 6=sábado)
 * - hours: lista de horas disponibles cada 30 min dentro de su rango
 */

const MAPA_DIA: Record<string, number> = {
  Dom: 0, Lun: 1, Mar: 2, Mie: 3, "Mié": 3, Jue: 4, Vie: 5, Sab: 6, "Sáb": 6,
};

export interface HorarioDoctor {
  workDays: number[];
  hours: string[];
  is24h: boolean;
}

export function parseHorario(schedule: string): HorarioDoctor {
  if (/24\s*horas/i.test(schedule)) {
    return {
      workDays: [0, 1, 2, 3, 4, 5, 6],
      hours: ["00:00", "06:00", "08:00", "10:00", "14:00", "18:00", "22:00"],
      is24h: true,
    };
  }

  const workDays = new Set<number>();

  // Rangos como "Lun-Vie"
  for (const m of schedule.matchAll(/([A-ZÁ][a-zá]{2})-([A-ZÁ][a-zá]{2})/g)) {
    const a = MAPA_DIA[m[1]];
    const b = MAPA_DIA[m[2]];
    if (a !== undefined && b !== undefined) {
      const ini = Math.min(a, b);
      const fin = Math.max(a, b);
      for (let i = ini; i <= fin; i++) workDays.add(i);
    }
  }

  // Días sueltos (si no había rangos)
  if (workDays.size === 0) {
    for (const dia of Object.keys(MAPA_DIA)) {
      if (schedule.includes(dia)) workDays.add(MAPA_DIA[dia]);
    }
  }

  // Si no detectó nada, asumir Lun-Vie
  if (workDays.size === 0) [1, 2, 3, 4, 5].forEach((d) => workDays.add(d));

  // Rangos horarios "9:00-13:00" o "15:00-18:00"
  const hours: string[] = [];
  for (const m of schedule.matchAll(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/g)) {
    const h0 = parseInt(m[1], 10);
    const m0 = parseInt(m[2], 10);
    const h1 = parseInt(m[3], 10);
    const m1 = parseInt(m[4], 10);
    let cur = h0 * 60 + m0;
    const end = h1 * 60 + m1;
    while (cur < end) {
      const hh = Math.floor(cur / 60);
      const mm = cur % 60;
      hours.push(`${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`);
      cur += 30;
    }
  }

  if (hours.length === 0) hours.push("09:00", "10:30", "12:00", "14:30", "16:00");

  return { workDays: [...workDays].sort(), hours, is24h: false };
}

/**
 * Hash simple para marcar consistentemente unos slots como ocupados.
 * Mismo doctor + mismo día + mismo slot = mismo resultado.
 */
function hashTomado(seed: string): boolean {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(h) % 5 === 0;
}

export function slotTomado(doctorId: string, fecha: string, hora: string): boolean {
  return hashTomado(`${doctorId}|${fecha}|${hora}`);
}
