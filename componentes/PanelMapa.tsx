"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { HospitalRecomendado, Idioma } from "@/lib/tipos";
import type { Textos } from "@/lib/i18n";

// Leaflet usa window al cargar — solo cliente
const MapaHospitales = dynamic(
  () => import("@/componentes/MapaHospitales").then((m) => m.MapaHospitales),
  { ssr: false, loading: () => (
    <div
      style={{
        height: 280,
        background: "var(--bg-elev)",
        border: "1px solid var(--line)",
        borderRadius: "var(--radius)",
        display: "grid",
        placeItems: "center",
        color: "var(--ink-3)",
        fontFamily: "var(--font-mono)",
        fontSize: 12,
      }}
    >
      Cargando mapa…
    </div>
  )},
);

import type { AmbulanciaInfo } from "@/componentes/TarjetaAmbulancia";

interface Props {
  recomendaciones: HospitalRecomendado[];
  textos: Textos;
  idioma: Idioma;
  ubicacion?: { lat: number; lng: number } | null;
  ambulancia?: AmbulanciaInfo | null;
}

export function PanelMapa({ recomendaciones, textos, idioma, ubicacion, ambulancia }: Props) {
  const [seleccionado, setSeleccionado] = useState(0);
  if (recomendaciones.length === 0) return null;

  const hayCoords = recomendaciones.some((h) => h.lat && h.lng);

  return (
    <div>
      <div className="kicker" style={{ marginBottom: 10, display: "flex", justifyContent: "space-between" }}>
        <span>{textos.mapsKicker}</span>
        {ambulancia ? (
          <span style={{ color: "var(--red)", textTransform: "none", letterSpacing: 0, fontWeight: 600 }}>
            🚑 {idioma === "es" ? "Ambulancia en ruta" : "Ambulance en route"}
          </span>
        ) : ubicacion ? (
          <span style={{ color: "var(--green)", textTransform: "none", letterSpacing: 0 }}>
            ● {idioma === "es" ? "ordenado por distancia" : "ordered by distance"}
          </span>
        ) : null}
      </div>
      <div className="map-card">
        {hayCoords ? (
          <MapaHospitales
            recomendaciones={recomendaciones}
            ubicacion={ubicacion ?? null}
            seleccionado={seleccionado}
            onSeleccionar={setSeleccionado}
            ambulancia={ambulancia ?? null}
          />
        ) : (
          <div
            style={{
              height: 280,
              background: "var(--bg-sunk)",
              display: "grid",
              placeItems: "center",
              color: "var(--ink-3)",
            }}
          >
            Sin coordenadas
          </div>
        )}
        <div className="map-list">
          {recomendaciones.map((r, i) => (
            <div
              key={r.id}
              className={`map-row${i === 0 ? " best" : ""}${i === seleccionado ? " activo" : ""}`}
              onClick={() => setSeleccionado(i)}
            >
              <span className="m-num">0{i + 1}</span>
              <div>
                <div style={{ fontWeight: 500 }}>{r.name}</div>
                <div className="m-meta">
                  {r.distKm > 0 ? `${r.distKm} km · ` : ""}★ {r.rating} · {r.wait}min
                  {r.doctorSugerido ? ` · ${r.doctorSugerido.name.replace(/^Dra?\.\s*/, "")}` : ""}
                </div>
              </div>
              <div>
                <div className="m-cost">${r.copago}</div>
                <div className="m-meta" style={{ textAlign: "right" }}>{textos.copay}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {!ubicacion ? (
        <div
          style={{
            marginTop: 10,
            padding: "8px 12px",
            background: "var(--bg-elev)",
            border: "1px dashed var(--line)",
            borderRadius: "var(--radius-sm)",
            fontSize: 11.5,
            color: "var(--ink-3)",
            fontFamily: "var(--font-mono)",
            textAlign: "center",
          }}
        >
          {idioma === "es"
            ? "💡 Activa tu ubicación para ver distancias reales y el orden por proximidad."
            : "💡 Enable location to see real distances and proximity ordering."}
        </div>
      ) : null}
    </div>
  );
}
