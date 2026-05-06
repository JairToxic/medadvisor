export type Idioma = "es" | "en";
export type Tema = "light" | "dark";
export type Tono = "green" | "amber" | "red";
export type IdPaciente = "juan" | "maria" | "pedro";
export type IdHospital =
  | "alcivar"
  | "kennedy"
  | "metropolitano"
  | "vernaza"
  | "omni"
  | "axxis";

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
  case: "routine" | "preexisting" | "redflag";
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

export interface Hospital {
  id: IdHospital;
  name: string;
  city: string;
  lat: number;
  lng: number;
  fee: number;
  rating: number;
  wait: number;
}

export interface HospitalRecomendado extends Hospital {
  inNet: boolean;
  coveredPct: number;
  copago: number;
  distKm: number;
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

export type IdPanel = "reasoning" | "policy" | "map" | "costs";

export interface Mensaje {
  role: "user" | "bot";
  text: string;
  streaming?: boolean;
}

export interface InfoReserva {
  day: string;
  time: string;
  hospital: string;
  specialty: string;
  copago: number;
  code: string;
}

export type AccionRapida = "book" | "call911" | "map";

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
