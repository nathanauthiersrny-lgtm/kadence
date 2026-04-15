"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export type LatLon = { lat: number; lon: number };

export type RunResult = {
  /** Distance in whole metres, cast to bigint for the Anchor instruction. */
  distance: bigint;
  /** Elapsed time in whole seconds, cast to bigint. */
  duration: bigint;
};

export type RunTrackerReturn = {
  isRunning: boolean;
  distanceMeters: number;
  durationSeconds: number;
  route: LatLon[];
  geoError: string | null;
  startRun: () => void;
  /** Stops tracking and returns final {distance, duration} for complete_run. */
  stopRun: () => RunResult;
};

/** Haversine great-circle distance in metres between two GPS points. */
function haversine(a: LatLon, b: LatLon): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const sinHalfDLat = Math.sin(dLat / 2);
  const sinHalfDLon = Math.sin(dLon / 2);
  const h =
    sinHalfDLat * sinHalfDLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinHalfDLon * sinHalfDLon;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function useRunTracker(): RunTrackerReturn {
  const [isRunning, setIsRunning] = useState(false);
  const [distanceMeters, setDistanceMeters] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [route, setRoute] = useState<LatLon[]>([]);
  const [geoError, setGeoError] = useState<string | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPointRef = useRef<LatLon | null>(null);
  // Mutable refs so closures in watchPosition callback always see latest value.
  const distanceRef = useRef(0);
  const startTimeRef = useRef(0);

  const clearTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startRun = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser.");
      return;
    }

    // Reset everything
    distanceRef.current = 0;
    lastPointRef.current = null;
    startTimeRef.current = Date.now();
    setDistanceMeters(0);
    setDurationSeconds(0);
    setRoute([]);
    setGeoError(null);
    setIsRunning(true);

    // GPS watch — high accuracy, no caching
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const point: LatLon = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
        };

        if (lastPointRef.current !== null) {
          const segment = haversine(lastPointRef.current, point);
          // Filter GPS noise: ignore sub-metre jitter and implausible jumps
          // (>50 m between updates is ~180 km/h — impossible while running).
          if (segment >= 1 && segment <= 50) {
            distanceRef.current += segment;
            setDistanceMeters(distanceRef.current);
          }
        }
        lastPointRef.current = point;
        setRoute((prev) => [...prev, point]);
      },
      (err) => {
        setGeoError(err.message);
        setIsRunning(false);
        clearTracking();
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15_000 },
    );

    // Tick elapsed time every second
    timerRef.current = setInterval(() => {
      setDurationSeconds(
        Math.floor((Date.now() - startTimeRef.current) / 1_000),
      );
    }, 1_000);
  }, [clearTracking]);

  const stopRun = useCallback((): RunResult => {
    const distance = BigInt(Math.round(distanceRef.current));
    const duration = BigInt(
      Math.floor((Date.now() - startTimeRef.current) / 1_000),
    );
    clearTracking();
    setIsRunning(false);
    return { distance, duration };
  }, [clearTracking]);

  // Safety cleanup on unmount
  useEffect(() => {
    return () => clearTracking();
  }, [clearTracking]);

  return {
    isRunning,
    distanceMeters,
    durationSeconds,
    route,
    geoError,
    startRun,
    stopRun,
  };
}
