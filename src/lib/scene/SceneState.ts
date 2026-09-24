import type { ChapterId, QualityTier } from "@/config/artDirection";

export interface SceneState {
  scroll: number;
  chapter: ChapterId;
  pointerX: number;
  pointerY: number;
  holding: boolean;
  pulse: number;
  charge: number;
  audioLow: number;
  audioMid: number;
  audioHigh: number;
  reduced: boolean;
  hidden: boolean;
  tier: QualityTier;
  seed: number;
  chroma: number;
  dirty: boolean;
}

export function createSceneState(tier: QualityTier, reduced: boolean): SceneState {
  return {
    scroll: 0,
    chapter: "intro",
    pointerX: 0,
    pointerY: 0,
    holding: false,
    pulse: 0,
    charge: 0,
    audioLow: 0,
    audioMid: 0,
    audioHigh: 0,
    reduced,
    hidden: false,
    tier,
    seed: Math.random(),
    chroma: 0,
    dirty: true,
  };
}
