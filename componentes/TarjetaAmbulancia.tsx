"use client";

import { useEffect, useState } from "react";
import type { Idioma } from "@/lib/tipos";

export interface AmbulanciaInfo {
  hospitalNombre: string;
  hospitalId: string;
  hospitalLat: number;
  hospitalLng: number;
  destinoLat: number;
  destinoLng: number;
  inicioTs: number;
  duracionMs: number;
  cobertura: number;
  insurer: string;
}

interface Props {
  ambulancia: AmbulanciaInfo;
  idioma: Idioma;
}

export function TarjetaAmbulancia({ ambulancia, idioma }: Props) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const ahora = Date.now();
  const finTs = ambulancia.inicioTs + ambulancia.duracionMs;
  const restanteMs = Math.max(0, finTs - ahora);
  const minutos = Math.floor(restanteMs / 60000);
  const segundos = Math.floor((restanteMs % 60000) / 1000);
  const llegada = restanteMs <= 0;
  const eta = `${String(minutos).padStart(2, "0")}:${String(segundos).padStart(2, "0")}`;

  const numeroAmb = `AMB-${ambulancia.hospitalId.slice(0, 3).toUpperCase()}-${(ambulancia.inicioTs % 1000).toString().padStart(3, "0")}`;

  return (
    <div className={`tarjeta-ambulancia${llegada ? " llegada" : ""}`}>
      <div className="ta-head">
        {llegada ? (
          <>
            ✓ {idioma === "es" ? "Ambulancia en sitio" : "Ambulance arrived"}
          </>
        ) : (
          <>
            <span className="ta-pulse" />
            {idioma === "es" ? "Ambulancia en camino · ECU 911" : "Ambulance dispatched · ECU 911"}
          </>
        )}
      </div>
      <div className="ta-body">
        <div className="ta-info">
          <div>
            <strong>
              {idioma === "es" ? "Despachada desde" : "Dispatched from"}{" "}
              {ambulancia.hospitalNombre}
            </strong>
          </div>
          <div style={{ opacity: 0.85, marginTop: 2 }}>
            {idioma === "es" ? "Unidad" : "Unit"}: {numeroAmb}
            {" · "}
            {idioma === "es" ? "Paramédico a bordo" : "Paramedic on board"}
          </div>
          <span className="ta-cobertura">
            {idioma === "es"
              ? `${ambulancia.insurer} cubre ${ambulancia.cobertura}% · copago $0`
              : `${ambulancia.insurer} covers ${ambulancia.cobertura}% · $0 copay`}
          </span>
        </div>
        <div style={{ textAlign: "right" }}>
          {llegada ? (
            <>
              <div className="ta-eta" style={{ fontSize: 28 }}>
                {idioma === "es" ? "✓ Llegó" : "✓ Arrived"}
              </div>
              <div className="ta-eta-lab">
                {idioma === "es" ? "atiende paramédico" : "paramedic on scene"}
              </div>
            </>
          ) : (
            <>
              <div className="ta-eta">{eta}</div>
              <div className="ta-eta-lab">
                {idioma === "es" ? "ETA en minutos" : "ETA minutes"}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
