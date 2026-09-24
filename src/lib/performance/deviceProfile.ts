import { TIER, type QualityTier } from "@/config/artDirection";

export interface DeviceProfile {
  tier: QualityTier;
  reduced: boolean;
  saveData: boolean;
  maxDpr: number;
  webgl: boolean;
}

function webglAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export function profileDevice(): DeviceProfile {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    connection?: { saveData?: boolean };
  };
  const memory = nav.deviceMemory ?? 8;
  const cores = navigator.hardwareConcurrency ?? 8;
  const saveData = Boolean(nav.connection?.saveData);
  const narrow = window.innerWidth < 820;
  const webgl = webglAvailable();

  let tier: QualityTier = "high";
  if (!webgl || saveData || memory <= 2) tier = "low";
  else if (narrow || memory <= 4 || cores <= 4) tier = "medium";

  return {
    tier,
    reduced,
    saveData,
    maxDpr: TIER[tier].maxDpr,
    webgl: webgl && tier !== "low",
  };
}
