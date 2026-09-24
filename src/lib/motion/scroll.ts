import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

let registered = false;

export function bindScroll(onProgress: (progress: number) => void, reduced: boolean): () => void {
  const root = document.querySelector("[data-experience]");
  if (!root) return () => undefined;

  const read = () => {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollable <= 0 ? 0 : window.scrollY / scrollable;
    onProgress(Math.min(1, Math.max(0, progress)));
  };

  if (reduced) {
    read();
    window.addEventListener("scroll", read, { passive: true });
    window.addEventListener("resize", read);
    return () => {
      window.removeEventListener("scroll", read);
      window.removeEventListener("resize", read);
    };
  }

  if (!registered) {
    gsap.registerPlugin(ScrollTrigger);
    registered = true;
  }

  const lenis = new Lenis({
    lerp: 0.075,
    smoothWheel: true,
    syncTouch: false,
    anchors: true,
  });
  lenis.on("scroll", () => ScrollTrigger.update());
  const tick = (time: number) => {
    lenis.raf(time * 1000);
  };
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);

  const trigger = ScrollTrigger.create({
    trigger: root,
    start: "top top",
    end: "bottom bottom",
    scrub: 1.5,
    onUpdate: (self) => onProgress(self.progress),
  });
  read();
  return () => {
    trigger.kill();
    gsap.ticker.remove(tick);
    lenis.destroy();
  };
}

export function playMenu(open: boolean): void {
  const menu = document.querySelector<HTMLElement>("[data-menu]");
  if (!menu) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    gsap.set(menu, { autoAlpha: open ? 1 : 0 });
    return;
  }
  gsap.to(menu, {
    autoAlpha: open ? 1 : 0,
    duration: open ? 0.45 : 0.3,
    ease: open ? "power3.out" : "power2.in",
  });
}
