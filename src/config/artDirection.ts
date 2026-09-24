/** Central art-direction numbers. Scene code reads these instead of scattering literals. */
export const COLOR = {
  void: "#050506",
  voidBlue: "#070B16",
  graphite: "#16171D",
  silver: "#D9DEE7",
  ember: "#FF4D2E",
  ultraviolet: "#7A3CFF",
  ion: "#4CC9FF",
  lime: "#C9FF3B",
  magenta: "#FF3F8E",
} as const;

export type QualityTier = "high" | "medium" | "low";

export const TIER = {
  high: {
    relicDetail: 3,
    shards: 64,
    stars: 900,
    dust: 260,
    signal: 70,
    points: 3600,
    maxDpr: 1.6,
    post: true,
  },
  medium: {
    relicDetail: 2,
    shards: 32,
    stars: 700,
    dust: 280,
    signal: 120,
    points: 1400,
    maxDpr: 1.25,
    post: false,
  },
  low: {
    relicDetail: 1,
    shards: 0,
    stars: 0,
    dust: 0,
    signal: 0,
    points: 0,
    maxDpr: 1,
    post: false,
  },
} as const;

export const CHAPTERS = [
  { id: "intro", index: "01", label: "INBOUND" },
  { id: "orbit", index: "02", label: "ORBIT" },
  { id: "figure", index: "03", label: "FIGURE" },
  { id: "outro", index: "04", label: "EXIT VECTOR" },
] as const;

export type ChapterId = (typeof CHAPTERS)[number]["id"];
