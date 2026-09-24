import type { QualityTier } from "@/config/artDirection";

/** Step down once if a warm-up run is consistently slow. Never oscillates back up. */
export function stepDownTier(tier: QualityTier, averageFrameMs: number): QualityTier {
  if (averageFrameMs < 28) return tier;
  if (tier === "high") return "medium";
  if (tier === "medium") return "low";
  return "low";
}
