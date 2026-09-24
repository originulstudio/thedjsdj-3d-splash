import { CHAPTERS } from "@/config/artDirection";
import { AudioAnalyser, type SoundState } from "@/lib/audio/AudioAnalyser";
import { applySoundLabel } from "@/components/chrome/SoundControl";
import { dismissLoader } from "@/lib/motion/timeline";
import { bindScroll } from "@/lib/motion/scroll";
import { watchReducedMotion } from "@/lib/motion/reducedMotion";
import { onVisibility } from "@/lib/performance/visibility";
import { profileDevice } from "@/lib/performance/deviceProfile";
import { chapterFromProgress } from "@/lib/utils/math";
import { chapterIdFromIndex, SceneController } from "@/lib/scene/SceneController";
import { createSceneState } from "@/lib/scene/SceneState";

const focusable = "a[href], button:not([disabled]), [tabindex]:not([tabindex='-1'])";

export function boot(): void {
  const canvas = document.querySelector<HTMLCanvasElement>("#stage");
  const loader = document.querySelector<HTMLElement>("#loader");
  const bar = document.querySelector<HTMLElement>("[data-loader-bar]");
  const fallback = document.querySelector<HTMLElement>("#fallback");
  const menu = document.querySelector<HTMLElement>("[data-menu]");
  const menuButton = document.querySelector<HTMLButtonElement>("[data-menu-button]");
  const soundButton = document.querySelector<HTMLButtonElement>("[data-sound]");
  const hint = document.querySelector<HTMLElement>("[data-hint]");
  const chapterLabel = document.querySelector<HTMLElement>("[data-chapter]");
  const reduceButton = document.querySelector<HTMLButtonElement>("[data-reduce]");
  if (!canvas || !loader || !menu || !menuButton || !soundButton || !chapterLabel) return;

  const profile = profileDevice();
  const audio = new AudioAnalyser();
  let forcedReduce = false;
  try {
    forcedReduce = sessionStorage.getItem("djs-reduced") === "1";
  } catch {
    forcedReduce = false;
  }
  const reduced = profile.reduced || forcedReduce;
  document.documentElement.dataset.motion = reduced ? "reduced" : "full";
  document.documentElement.dataset.tier = profile.tier;

  const setProgress = (value: number) => {
    if (!bar) return;
    bar.style.transform = `scaleX(${Math.max(0.05, Math.min(1, value))})`;
    bar.parentElement?.setAttribute("aria-valuenow", String(Math.round(value * 100)));
  };
  setProgress(0.15);

  let soundState: SoundState = reduced ? "reduced" : "muted";
  applySoundLabel(soundButton, soundState);

  const showFallback = (on: boolean) => {
    if (!fallback) return;
    fallback.hidden = !on;
    canvas.hidden = on;
    document.documentElement.dataset.webgl = on ? "off" : "on";
  };

  const state = createSceneState(profile.tier, reduced);

  if (!profile.webgl || profile.tier === "low") {
    showFallback(true);
    setProgress(1);
    window.setTimeout(() => dismissLoader(loader), 400);
    wireChrome(null);
    return;
  }

  showFallback(false);
  let scene = new SceneController(canvas, state, (next) => {
    scene.dispose();
    if (next === "low") {
      showFallback(true);
      document.documentElement.dataset.tier = "low";
      return;
    }
    state.tier = next;
    document.documentElement.dataset.tier = next;
    scene = new SceneController(canvas, state, () => undefined);
    void scene.mountFigure().then(() => scene.start());
  });

  let hintGone = false;
  let menuOpen = false;
  let lastChapter = -1;

  const finishLoader = () => {
    setProgress(1);
    dismissLoader(loader);
  };

  const loaderCap = window.setTimeout(finishLoader, 2400);

  void scene
    .mountFigure()
    .then(() => {
      setProgress(0.86);
      scene.start();
      window.clearTimeout(loaderCap);
      finishLoader();
    })
    .catch(() => {
      showFallback(true);
      scene.dispose();
      finishLoader();
    });

  const unscroll = bindScroll((progress) => {
    state.scroll = progress;
    state.dirty = true;
    const index = chapterFromProgress(progress);
    if (index !== lastChapter) {
      lastChapter = index;
      state.chapter = chapterIdFromIndex(index);
      state.chroma = state.reduced ? 0 : 0.003;
      const chapter = CHAPTERS[index];
      chapterLabel.textContent = `${chapter.index}  ${chapter.label}`;
      document.body.dataset.chapter = chapter.id;
    }
  }, reduced);

  const unvis = onVisibility((hidden) => {
    state.hidden = hidden;
    state.dirty = true;
  });

  const unmotion = watchReducedMotion((next) => {
    if (sessionStorage.getItem("djs-reduced") === "1") return;
    applyReduced(next);
  });

  const onResize = () => scene.resize();
  window.addEventListener("resize", onResize);

  const dropHint = () => {
    if (hintGone || !hint) return;
    hintGone = true;
    hint.dataset.gone = "true";
  };

  window.addEventListener("pointermove", (event) => {
    state.pointerX = (event.clientX / window.innerWidth) * 2 - 1;
    state.pointerY = -((event.clientY / window.innerHeight) * 2 - 1);
    state.dirty = true;
    if (Math.abs(state.pointerX) > 0.05 || Math.abs(state.pointerY) > 0.05) dropHint();
  });

  window.addEventListener("pointerdown", (event) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest("a, button, input, [data-menu]")) return;
    state.holding = true;
    state.dirty = true;
    dropHint();
  });

  window.addEventListener("pointerup", () => {
    state.holding = false;
  });

  window.addEventListener("pointercancel", () => {
    state.holding = false;
  });

  canvas.style.pointerEvents = "none";

  window.addEventListener("click", (event) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest("a, button")) return;
    if (scene.pointerHit(event.clientX, event.clientY)) {
      state.pulse = 1;
      state.dirty = true;
    } else {
      state.pulse = 0.45;
      state.dirty = true;
    }
  });

  const audioLoop = () => {
    if (audio.active) {
      const bands = audio.sample();
      state.audioLow = bands.low;
      state.audioMid = bands.mid;
      state.audioHigh = bands.high;
      state.dirty = true;
    }
    window.requestAnimationFrame(audioLoop);
  };
  window.requestAnimationFrame(audioLoop);

  function applyReduced(next: boolean) {
    state.reduced = next;
    state.dirty = true;
    document.documentElement.dataset.motion = next ? "reduced" : "full";
    soundState = next ? "reduced" : audio.active ? "on" : "muted";
    if (soundButton) applySoundLabel(soundButton, soundState);
    if (reduceButton) reduceButton.setAttribute("aria-pressed", next ? "true" : "false");
  }

  function wireChrome(active: SceneController | null) {
    if (!menu || !menuButton || !soundButton) return;
    const closeMenu = () => {
      menuOpen = false;
      menu.hidden = false;
      menu.dataset.open = "false";
      menuButton.setAttribute("aria-expanded", "false");
      document.body.classList.remove("menu-open");
      menuButton.focus();
    };
    const openMenu = () => {
      menuOpen = true;
      menu.hidden = false;
      menu.dataset.open = "true";
      menuButton.setAttribute("aria-expanded", "true");
      document.body.classList.add("menu-open");
      const first = menu.querySelector<HTMLElement>(focusable);
      first?.focus();
    };

    menuButton.addEventListener("click", () => {
      if (menuOpen) closeMenu();
      else openMenu();
    });

    menu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => closeMenu());
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && menuOpen) {
        event.preventDefault();
        closeMenu();
      }
      if (event.key === "Tab" && menuOpen) {
        const nodes = Array.from(menu.querySelectorAll<HTMLElement>(focusable));
        if (nodes.length === 0) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    });

    soundButton.addEventListener("click", () => {
      void (async () => {
        if (audio.active) {
          await audio.stop();
          soundState = state.reduced ? "reduced" : "muted";
          applySoundLabel(soundButton, soundState);
          state.audioLow = 0;
          state.audioMid = 0;
          state.audioHigh = 0;
          return;
        }
        try {
          await audio.start();
          soundState = "on";
          applySoundLabel(soundButton, soundState);
        } catch {
          soundState = state.reduced ? "reduced" : "muted";
          applySoundLabel(soundButton, soundState);
        }
      })();
    });

    reduceButton?.addEventListener("click", () => {
      const next = !state.reduced;
      sessionStorage.setItem("djs-reduced", next ? "1" : "0");
      applyReduced(next);
      if (next && active) active.resize();
    });

    document.querySelectorAll<HTMLAnchorElement>("[data-return]").forEach((link) => {
      link.addEventListener("click", () => {
        state.seed = Math.random();
        state.pulse = 0.6;
        state.dirty = true;
      });
    });
  }

  wireChrome(scene);

  window.addEventListener("pagehide", () => {
    unscroll();
    unvis();
    unmotion();
    window.removeEventListener("resize", onResize);
    void audio.stop();
    scene.dispose();
  });
}
