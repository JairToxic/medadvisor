import { recomendarHospitales } from "@/lib/recomendador";
import type { EventoFlujo, Idioma, IdPaciente, Paciente } from "@/lib/tipos";

type Constructor = (paciente: Paciente, lang: Idioma) => EventoFlujo[];

const flujoJuan: Constructor = (p, lang) => {
  const recs = recomendarHospitales(p, ["alcivar", "kennedy", "vernaza"], 80);
  return [
    { type: "user", text: p.seedQuery[lang] },
    { type: "wait", ms: 250 },
    { type: "sidepanel", tab: "reasoning" },
    { type: "agent_start", idx: 0 },
    { type: "wait", ms: 700 },
    {
      type: "agent_done",
      idx: 0,
      ms: 720,
      output: {
        sintomas: "cefalea + visión borrosa",
        red_flags: { text: "ninguno", tone: "v-good" },
        especialidad: "Neurología",
        urgencia: "normal",
      },
    },
    { type: "agent_start", idx: 1 },
    { type: "wait", ms: 600 },
    {
      type: "agent_done",
      idx: 1,
      ms: 580,
      output: {
        plan: "Aegis Essential 50",
        cobertura: "80% en red",
        deducible_pendiente: "$0",
        carencias: { text: "OK · 24m cumplidos", tone: "v-good" },
      },
    },
    { type: "agent_start", idx: 2 },
    { type: "wait", ms: 800 },
    {
      type: "agent_done",
      idx: 2,
      ms: 850,
      output: {
        hospitales: "3 en 5km",
        mejor: { text: "Alcívar · $16", tone: "v-good" },
        peor: { text: "Vernaza · $120", tone: "v-bad" },
      },
    },
    { type: "agent_start", idx: 3 },
    { type: "wait", ms: 250 },
    {
      type: "bot",
      text:
        lang === "es"
          ? "Hola Juan. Por lo que me cuentas, podría tratarse de migraña con aura, pero quiero descartar algo más serio dado tu antecedente de **hipertensión**. Veo tu póliza vigente con Aegis Salud — cobertura 80% en red preferente para Neurología."
          : "Hi Juan. From what you describe it could be migraine with aura, but I want to rule out something more serious given your **hypertension**. Your Aegis Salud policy is active — 80% coverage in-network for Neurology.",
    },
    { type: "agent_done", idx: 3, ms: 320, output: null },
    { type: "wait", ms: 400 },
    { type: "sidepanel", tab: "policy" },
    { type: "wait", ms: 1500 },
    { type: "sidepanel", tab: "map" },
    { type: "wait", ms: 1100 },
    { type: "sidepanel", tab: "costs" },
    { type: "card", kind: "cost", recs, specialty: p.specialty[lang] },
    { type: "wait", ms: 600 },
    {
      type: "bot",
      text:
        lang === "es"
          ? "Tienes 3 opciones. Te recomiendo **Hospital Alcívar** — 1.2 km, copago **$16**. Si fueras a Vernaza pagarías $120 porque está fuera de tu red preferente. ¿Te agendo en Alcívar?"
          : "You've got 3 options. I recommend **Hospital Alcívar** — 1.2 km away, copay **$16**. Vernaza would cost $120 because it's out of your preferred network. Shall I book Alcívar?",
    },
    { type: "actions", actions: ["book", "map"] },
    { type: "done" },
  ];
};

const flujoMaria: Constructor = (p, lang) => {
  const recs = recomendarHospitales(p, ["metropolitano", "axxis", "vernaza"], 70);
  return [
    { type: "user", text: p.seedQuery[lang] },
    { type: "wait", ms: 250 },
    { type: "sidepanel", tab: "reasoning" },
    { type: "agent_start", idx: 0 },
    { type: "wait", ms: 750 },
    {
      type: "agent_done",
      idx: 0,
      ms: 760,
      output: {
        sintomas: "migraña refractaria",
        red_flags: { text: "ninguno", tone: "v-good" },
        especialidad: "Neurología",
        historial: "migraña crónica",
      },
    },
    { type: "agent_start", idx: 1 },
    { type: "wait", ms: 700 },
    {
      type: "agent_done",
      idx: 1,
      ms: 690,
      output: {
        plan: "Vital+ World Access",
        preexistencia: { text: "MIGRAÑA · cubierta", tone: "v-good" },
        cobertura: "70% en red",
        deducible_pendiente: "$480",
      },
    },
    { type: "agent_start", idx: 2 },
    { type: "wait", ms: 700 },
    {
      type: "agent_done",
      idx: 2,
      ms: 720,
      output: {
        hospitales: "3 en Quito",
        mejor: { text: "Metropolitano · $33", tone: "v-good" },
        peor: { text: "Vernaza · $120 (G.E.)", tone: "v-bad" },
      },
    },
    { type: "agent_start", idx: 3 },
    { type: "wait", ms: 200 },
    {
      type: "bot",
      text:
        lang === "es"
          ? "Hola María. Tu **migraña crónica está declarada y cubierta** — buena noticia. Tu plan Vital+ paga 70% en red preferente y aún tienes $480 de deducible pendiente, que se contabiliza en esta consulta."
          : "Hi María. Your **chronic migraine is declared and covered** — good news. Your Vital+ plan pays 70% in-network and you still have $480 of deductible pending, which counts toward this visit.",
    },
    { type: "agent_done", idx: 3, ms: 280, output: null },
    { type: "sidepanel", tab: "policy" },
    { type: "wait", ms: 1300 },
    { type: "sidepanel", tab: "map" },
    { type: "wait", ms: 1000 },
    { type: "sidepanel", tab: "costs" },
    { type: "card", kind: "cost", recs, specialty: p.specialty[lang] },
    { type: "wait", ms: 500 },
    {
      type: "bot",
      text:
        lang === "es"
          ? "Te conviene **Hospital Metropolitano** — copago $33. Te puedo agendar hoy mismo en la tarde."
          : "Best choice is **Hospital Metropolitano** — $33 copay. I can book you this afternoon.",
    },
    { type: "actions", actions: ["book", "map"] },
    { type: "done" },
  ];
};

const flujoPedro: Constructor = (p, lang) => [
  { type: "user", text: p.seedQuery[lang] },
  { type: "wait", ms: 250 },
  { type: "sidepanel", tab: "reasoning" },
  { type: "agent_start", idx: 0 },
  { type: "wait", ms: 600 },
  {
    type: "agent_done",
    idx: 0,
    ms: 610,
    output: {
      sintomas: "dolor torácico irradiado",
      red_flags: { text: "NIVEL 1 · IAM probable", tone: "v-bad" },
      accion: { text: "EMERGENCIA INMEDIATA", tone: "v-bad" },
    },
  },
  { type: "redflag" },
  { type: "wait", ms: 600 },
  {
    type: "bot",
    text:
      lang === "es"
        ? "Pedro, **detente y llama al 911 ahora mismo**. Tus síntomas son compatibles con un infarto. Tu póliza Solaris cubre 100% emergencia. La ambulancia te llevará al Alcívar — son 4 minutos. **No conduzcas tú.**"
        : "Pedro, **stop and call 911 right now**. Your symptoms are consistent with a heart attack. Your Solaris policy covers emergency 100%. The ambulance will take you to Alcívar — 4 minutes away. **Do not drive yourself.**",
  },
  { type: "actions", actions: ["call911", "map"] },
  { type: "done" },
];

export const ESCENARIOS: Record<IdPaciente, Constructor> = {
  juan: flujoJuan,
  maria: flujoMaria,
  pedro: flujoPedro,
};
