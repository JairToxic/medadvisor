import type { Hospital, IdHospital } from "@/lib/tipos";

export const HOSPITALES: Record<IdHospital, Hospital> = {
  alcivar:       { id: "alcivar",       name: "Hospital Alcívar",       city: "Guayaquil", lat: 32, lng: 38, fee: 80,  rating: 4.5, wait: 15 },
  kennedy:       { id: "kennedy",       name: "Hospital Kennedy",       city: "Guayaquil", lat: 58, lng: 30, fee: 95,  rating: 4.4, wait: 22 },
  metropolitano: { id: "metropolitano", name: "Hospital Metropolitano", city: "Quito",     lat: 70, lng: 65, fee: 110, rating: 4.7, wait: 18 },
  vernaza:       { id: "vernaza",       name: "Hospital Luis Vernaza",  city: "Guayaquil", lat: 22, lng: 70, fee: 120, rating: 4.2, wait: 35 },
  omni:          { id: "omni",          name: "Hospital Omni",          city: "Guayaquil", lat: 45, lng: 80, fee: 90,  rating: 4.3, wait: 20 },
  axxis:         { id: "axxis",         name: "Hospital Axxis",         city: "Quito",     lat: 80, lng: 50, fee: 105, rating: 4.6, wait: 16 },
};

export const DISTANCIAS_KM: Record<IdHospital, number> = {
  alcivar: 1.2,
  kennedy: 3.4,
  metropolitano: 5.7,
  vernaza: 4.1,
  omni: 2.8,
  axxis: 6.2,
};
