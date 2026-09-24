export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function damp(current: number, target: number, lambda: number, dt: number): number {
  return lerp(current, target, 1 - Math.exp(-lambda * dt));
}

export function hash(n: number): number {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

export function chapterFromProgress(progress: number): 0 | 1 | 2 | 3 {
  if (progress < 0.22) return 0;
  if (progress < 0.48) return 1;
  if (progress < 0.74) return 2;
  return 3;
}
