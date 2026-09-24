import { MathUtils, Raycaster, Vector2, Vector3 } from "three";
import { TIER, type ChapterId, type QualityTier } from "@/config/artDirection";
import { damp } from "@/lib/utils/math";
import { disposeObject } from "@/lib/utils/dispose";
import { stepDownTier } from "@/lib/performance/adaptiveQuality";
import type { SceneState } from "@/lib/scene/SceneState";
import { createArtistFigure, type ArtistFigure } from "@/lib/scene/createArtistFigure";
import { createCamera, createRenderer, createStage } from "@/lib/scene/createRenderer";
import { createPostProcessing, type GradePass } from "@/lib/scene/createPostProcessing";
import { createSignalRelic, type SignalRelic } from "@/lib/scene/createSignalRelic";
import { createStarfield, type ParticleField } from "@/lib/scene/createStarfield";

const raycaster = new Raycaster();
const pointer = new Vector2();
const look = new Vector3();

export class SceneController {
  private renderer;
  private camera;
  private scene;
  private relic: SignalRelic;
  private field: ParticleField;
  private figure: ArtistFigure | null = null;
  private grade: GradePass | null = null;
  private running = false;
  private time = 0;
  private last = 0;
  private frames: number[] = [];
  private stepped = false;
  private open = 0;
  private reveal = 0;
  private figureOpacity = 0;
  private camZ = 6.6;
  private camX = 0;
  private spin = 0;

  constructor(
    canvas: HTMLCanvasElement,
    private state: SceneState,
    private onTierDrop: (next: QualityTier) => void,
  ) {
    const limits = TIER[state.tier];
    this.renderer = createRenderer(canvas, limits.maxDpr);
    this.camera = createCamera();
    this.scene = createStage();
    this.relic = createSignalRelic(limits.relicDetail, limits.shards);
    this.field = createStarfield(limits.stars, limits.dust, limits.signal);
    this.scene.add(this.field.group);
    this.scene.add(this.relic.group);
    if (limits.post) {
      this.grade = createPostProcessing(window.innerWidth, window.innerHeight, this.renderer.getPixelRatio());
    }
  }

  async mountFigure(): Promise<void> {
    const budget = TIER[this.state.tier].points;
    this.figure = await createArtistFigure(budget);
    this.figure.group.visible = true;
    this.scene.add(this.figure.group);
    this.state.dirty = true;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this.renderer.setAnimationLoop(this.frame);
  }

  stop(): void {
    this.running = false;
    this.renderer.setAnimationLoop(null);
  }

  resize = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, TIER[this.state.tier].maxDpr);
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(width, height, false);
    this.grade?.setSize(width, height, dpr);
    this.state.dirty = true;
    if (this.state.reduced) this.renderOnce();
  };

  pointerHit(clientX: number, clientY: number): boolean {
    pointer.x = (clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, this.camera);
    const hits = raycaster.intersectObject(this.relic.group, true);
    return hits.length > 0;
  }

  private renderOnce(): void {
    this.compose(0.016);
    this.draw();
  }

  private frame = (now: number): void => {
    if (this.state.hidden) return;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    if (!this.stepped && this.frames.length < 40) {
      this.frames.push(dt * 1000);
      if (this.frames.length === 40) {
        const avg = this.frames.reduce((a, b) => a + b, 0) / this.frames.length;
        const next = stepDownTier(this.state.tier, avg);
        this.stepped = true;
        if (next !== this.state.tier) {
          this.onTierDrop(next);
          return;
        }
      }
    }
    if (this.state.reduced && !this.state.dirty && this.state.chroma < 0.001 && this.state.pulse < 0.01) {
      return;
    }
    this.compose(dt);
    this.draw();
    this.state.dirty = false;
  };

  private compose(dt: number): void {
    this.time += this.state.reduced ? dt * 0.15 : dt;
    const scroll = this.state.scroll;
    const targetOpen = scroll < 0.2 ? scroll / 0.2 : scroll < 0.72 ? 1 : 1 - (scroll - 0.72) / 0.28;
    const targetReveal = MathUtils.clamp((scroll - 0.42) / 0.22, 0, 1);
    const targetOpacity = scroll < 0.4 ? 0 : scroll < 0.78 ? targetReveal : Math.max(0.2, 1 - (scroll - 0.78) / 0.22);
    const narrow = window.innerWidth < 820;
    const targetZ = 6.8 - scroll * 1.7 - this.state.audioLow * 0.25;
    const targetX = narrow ? 0 : -scroll * 0.35;
    this.open = damp(this.open, targetOpen, 2.4, dt);
    this.reveal = damp(this.reveal, this.state.reduced ? (scroll > 0.45 ? 1 : 0) : targetReveal, 2.2, dt);
    this.figureOpacity = damp(this.figureOpacity, targetOpacity, 2.2, dt);
    this.camZ = damp(this.camZ, targetZ, 2, dt);
    this.camX = damp(this.camX, targetX, 2, dt);
    this.state.pulse = damp(this.state.pulse, 0, 3.5, dt);
    this.state.charge = damp(this.state.charge, this.state.pulse, 4, dt);
    this.state.chroma = damp(this.state.chroma, 0, 2.5, dt);

    const parallax = this.state.reduced ? 0 : 1;
    const px = this.state.pointerX * parallax;
    const py = this.state.pointerY * parallax;
    if (!this.state.reduced) this.spin += dt * (0.08 + this.state.audioMid * 0.12);

    this.camera.position.x = this.camX + px * 0.28;
    this.camera.position.y = 0.08 + py * 0.18;
    this.camera.position.z = this.camZ;
    look.set(px * 0.15, py * 0.08, 0);
    this.camera.lookAt(look);

    const relic = this.relic.group;
    const spread = 1 + this.open * 0.18 + this.state.pulse * 0.08 + this.state.audioLow * 0.06;
    relic.scale.setScalar(narrow ? 0.78 * spread : spread);
    relic.position.x = narrow ? 0 : -0.55 - this.reveal * 0.55;
    relic.position.y = Math.sin(this.time * 0.45) * (this.state.reduced ? 0.01 : 0.06);
    relic.rotation.y = this.spin + px * 0.35 + this.state.seed * 0.2;
    relic.rotation.x = 0.18 + py * 0.2;

    this.relic.coreMat.uniforms.uTime.value = this.time;
    this.relic.coreMat.uniforms.uOpen.value = this.open;
    this.relic.coreMat.uniforms.uAudio.value = this.state.audioLow;
    this.relic.coreMat.uniforms.uCharge.value = 0.15 + this.state.charge + this.state.audioHigh * 0.5;
    if (this.relic.shardMat) {
      this.relic.shardMat.uniforms.uTime.value = this.time;
      this.relic.shardMat.uniforms.uCharge.value = this.state.charge + this.state.audioMid;
      this.relic.shardMat.uniforms.uOpen.value = this.open;
    }
    if (this.relic.ringMat) {
      this.relic.ringMat.uniforms.uTime.value = this.time;
      this.relic.ringMat.uniforms.uAudio.value = this.state.audioMid;
      this.relic.ringMat.uniforms.uCharge.value = 0.25 + this.state.audioHigh * 0.4;
    }
    if (this.relic.home) {
      this.relic.home.scale.setScalar(1 + this.open * 0.22 + this.state.pulse * 0.12);
    }

    this.field.update(
      this.time,
      this.state.holding && !this.state.reduced,
      px,
      py,
      this.state.audioMid,
      this.state.reduced,
    );

    if (this.figure) {
      const fig = this.figure.group;
      fig.position.x = narrow ? 0.02 : 1.72 - (1 - this.reveal) * 0.25;
      fig.position.y = narrow ? -0.15 : 0.02;
      fig.position.z = 0.55;
      fig.scale.setScalar(narrow ? 0.82 : 1.12);
      this.figure.material.uniforms.uTime.value = this.time;
      this.figure.material.uniforms.uReveal.value = this.reveal;
      this.figure.material.uniforms.uOpacity.value = this.figureOpacity;
      this.figure.material.uniforms.uDisp.value = this.state.reduced ? 0 : 0.025 + this.state.audioLow * 0.05;
      this.figure.material.uniforms.uSplit.value = 0.003 + this.state.chroma * 0.02 + this.state.audioHigh * 0.008;
      this.figure.material.uniforms.uGrid.value = 0.08 + (0.5 + 0.5 * Math.sin(this.time * 0.35)) * 0.45;
      this.figure.material.uniforms.uAudio.value = this.state.audioMid;
      if (this.figure.pointsMat) {
        this.figure.pointsMat.uniforms.uTime.value = this.time;
        this.figure.pointsMat.uniforms.uReveal.value = this.reveal;
        this.figure.pointsMat.uniforms.uSize.value = (narrow ? 1.6 : 1.25) * (1 + this.state.audioHigh * 0.7);
      }
    }

    this.grade?.setTime(this.time);
    this.grade?.setChroma(this.state.reduced ? 0 : this.state.chroma);
  }

  private draw(): void {
    if (this.grade) {
      this.grade.render(this.renderer, () => this.renderer.render(this.scene, this.camera));
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  dispose(): void {
    this.stop();
    if (this.figure) disposeObject(this.figure.group);
    disposeObject(this.relic.group);
    disposeObject(this.field.group);
    this.grade?.dispose();
    this.renderer.dispose();
  }
}

export function chapterIdFromIndex(index: number): ChapterId {
  if (index <= 0) return "intro";
  if (index === 1) return "orbit";
  if (index === 2) return "figure";
  return "outro";
}

