import type { SoundState } from "@/lib/audio/AudioAnalyser";

const LABELS: Record<SoundState, string> = {
  muted: "MUTED",
  on: "SOUND ON",
  reduced: "REDUCED EXPERIENCE",
};

export function applySoundLabel(button: HTMLButtonElement, state: SoundState): void {
  const label = LABELS[state];
  button.dataset.state = state;
  button.setAttribute("aria-pressed", state === "on" ? "true" : "false");
  button.setAttribute("aria-label", `Sound: ${label}`);
  const text = button.querySelector("[data-sound-label]");
  if (text) text.textContent = label;
}
