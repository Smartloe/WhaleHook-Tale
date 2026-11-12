/**
 * 轻量合成音效：不依赖任何音频文件，全部用 WebAudio 振荡器现场合成。
 *
 * 微应用沙箱只有在获批 `audio.webAudio` 后才允许创建 AudioContext；
 * 未获批、被静音或浏览器不支持时，这里静默降级（游戏照常运行）。
 * 首次用户操作时调用 `unlockAudio()` 以满足浏览器的自动播放策略。
 */
type SfxName = 'click' | 'cast' | 'hit' | 'coin' | 'treasure' | 'junk' | 'tick' | 'win' | 'lose';

let context: AudioContext | null = null;
let unavailable = false;
let muted = false;
let master: GainNode | null = null;

function ensureContext(): AudioContext | null {
  if (context || unavailable) {
    return context;
  }
  try {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) {
      unavailable = true;
      return null;
    }
    context = new Ctor();
    master = context.createGain();
    master.gain.value = 0.16;
    master.connect(context.destination);
  } catch {
    unavailable = true;
    context = null;
    master = null;
  }
  return context;
}

export function unlockAudio(): void {
  const ctx = ensureContext();
  if (ctx && ctx.state === 'suspended') {
    void ctx.resume().catch(() => {});
  }
}

export function setMuted(value: boolean): void {
  muted = value;
}

export function isMuted(): boolean {
  return muted;
}

interface ToneOptions {
  frequency: number;
  duration: number;
  type?: OscillatorType;
  gain?: number;
  delay?: number;
  slideTo?: number;
}

function tone(ctx: AudioContext, options: ToneOptions): void {
  if (!master) {
    return;
  }
  const start = ctx.currentTime + (options.delay ?? 0);
  const end = start + options.duration;
  const oscillator = ctx.createOscillator();
  const envelope = ctx.createGain();
  oscillator.type = options.type ?? 'sine';
  oscillator.frequency.setValueAtTime(options.frequency, start);
  if (options.slideTo) {
    oscillator.frequency.exponentialRampToValueAtTime(options.slideTo, end);
  }
  const volume = options.gain ?? 0.5;
  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.exponentialRampToValueAtTime(volume, start + 0.012);
  envelope.gain.exponentialRampToValueAtTime(0.0001, end);
  oscillator.connect(envelope);
  envelope.connect(master);
  oscillator.start(start);
  oscillator.stop(end + 0.02);
}

export function playSfx(name: SfxName): void {
  if (muted) {
    return;
  }
  const ctx = ensureContext();
  if (!ctx || ctx.state === 'closed') {
    return;
  }
  switch (name) {
    case 'click':
      tone(ctx, { frequency: 620, slideTo: 880, duration: 0.05, type: 'triangle', gain: 0.22 });
      break;
    case 'cast':
      tone(ctx, { frequency: 720, slideTo: 300, duration: 0.14, type: 'triangle', gain: 0.35 });
      break;
    case 'hit':
      tone(ctx, { frequency: 220, slideTo: 150, duration: 0.08, type: 'square', gain: 0.25 });
      break;
    case 'coin':
      tone(ctx, { frequency: 880, duration: 0.07, type: 'sine', gain: 0.4 });
      tone(ctx, { frequency: 1320, duration: 0.1, type: 'sine', gain: 0.32, delay: 0.06 });
      break;
    case 'treasure':
      [660, 880, 1100, 1480].forEach((frequency, index) => {
        tone(ctx, {
          frequency,
          duration: 0.16,
          type: 'triangle',
          gain: 0.35,
          delay: index * 0.07,
        });
      });
      break;
    case 'junk':
      tone(ctx, { frequency: 150, slideTo: 70, duration: 0.22, type: 'sawtooth', gain: 0.28 });
      break;
    case 'tick':
      tone(ctx, { frequency: 1050, duration: 0.035, type: 'square', gain: 0.12 });
      break;
    case 'win':
      [523, 659, 784, 1046].forEach((frequency, index) => {
        tone(ctx, { frequency, duration: 0.22, type: 'triangle', gain: 0.4, delay: index * 0.11 });
      });
      break;
    case 'lose':
      [392, 330, 262].forEach((frequency, index) => {
        tone(ctx, { frequency, duration: 0.26, type: 'sine', gain: 0.35, delay: index * 0.14 });
      });
      break;
  }
}
