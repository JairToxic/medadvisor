"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { HospitalRecomendado } from "@/lib/tipos";
import type { AmbulanciaInfo } from "@/componentes/TarjetaAmbulancia";

interface Props {
  recomendaciones: HospitalRecomendado[];
  ubicacion?: { lat: number; lng: number } | null;
  seleccionado: number;
  onSeleccionar: (idx: number) => void;
  ambulancia?: AmbulanciaInfo | null;
}

function haversine(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

async function obtenerRuta(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): Promise<[number, number][]> {
  const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error("OSRM HTTP " + resp.status);
    const data = (await resp.json()) as {
      routes?: { geometry?: { coordinates?: [number, number][] } }[];
    };
    const coords = data.routes?.[0]?.geometry?.coordinates ?? [];
    if (coords.length < 2) throw new Error("ruta vacía");
    return coords.map(([lng, lat]) => [lat, lng] as [number, number]);
  } catch {
    return [
      [from.lat, from.lng],
      [to.lat, to.lng],
    ];
  }
}

export function MapaHospitales({ recomendaciones, ubicacion, seleccionado, onSeleccionar, ambulancia }: Props) {
  const contenedorRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapaRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const marcadoresRef = useRef<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lineasRef = useRef<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ambMarkerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ambLineProgRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ambLineFullRef = useRef<any>(null);
  const ambFrameRef = useRef<number | null>(null);

  // Inicialización + marcadores estáticos
  useEffect(() => {
    let cancelado = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelado || !contenedorRef.current) return;

      if (!mapaRef.current) {
        mapaRef.current = L.map(contenedorRef.current, {
          zoomControl: true,
          attributionControl: false,
          scrollWheelZoom: true,
        });
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
        }).addTo(mapaRef.current);
      }
      const map = mapaRef.current;

      marcadoresRef.current.forEach((m) => map.removeLayer(m));
      marcadoresRef.current = [];
      lineasRef.current.forEach((l) => map.removeLayer(l));
      lineasRef.current = [];

      const bounds = L.latLngBounds([]);

      if (ubicacion) {
        const icon = L.divIcon({
          className: "user-pin",
          html: '<div class="user-pin-body"></div>',
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });
        const m = L.marker([ubicacion.lat, ubicacion.lng], { icon }).addTo(map);
        m.bindTooltip("Tu ubicación", { direction: "top", offset: [0, -10] });
        marcadoresRef.current.push(m);
        bounds.extend([ubicacion.lat, ubicacion.lng]);
      }

      recomendaciones.forEach((h, i) => {
        if (!h.lat || !h.lng) return;
        const tono = i === 0 ? "" : i === 1 ? "warn" : "bad";
        const sel = i === seleccionado ? "selected" : "";
        const icon = L.divIcon({
          className: "hosp-pin",
          html: `<div class="hosp-pin-body ${tono} ${sel}">${i + 1}</div>`,
          iconSize: [30, 30],
          iconAnchor: [15, 30],
        });
        const m = L.marker([h.lat, h.lng], { icon }).addTo(map);
        const km = h.distKm > 0 ? `${h.distKm} km · ` : "";
        m.bindTooltip(
          `<b>${h.name}</b><br/>${km}$${h.copago} copago${h.doctorSugerido ? `<br/>${h.doctorSugerido.name}` : ""}`,
          { direction: "top", offset: [0, -28] },
        );
        m.on("click", () => onSeleccionar(i));
        marcadoresRef.current.push(m);
        bounds.extend([h.lat, h.lng]);

        if (ubicacion && i === seleccionado && !ambulancia) {
          const linea = L.polyline(
            [
              [ubicacion.lat, ubicacion.lng],
              [h.lat, h.lng],
            ],
            { color: "#0c5b56", weight: 2, opacity: 0.6, dashArray: "6,6" },
          ).addTo(map);
          lineasRef.current.push(linea);
        }
      });

      if (bounds.isValid()) {
        const ubicCount = ubicacion ? 1 : 0;
        const total = recomendaciones.filter((h) => h.lat && h.lng).length + ubicCount;
        if (total === 1) {
          const only = recomendaciones[0];
          const lat = ubicacion?.lat ?? only.lat;
          const lng = ubicacion?.lng ?? only.lng;
          map.setView([lat, lng], 13);
        } else {
          map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
        }
      } else if (recomendaciones.length > 0) {
        const h0 = recomendaciones.find((h) => h.lat && h.lng);
        if (h0) map.setView([h0.lat, h0.lng], 12);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [recomendaciones, ubicacion, seleccionado, onSeleccionar, ambulancia]);

  // Animación ambulancia siguiendo calles reales (OSRM)
  useEffect(() => {
    if (!ambulancia) {
      const map = mapaRef.current;
      if (ambMarkerRef.current && map) {
        map.removeLayer(ambMarkerRef.current);
        ambMarkerRef.current = null;
      }
      if (ambLineProgRef.current && map) {
        map.removeLayer(ambLineProgRef.current);
        ambLineProgRef.current = null;
      }
      if (ambLineFullRef.current && map) {
        map.removeLayer(ambLineFullRef.current);
        ambLineFullRef.current = null;
      }
      if (ambFrameRef.current) {
        cancelAnimationFrame(ambFrameRef.current);
        ambFrameRef.current = null;
      }
      return;
    }

    let cancelado = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelado || !mapaRef.current) return;

      // 1. Obtener ruta real por calles
      const ruta = await obtenerRuta(
        { lat: ambulancia.hospitalLat, lng: ambulancia.hospitalLng },
        { lat: ambulancia.destinoLat, lng: ambulancia.destinoLng },
      );
      if (cancelado || !mapaRef.current) return;

      // 2. Acumular distancias por segmento
      const cumDist: number[] = [0];
      for (let i = 1; i < ruta.length; i++) {
        cumDist.push(cumDist[i - 1] + haversine(ruta[i - 1], ruta[i]));
      }
      const totalDist = cumDist[cumDist.length - 1] || 1;

      // 3. Pintar la ruta completa atenuada
      ambLineFullRef.current = L.polyline(ruta, {
        color: "#b13a2c",
        weight: 3,
        opacity: 0.25,
        dashArray: "4,6",
      }).addTo(mapaRef.current);

      // 4. Marcador de la ambulancia al inicio
      const icon = L.divIcon({
        className: "amb-pin",
        html: '<div class="amb-pin-body">🚑</div>',
        iconSize: [38, 38],
        iconAnchor: [19, 19],
      });
      ambMarkerRef.current = L.marker(ruta[0], { icon }).addTo(mapaRef.current);
      ambMarkerRef.current.bindTooltip("Ambulancia ECU 911", {
        direction: "top",
        offset: [0, -20],
      });

      // 5. Encajar la vista para mostrar toda la ruta + destino
      const bounds = L.latLngBounds(ruta);
      mapaRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });

      // 6. Animación: en cada frame, calcular posición a lo largo de la ruta
      const findPos = (targetDist: number): { idx: number; pos: [number, number] } => {
        for (let i = 1; i < cumDist.length; i++) {
          if (cumDist[i] >= targetDist) {
            const segLen = cumDist[i] - cumDist[i - 1];
            const t = segLen > 0 ? (targetDist - cumDist[i - 1]) / segLen : 0;
            const lat = ruta[i - 1][0] + (ruta[i][0] - ruta[i - 1][0]) * t;
            const lng = ruta[i - 1][1] + (ruta[i][1] - ruta[i - 1][1]) * t;
            return { idx: i - 1, pos: [lat, lng] };
          }
        }
        return { idx: ruta.length - 1, pos: ruta[ruta.length - 1] };
      };

      const tick = () => {
        if (cancelado) return;
        const t = Math.min(1, (Date.now() - ambulancia.inicioTs) / ambulancia.duracionMs);
        const target = t * totalDist;
        const { idx, pos } = findPos(target);
        ambMarkerRef.current?.setLatLng(pos);

        // Polilínea recorrida: vértices completos hasta idx + posición actual
        const recorrido: [number, number][] = ruta.slice(0, idx + 1);
        recorrido.push(pos);
        if (!ambLineProgRef.current) {
          ambLineProgRef.current = L.polyline(recorrido, {
            color: "#b13a2c",
            weight: 4,
            opacity: 0.9,
          }).addTo(mapaRef.current);
        } else {
          ambLineProgRef.current.setLatLngs(recorrido);
        }

        if (t < 1) ambFrameRef.current = requestAnimationFrame(tick);
      };

      ambFrameRef.current = requestAnimationFrame(tick);
    })();

    return () => {
      cancelado = true;
      if (ambFrameRef.current) {
        cancelAnimationFrame(ambFrameRef.current);
        ambFrameRef.current = null;
      }
    };
  }, [ambulancia]);

  // Cleanup mapa al desmontar
  useEffect(() => {
    return () => {
      if (mapaRef.current) {
        mapaRef.current.remove();
        mapaRef.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={contenedorRef}
      style={{
        height: 280,
        borderRadius: "var(--radius)",
        overflow: "hidden",
        border: "1px solid var(--line)",
      }}
    />
  );
}
