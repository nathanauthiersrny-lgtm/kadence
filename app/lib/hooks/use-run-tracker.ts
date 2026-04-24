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
  isPaused: boolean;
  distanceMeters: number;
  durationSeconds: number;
  speedKmh: number;
  route: LatLon[];
  geoError: string | null;
  startRun: () => void;
  pauseRun: () => void;
  resumeRun: () => void;
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

const GPS_WARMUP_MS = 10_000;

export function useRunTracker(): RunTrackerReturn {
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [distanceMeters, setDistanceMeters] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [speedKmh, setSpeedKmh] = useState(0);
  const [route, setRoute] = useState<LatLon[]>([]);
  const [geoError, setGeoError] = useState<string | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPointRef = useRef<LatLon | null>(null);
  const distanceRef = useRef(0);
  const startTimeRef = useRef(0);

  // Pause accounting: total ms spent paused, and when the current pause started.
  const pausedMsRef = useRef(0);
  const pauseStartRef = useRef<number | null>(null);
  // Mutable flag so the GPS watchPosition callback can check it synchronously.
  const isPausedRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    timerRef.current = setInterval(() => {
      setDurationSeconds(
        Math.floor((Date.now() - startTimeRef.current - pausedMsRef.current) / 1_000),
      );
    }, 1_000);
  }, [clearTimer]);

  const clearTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    clearTimer();
  }, [clearTimer]);

  const startRun = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser.");
      return;
    }

    distanceRef.current = 0;
    pausedMsRef.current = 0;
    pauseStartRef.current = null;
    isPausedRef.current = false;
    lastPointRef.current = null;
    startTimeRef.current = Date.now();
    setDistanceMeters(0);
    setDurationSeconds(0);
    setRoute([]);
    setGeoError(null);
    setIsRunning(true);
    setIsPaused(false);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        // Don't accumulate distance while paused.
        if (isPausedRef.current) return;

        const elapsed = Date.now() - startTimeRef.current - pausedMsRef.current;
        if (elapsed < GPS_WARMUP_MS) return;

        if (pos.coords.accuracy > 30) return;

        const point: LatLon = { lat: pos.coords.latitude, lon: pos.coords.longitude };

        if (pos.coords.speed != null && pos.coords.speed >= 0) {
          setSpeedKmh(pos.coords.speed * 3.6);
        }

        if (lastPointRef.current !== null) {
          const segment = haversine(lastPointRef.current, point);
          if (segment >= 0.5 && segment <= 100) {
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

    startTimer();
  }, [clearTracking, startTimer]);

  const pauseRun = useCallback(() => {
    if (!isRunning || isPausedRef.current) return;
    isPausedRef.current = true;
    pauseStartRef.current = Date.now();
    setIsPaused(true);
    clearTimer();
    setSpeedKmh(0);
  }, [isRunning, clearTimer]);

  const resumeRun = useCallback(() => {
    if (!isRunning || !isPausedRef.current) return;
    if (pauseStartRef.current !== null) {
      pausedMsRef.current += Date.now() - pauseStartRef.current;
      pauseStartRef.current = null;
    }
    isPausedRef.current = false;
    setIsPaused(false);
    startTimer();
  }, [isRunning, startTimer]);

  const stopRun = useCallback((): RunResult => {
    // If paused when stopping, account for the current pause segment.
    let totalPausedMs = pausedMsRef.current;
    if (pauseStartRef.current !== null) {
      totalPausedMs += Date.now() - pauseStartRef.current;
    }
    const distance = BigInt(Math.round(distanceRef.current));
    const duration = BigInt(Math.floor((Date.now() - startTimeRef.current - totalPausedMs) / 1_000));
    clearTracking();
    setIsRunning(false);
    setIsPaused(false);
    isPausedRef.current = false;
    return { distance, duration };
  }, [clearTracking]);

  useEffect(() => {
    return () => clearTracking();
  }, [clearTracking]);

  return {
    isRunning,
    isPaused,
    distanceMeters,
    durationSeconds,
    speedKmh,
    route,
    geoError,
    startRun,
    pauseRun,
    resumeRun,
    stopRun,
  };
}
