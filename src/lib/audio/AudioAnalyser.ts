import { artist } from "@/config/artist";

export type SoundState = "muted" | "on" | "reduced";

export class AudioAnalyser {
  private context: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: AudioBufferSourceNode | null = null;
  private gain: GainNode | null = null;
  private data = new Uint8Array(0);
  private smooth = { low: 0, mid: 0, high: 0 };
  active = false;

  async start(): Promise<void> {
    if (this.active) return;
    const Ctx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    this.context = new Ctx();
    const response = await fetch(artist.audioSrc);
    const encoded = await response.arrayBuffer();
    const buffer = await this.context.decodeAudioData(encoded.slice(0));
    this.analyser = this.context.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.82;
    this.data = new Uint8Array(this.analyser.frequencyBinCount);
    this.gain = this.context.createGain();
    this.gain.gain.value = 0.9;
    this.source = this.context.createBufferSource();
    this.source.buffer = buffer;
    this.source.loop = true;
    this.source.connect(this.analyser);
    this.analyser.connect(this.gain);
    this.gain.connect(this.context.destination);
    this.source.start();
    this.active = true;
    if (this.context.state === "suspended") await this.context.resume();
  }

  sample(): { low: number; mid: number; high: number } {
    if (!this.analyser || !this.active) return this.smooth;
    this.analyser.getByteFrequencyData(this.data);
    const third = Math.floor(this.data.length / 3);
    const band = (from: number, to: number) => {
      let sum = 0;
      for (let i = from; i < to; i += 1) sum += this.data[i];
      return sum / Math.max(1, (to - from) * 255);
    };
    const low = band(0, third);
    const mid = band(third, third * 2);
    const high = band(third * 2, this.data.length);
    this.smooth.low += (low - this.smooth.low) * 0.2;
    this.smooth.mid += (mid - this.smooth.mid) * 0.2;
    this.smooth.high += (high - this.smooth.high) * 0.2;
    return this.smooth;
  }

  async stop(): Promise<void> {
    this.active = false;
    try {
      this.source?.stop();
    } catch {
      /* already stopped */
    }
    this.source?.disconnect();
    this.analyser?.disconnect();
    this.gain?.disconnect();
    this.source = null;
    await this.context?.close();
    this.context = null;
    this.smooth.low = 0;
    this.smooth.mid = 0;
    this.smooth.high = 0;
  }
}
