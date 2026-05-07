export type Idioma = "es" | "en";
export type Tema = "light" | "dark";
export type Tono = "green" | "amber" | "red";
export type IdPaciente = string;
export type IdHospital = string;

export type Bilingue = { es: string; en: string };

export interface Cobertura {
  type: Bilingue;
  pct: number;
}

export interface Paciente {
  id: IdPaciente;
  name: string;
  initials: string;
  age: number;
  case: "routine" | "preexisting" | "redflag" | "deductible";
  caseTone: Tono;
  caseLabel: Bilingue;
  city: string;
  insurer: string;
  insurerMark: string;
  insurerTone: Tono;
  plan: string;
  policyNo: string;
  validity: string;
  deductible: { annual: number; used: number };
  coverages: Cobertura[];
  network: IdHospital[];
  preexisting: string[];
  seedQuery: Bilingue;
  specialty: Bilingue;
}

export type TipoHospital = "publico" | "privado" | "iess";

export interface Hospital {
  id: IdHospital;
  name: string;
  type: TipoHospital;
  level: 1 | 2 | 3 | 4;
  city: string;
  district?: string;
  address: string;
  lat: number;
  lng: number;
  phone?: string;
  fee: number;
  rating: number;
  wait: number;
  specialties: string[];
  acceptsInsurers: string[];
  services: string[];
  description: string;
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  hospitalId: IdHospital;
  hospitalName: string;
  rating: number;
  yearsExperience: number;
  languages: string[];
  schedule: string;
  bio: string;
}

export interface Procedimiento {
  id: string;
  name: string;
  specialty: string;
  avgCostLow: number;
  avgCostHigh: number;
  description: string;
  requires?: string;
}

export interface EventoAtencion {
  fecha: string;
  hospitalId: IdHospital;
  hospitalName: string;
  doctorName?: string;
  especialidad: string;
  motivo: string;
  diagnostico?: string;
  copago: number;
  total: number;
}

export interface PolizaClausulaSeed {
  pacienteId: IdPaciente;
  policyNo: string;
  insurer: string;
  seccion: string;
  texto: string;
}

export interface HospitalRecomendado {
  id: IdHospital;
  name: string;
  city: string;
  fee: number;
  rating: number;
  wait: number;
  lat: number;
  lng: number;
  inNet: boolean;
  coveredPct: number;
  copago: number;
  distKm: number;
  doctorSugerido?: { id: string; name: string; rating: number; schedule: string };
  tone?: "" | "warn" | "bad";
}

export type ValorAgente = string | { text: string; tone: "v-good" | "v-bad" };

export type SalidaAgente = { [clave: string]: ValorAgente | undefined };

export interface AgenteEjecutado {
  name: string;
  task: string;
  ms: number;
  output: SalidaAgente | null;
}

export type EstadoAgente = "pending" | "active" | "done";

export type IdPanel = "reasoning" | "policy" | "map" | "costs" | "historial";

export interface Mensaje {
  role: "user" | "bot";
  text: string;
  streaming?: boolean;
}

export interface InfoReserva {
  day: string;
  time: string;
  hospital: string;
  doctor?: string;
  specialty: string;
  copago: number;
  code: string;
}

export type AccionRapida = "book" | "call911" | "map" | "reschedule" | "cancel";

export interface ClausulaCitada {
  seccion: string;
  texto: string;
  pacienteId: string;
}

export type EventoFlujo =
  | { type: "user"; text: string }
  | { type: "wait"; ms: number }
  | { type: "sidepanel"; tab: IdPanel }
  | { type: "agent_start"; idx: number }
  | { type: "agent_done"; idx: number; ms: number; output: SalidaAgente | null }
  | { type: "bot"; text: string }
  | { type: "card"; kind: "cost"; recs: HospitalRecomendado[]; specialty: string }
  | { type: "redflag" }
  | { type: "actions"; actions: AccionRapida[] }
  | { type: "done" };
