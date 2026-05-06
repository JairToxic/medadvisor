import type { Idioma } from "@/lib/tipos";

export interface Textos {
  tagline: string;
  headline: { l1: string; l2: string; l3: string };
  pitch: string;
  accessTitle: string;
  accessSub: string;
  chooseProfile: string;
  enter: string;
  composerPlaceholder: string;
  sendShortcut: string;
  suggestQuick: string[];
  panels: { reasoning: string; policy: string; map: string; costs: string };
  reasoningTitle: string;
  reasoningSub: string;
  agents: { name: string; task: string }[];
  emptyPanel: string;
  emptyPanelSub: string;
  yourCopay: string;
  bestSavings: string;
  chooseSlot: string;
  bookNow: string;
  seeMap: string;
  rePrompt: string;
  typing: string;
  costsBreakdown: string;
  policyKicker: string;
  mapsKicker: string;
  costsKicker: string;
  insured: string;
  age: string;
  validity: string;
  city: string;
  annualDeductible: string;
  consumed: string;
  coverages: string;
  policyValid: string;
  policyValidations: string;
  changeProfile: string;
  resetDemo: string;
  bookHere: string;
  bookCancel: string;
  bookConfirm: string;
  bookSummaryDay: string;
  bookSummaryHour: string;
  procedure: string;
  emergencyTitle: string;
  emergencyTriage: string;
  emergencyBody: { l1: string; l2: string };
  call911: string;
  nearestEmergency: string;
  bookYes: string;
  later: string;
  uploadPolicy: string;
  uploadImage: string;
  voice: string;
  startCase: string;
  caseLabelByType: { routine: string; preexisting: string; redflag: string };
  caseHash: string;
  inNet: string;
  outOfNet: string;
  copay: string;
  hospitalsCol: string;
  appointmentConfirmed: string;
  specialtyKey: string;
  estimatedCopay: string;
  doctor: string;
  emailSent: string;
  preValidationCode: string;
  downloadPdf: string;
  bookingTitle: string;
  bookingSub: string;
  dayLabel: string;
  hourLabel: string;
  policyEmptyTitle: string;
  policyEmptySub: string;
  mapEmptyTitle: string;
  mapEmptySub: string;
  costsEmptyTitle: string;
  costsEmptySub: string;
  helpline: string;
  legalNote: string;
  sessionPill: string;
  modelPill: string;
  averageSavings: string;
  agentsKpi: string;
  vsCallCenter: string;
  accessCode: string;
  autoFillHint: string;
  evtFooter: string;
  brand: string;
}

export const TEXTOS: Record<Idioma, Textos> = {
  es: {
    tagline: "Tu salud, tus costos, claros.",
    headline: { l1: "Tu salud,", l2: "tus costos,", l3: "claros." },
    pitch:
      "Asistente médico-financiero. En 30 segundos sabes qué te pasa, a dónde ir y cuánto pagas.",
    accessTitle: "Acceso evaluador",
    accessSub: "Ingresa el código del HackIAthon o elige un perfil de demostración.",
    chooseProfile: "Perfiles de demostración",
    enter: "Ingresar al chat",
    composerPlaceholder: "Cuéntale a MedAdvisor qué sientes…",
    sendShortcut: "Enter para enviar",
    suggestQuick: ["Dolor de cabeza", "Subir póliza", "Buscar especialidad"],
    panels: { reasoning: "Razonamiento", policy: "Póliza", map: "Hospitales", costs: "Costos" },
    reasoningTitle: "Cadena de agentes",
    reasoningSub: "Semantic Kernel · 4 agentes",
    agents: [
      { name: "TriageAgent", task: "Analiza síntomas + red flags" },
      { name: "CoverageAgent", task: "Lee póliza · cobertura aplicable" },
      { name: "RecommenderAgent", task: "Compara hospitales · calcula copago" },
      { name: "Coordinator", task: "Sintetiza respuesta empática" },
    ],
    emptyPanel: "El panel se actualiza solo",
    emptyPanelSub:
      "Cuando hables con MedAdvisor, aquí verás el razonamiento, la póliza extraída, hospitales en mapa y el desglose de costos.",
    yourCopay: "Tu copago",
    bestSavings: "Ahorras",
    chooseSlot: "Elige un horario",
    bookNow: "Agendar aquí",
    seeMap: "Ver mapa",
    rePrompt: "Reiniciar demo",
    typing: "MedAdvisor está pensando",
    costsBreakdown: "DESGLOSE DE COSTOS",
    policyKicker: "Póliza · OCR · Document Intelligence",
    mapsKicker: "Hospitales · Azure Maps",
    costsKicker: "Costos · Calculadora de copago",
    insured: "Asegurado",
    age: "Edad",
    validity: "Vigencia",
    city: "Ciudad",
    annualDeductible: "Deducible anual",
    consumed: "Consumido",
    coverages: "Coberturas",
    policyValid: "VIGENTE",
    policyValidations: "Aseguradora · Vigencia · {n} coberturas · {m} hospitales en red",
    changeProfile: "Cambiar perfil",
    resetDemo: "Reiniciar demo",
    bookHere: "Agendar aquí",
    bookCancel: "Cancelar",
    bookConfirm: "Confirmar cita",
    bookSummaryDay: "Día",
    bookSummaryHour: "Horario",
    procedure: "PROCEDIMIENTO",
    emergencyTitle: "Emergencia",
    emergencyTriage: "EMERGENCIA · NIVEL 1 · MANCHESTER TRIAGE",
    emergencyBody: {
      l1: "Tus síntomas son compatibles con un",
      l2: "síndrome coronario agudo. No esperes.",
    },
    call911: "Llamar 911",
    nearestEmergency: "Emergencia más cercana",
    bookYes: "Sí, agendar",
    later: "Más tarde",
    uploadPolicy: "Subir póliza",
    uploadImage: "Subir imagen",
    voice: "Voz",
    startCase: "Iniciar caso",
    caseLabelByType: {
      routine: "Cefalea + visión borrosa",
      preexisting: "Migraña",
      redflag: "Dolor torácico",
    },
    caseHash: "CASO",
    inNet: "en red",
    outOfNet: "FUERA red",
    copay: "copago",
    hospitalsCol: "Hospitales",
    appointmentConfirmed: "CITA CONFIRMADA",
    specialtyKey: "Especialidad",
    estimatedCopay: "Copago estimado",
    doctor: "Médico asignado",
    emailSent: "Email enviado",
    preValidationCode: "Código de pre-validación",
    downloadPdf: "Descargar PDF",
    bookingTitle: "Agendar en",
    bookingSub: "Copago estimado",
    dayLabel: "Día",
    hourLabel: "Horario",
    policyEmptyTitle: "Póliza aún no procesada",
    policyEmptySub:
      "Inicia el caso o sube un PDF — Document Intelligence extraerá coberturas, deducible y red preferente.",
    mapEmptyTitle: "Sin recomendación aún",
    mapEmptySub:
      "Cuando termine el triage, verás los 3 mejores hospitales geolocalizados con distancia y copago.",
    costsEmptyTitle: "Cálculo de copago",
    costsEmptySub:
      "Aquí aparecerá el desglose por hospital cuando se cruce tu plan con la tarifa de cada uno.",
    helpline: "Sesión segura · 1h 47m",
    legalNote: "Referencial · no reemplaza médico",
    sessionPill: "Sesión segura · 1h 47m",
    modelPill: "GPT-4o · AI Search · Doc Intelligence",
    averageSavings: "ahorro promedio",
    agentsKpi: "agentes IA",
    vsCallCenter: "vs 20 min call center",
    accessCode: "Código de acceso",
    autoFillHint: "Click cualquier celda para auto-rellenar (demo)",
    evtFooter: "HackIAthon Viamatica 2026 · Azure AI Foundry · OpenAI · AI Search",
    brand: "MedAdvisor",
  },
  en: {
    tagline: "Your health, your costs, clear.",
    headline: { l1: "Your health,", l2: "your costs,", l3: "clear." },
    pitch:
      "Medical-financial assistant. In 30 seconds you know what's happening, where to go, and what you'll pay.",
    accessTitle: "Evaluator access",
    accessSub: "Enter the HackIAthon code or pick a demo profile.",
    chooseProfile: "Demo profiles",
    enter: "Enter chat",
    composerPlaceholder: "Tell MedAdvisor what you're feeling…",
    sendShortcut: "Enter to send",
    suggestQuick: ["Headache", "Upload policy", "Find specialty"],
    panels: { reasoning: "Reasoning", policy: "Policy", map: "Hospitals", costs: "Costs" },
    reasoningTitle: "Agent chain",
    reasoningSub: "Semantic Kernel · 4 agents",
    agents: [
      { name: "TriageAgent", task: "Analyzes symptoms + red flags" },
      { name: "CoverageAgent", task: "Reads policy · applicable coverage" },
      { name: "RecommenderAgent", task: "Compares hospitals · computes copay" },
      { name: "Coordinator", task: "Synthesizes empathetic response" },
    ],
    emptyPanel: "The panel updates itself",
    emptyPanelSub:
      "When you chat with MedAdvisor, you'll see reasoning, the extracted policy, hospitals on a map and the cost breakdown here.",
    yourCopay: "Your copay",
    bestSavings: "You save",
    chooseSlot: "Pick a time",
    bookNow: "Book here",
    seeMap: "See map",
    rePrompt: "Reset demo",
    typing: "MedAdvisor is thinking",
    costsBreakdown: "COST BREAKDOWN",
    policyKicker: "Policy · OCR · Document Intelligence",
    mapsKicker: "Hospitals · Azure Maps",
    costsKicker: "Costs · Copay calculator",
    insured: "Insured",
    age: "Age",
    validity: "Validity",
    city: "City",
    annualDeductible: "Annual deductible",
    consumed: "Used",
    coverages: "Coverages",
    policyValid: "ACTIVE",
    policyValidations: "Insurer · Validity · {n} coverages · {m} in-network hospitals",
    changeProfile: "Change profile",
    resetDemo: "Reset demo",
    bookHere: "Book here",
    bookCancel: "Cancel",
    bookConfirm: "Confirm appointment",
    bookSummaryDay: "Day",
    bookSummaryHour: "Hour",
    procedure: "PROCEDURE",
    emergencyTitle: "Emergency",
    emergencyTriage: "EMERGENCY · LEVEL 1 · MANCHESTER TRIAGE",
    emergencyBody: {
      l1: "Your symptoms are consistent with an",
      l2: "acute coronary syndrome. Don't wait.",
    },
    call911: "Call 911",
    nearestEmergency: "Nearest emergency",
    bookYes: "Yes, book it",
    later: "Later",
    uploadPolicy: "Upload policy",
    uploadImage: "Upload image",
    voice: "Voice",
    startCase: "Start case",
    caseLabelByType: {
      routine: "Headache + blurred vision",
      preexisting: "Migraine",
      redflag: "Chest pain",
    },
    caseHash: "CASE",
    inNet: "in-network",
    outOfNet: "OUT of network",
    copay: "copay",
    hospitalsCol: "Hospitals",
    appointmentConfirmed: "APPOINTMENT CONFIRMED",
    specialtyKey: "Specialty",
    estimatedCopay: "Estimated copay",
    doctor: "Assigned doctor",
    emailSent: "Email sent",
    preValidationCode: "Pre-validation code",
    downloadPdf: "Download PDF",
    bookingTitle: "Book at",
    bookingSub: "Estimated copay",
    dayLabel: "Day",
    hourLabel: "Time",
    policyEmptyTitle: "Policy not processed yet",
    policyEmptySub:
      "Start the case or upload a PDF — Document Intelligence will extract coverages, deductible and preferred network.",
    mapEmptyTitle: "No recommendation yet",
    mapEmptySub:
      "When triage is done, you'll see the top 3 hospitals geolocated with distance and copay.",
    costsEmptyTitle: "Copay calculation",
    costsEmptySub:
      "The per-hospital breakdown will appear here when your plan is crossed with each rate.",
    helpline: "Secure session · 1h 47m",
    legalNote: "Reference only · does not replace a doctor",
    sessionPill: "Secure session · 1h 47m",
    modelPill: "GPT-4o · AI Search · Doc Intelligence",
    averageSavings: "avg savings",
    agentsKpi: "AI agents",
    vsCallCenter: "vs 20 min call center",
    accessCode: "Access code",
    autoFillHint: "Click any cell to auto-fill (demo)",
    evtFooter: "HackIAthon Viamatica 2026 · Azure AI Foundry · OpenAI · AI Search",
    brand: "MedAdvisor",
  },
};
