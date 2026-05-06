import { isDemoMode } from "./hooks/use-demo-mode";

export const MODE_KEYS = [
  "kad_xp_total",
  "kad_streak",
  "kad_badges",
  "kad_total_runs",
  "kad_community_joined",
  "kad_community_week",
  "kad_run_history",
  "kad_quest",
  "kad_flash_joined",
  "kad_flash_results",
  "kad_flash_custom",
  "kadence_runs",
  "kadence_shared_runs",
  "kadence_fires",
  "kadence_trophies",
] as const;

export function modeKey(key: string): string {
  if (typeof window === "undefined") return `real:${key}`;
  return `${isDemoMode() ? "demo" : "real"}:${key}`;
}

const MIGRATION_FLAG = "kadence_storage_v2";

export function migrateLegacyStorage(): void {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(MIGRATION_FLAG) === "1") return;
  for (const k of MODE_KEYS) localStorage.removeItem(k);
  localStorage.setItem(MIGRATION_FLAG, "1");
}
