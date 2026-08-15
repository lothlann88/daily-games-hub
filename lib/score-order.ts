import type { ScoreOrder } from "@/types";

// Direction-aware score comparison. "none" and absent both fall back to
// higher-is-better so pre-1.6 records and unscored games stay stable.

/** True when `candidate` beats `incumbent`. A missing score never beats a real one. */
export function beatsScore(
  candidate: number | null | undefined,
  incumbent: number | null | undefined,
  order: ScoreOrder | undefined
): boolean {
  if (candidate == null) return false;
  if (incumbent == null) return true;
  return order === "lower" ? candidate < incumbent : candidate > incumbent;
}

/** Sort comparator putting the best score first; missing scores sink to the bottom. */
export function compareScoresBestFirst(
  a: number | null | undefined,
  b: number | null | undefined,
  order: ScoreOrder | undefined
): number {
  const aMissing = a == null || !Number.isFinite(a);
  const bMissing = b == null || !Number.isFinite(b);
  if (aMissing && bMissing) return 0;
  if (aMissing) return 1;
  if (bMissing) return -1;
  return order === "lower" ? a - b : b - a;
}
