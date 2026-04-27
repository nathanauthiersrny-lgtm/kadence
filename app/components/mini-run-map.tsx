"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { Map } from "leaflet";
import type { LatLon } from "../lib/hooks/use-run-tracker";

type Props = { coords: LatLon[] };

export function MiniRunMap({ coords }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current || coords.length < 2) return;

    import("leaflet").then((L) => {
      if (!containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, {
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: false,
        dragging: false,
        touchZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
      });

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
      }).addTo(map);

      const latLngs = coords.map((p) => [p.lat, p.lon] as [number, number]);
      const poly = L.polyline(latLngs, { color: "#E0F479", weight: 3, opacity: 0.9 });
      poly.addTo(map);
      map.fitBounds(poly.getBounds(), { padding: [6, 6] });
      mapRef.current = map;
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} style={{ width: "100%", height: 80 }} />;
}
