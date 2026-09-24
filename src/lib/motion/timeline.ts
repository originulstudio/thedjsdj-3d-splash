import { gsap } from "gsap";

export function dismissLoader(loader: HTMLElement): void {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) {
    loader.hidden = true;
    return;
  }
  gsap.to(loader, {
    autoAlpha: 0,
    duration: 0.7,
    ease: "power2.inOut",
    onComplete: () => {
      loader.hidden = true;
    },
  });
}
