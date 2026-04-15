"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { Map, Polyline, CircleMarker } from "leaflet";
import type { LatLon } from "../lib/hooks/use-run-tracker";

type Props = {
  route: LatLon[];
  className?: string;
};

/**
 * Live route map using Leaflet + OpenStreetMap tiles.
 *
 * This component is intended to be loaded via `next/dynamic` with `ssr: false`
 * because Leaflet accesses `window` at import time.
 */
export function RunMap({ route, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const polylineRef = useRef<Polyline | null>(null);
  const dotRef = useRef<CircleMarker | null>(null);
  const startDotRef = useRef<CircleMarker | null>(null);

  // Initialise Leaflet map once the div is mounted.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Dynamic import so the module is only evaluated in the browser.
    import("leaflet").then((L) => {
      if (!containerRef.current || mapRef.current) return;

      const map = L.map(containerRef.current, {
        zoomControl: true,
        attributionControl: true,
        scrollWheelZoom: false,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap contributors",
      }).addTo(map);

      // Default view — will be overridden once GPS positions arrive.
      map.setView([51.505, -0.09], 15);
      mapRef.current = map;
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      polylineRef.current = null;
      dotRef.current = null;
      startDotRef.current = null;
    };
    // Run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redraw route whenever `route` changes.
  useEffect(() => {
    if (!mapRef.current || route.length === 0) return;
    const map = mapRef.current;

    import("leaflet").then((L) => {
      const latLngs = route.map((p) => [p.lat, p.lon] as [number, number]);
      const last = route[route.length - 1];

      // --- Polyline ---
      if (polylineRef.current) {
        polylineRef.current.setLatLngs(latLngs);
      } else {
        polylineRef.current = L.polyline(latLngs, {
          color: "#16a34a",
          weight: 4,
          opacity: 0.9,
        }).addTo(map);
      }

      // --- Start dot (placed once) ---
      if (!startDotRef.current) {
        const first = route[0];
        startDotRef.current = L.circleMarker([first.lat, first.lon], {
          radius: 6,
          color: "#15803d",
          fillColor: "#ffffff",
          fillOpacity: 1,
          weight: 2,
        }).addTo(map);
      }

      // --- Current position dot ---
      if (dotRef.current) {
        dotRef.current.setLatLng([last.lat, last.lon]);
      } else {
        dotRef.current = L.circleMarker([last.lat, last.lon], {
          radius: 9,
          color: "#15803d",
          fillColor: "#16a34a",
          fillOpacity: 1,
          weight: 2,
        }).addTo(map);
      }

      // Pan/zoom to current position; initial zoom = 16, then keep user's zoom.
      const currentZoom = map.getZoom();
      map.setView([last.lat, last.lon], currentZoom === 15 && route.length <= 2 ? 16 : currentZoom);
    });
  }, [route]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ height: 240, borderRadius: "inherit" }}
    />
  );
}
