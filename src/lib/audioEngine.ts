/**
 * audioEngine.ts
 * Singleton Web Audio API engine — no files needed, works offline.
 * Supports synthesised themes + custom uploaded audio.
 */

type OscType = OscillatorType;

export type MusicTheme = 'battle' | 'chill' | 'retro' | 'lofi' | 'custom' | 'off';

export const MUSIC_THEMES: MusicTheme[] = ['battle', 'chill', 'retro', 'lofi', 'off'];

export const MUSIC_THEME_LABELS: Record<MusicTheme, string> = {
  battle: '⚔️ Battle',
  chill:  '🌊 Chill',
  retro:  '👾 Retro',
  lofi:   '☕ Lo-fi',
  custom: '🎵 Custom',
  off:    '🔇 Off',
};

interface NoteEvent {
  freq: number;
  duration: number;
  gain: number;
  type?: OscType;
  delay?: number;
}

class AudioEngine {
  private ctx: AudioContext | null = null;
  private _muted = false;
  private _paused = false;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicStop: (() => void) | null = null;
  private _musicTheme: MusicTheme = 'chill';

  // Custom uploaded track
  private _customAudio: HTMLAudioElement | null = null;
  private _customLabel = '🎵 Custom';

  // ── Context ────────────────────────────────────────────────────────
  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  private getMusicGain(): GainNode {
    const ctx = this.getCtx();
    if (!this.musicGain) {
      this.musicGain = ctx.createGain();
      this.musicGain.gain.value = this._muted ? 0 : 0.12;
      this.musicGain.connect(ctx.destination);
    }
    return this.musicGain;
  }

  private getSfxGain(): GainNode {
    const ctx = this.getCtx();
    if (!this.sfxGain) {
      this.sfxGain = ctx.createGain();
      this.sfxGain.gain.value = this._muted ? 0 : 0.5;
      this.sfxGain.connect(ctx.destination);
    }
    return this.sfxGain;
  }

  // ── Mute ──────────────────────────────────────────────────────────
  get muted() { return this._muted; }

  setMuted(val: boolean) {
    this._muted = val;
    const t = this.ctx ? this.ctx.currentTime : 0;
    if (this.musicGain) {
      this.musicGain.gain.setTargetAtTime(val ? 0 : (this._paused ? 0 : 0.12), t, 0.08);
    }
    if (this.sfxGain) {
      this.sfxGain.gain.setTargetAtTime(val ? 0 : 0.5, t, 0.08);
    }
    if (this._customAudio) {
      this._customAudio.volume = val ? 0 : 0.5;
    }
    try { localStorage.setItem('wowsir_muted', val ? '1' : '0'); } catch { /* */ }
  }

  loadMutePref() {
    try {
      const v = localStorage.getItem('wowsir_muted');
      if (v !== null) this._muted = v === '1';
    } catch { /* */ }
    return this._muted;
  }

  // ── Music theme preference ────────────────────────────────────────
  get musicTheme() { return this._musicTheme; }

  setMusicTheme(t: MusicTheme) {
    this._musicTheme = t;
    try { if (t !== 'custom') localStorage.setItem('wowsir_theme', t); } catch { /* */ }
  }

  loadThemePref(): MusicTheme {
    try {
      const v = localStorage.getItem('wowsir_theme') as MusicTheme | null;
      if (v && MUSIC_THEMES.includes(v)) this._musicTheme = v;
    } catch { /* */ }
    return this._musicTheme;
  }

  // ── Custom uploaded track ─────────────────────────────────────────
  get customLabel() { return this._customLabel; }
  get hasCustomTrack() { return !!this._customAudio; }

  loadCustomTrack(objectUrl: string, filename: string) {
    if (this._customAudio) {
      this._customAudio.pause();
      this._customAudio = null;
    }
    const audio = new Audio(objectUrl);
    audio.loop = true;
    audio.volume = this._muted ? 0 : 0.5;
    this._customAudio = audio;
    const base = filename.replace(/\.[^.]+$/, '');
    this._customLabel = '🎵 ' + (base.length > 18 ? base.slice(0, 16) + '…' : base);
    this.setMusicTheme('custom');
  }

  // ── Pause / resume ────────────────────────────────────────────────
  get paused() { return this._paused; }

  pauseMusic() {
    if (this._paused) return;
    this._paused = true;
    if (this._customAudio) {
      this._customAudio.pause();
    } else if (this.musicGain && this.ctx) {
      this.musicGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
    }
  }

  resumeMusic() {
    if (!this._paused) return;
    this._paused = false;
    if (this._customAudio && !this._muted) {
      this._customAudio.play().catch(() => {/* autoplay blocked */});
    } else if (this.musicGain && this.ctx && !this._muted) {
      this.musicGain.gain.setTargetAtTime(0.12, this.ctx.currentTime, 0.1);
    }
  }

  togglePause(): boolean {
    if (this._paused) this.resumeMusic();
    else this.pauseMusic();
    return this._paused;
  }

  // ── Primitive note player ─────────────────────────────────────────
  private note(
    freq: number,
    duration: number,
    gainVal: number,
    type: OscType = 'sine',
    startAt?: number,
    destination?: AudioNode,
  ) {
    const ctx = this.getCtx();
    const t = startAt ?? ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g);
    g.connect(destination ?? this.getSfxGain());
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(gainVal, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  private chord(notes: NoteEvent[]) {
    if (this._muted) return;
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    for (const n of notes) {
      this.note(n.freq, n.duration, n.gain, n.type ?? 'sine', now + (n.delay ?? 0));
    }
  }

  // ── SFX ───────────────────────────────────────────────────────────

  correct() {
    this.chord([
      { freq: 523, duration: 0.25, gain: 0.35 },
      { freq: 659, duration: 0.25, gain: 0.3,  delay: 0.08 },
      { freq: 784, duration: 0.35, gain: 0.3,  delay: 0.16 },
    ]);
  }

  wrong() {
    if (this._muted) return;
    const ctx = this.getCtx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g);
    g.connect(this.getSfxGain());
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(90, now + 0.35);
    g.gain.setValueAtTime(0.3, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    osc.start(now);
    osc.stop(now + 0.38);
  }

  tick() {
    if (this._muted) return;
    const ctx = this.getCtx();
    this.note(1200, 0.04, 0.15, 'square', ctx.currentTime);
  }

  urgentTick() {
    if (this._muted) return;
    const ctx = this.getCtx();
    this.note(1500, 0.06, 0.22, 'square', ctx.currentTime);
  }

  streak() {
    this.chord([
      { freq: 523,  duration: 0.18, gain: 0.3 },
      { freq: 659,  duration: 0.18, gain: 0.28, delay: 0.07 },
      { freq: 784,  duration: 0.18, gain: 0.28, delay: 0.14 },
      { freq: 1047, duration: 0.3,  gain: 0.3,  delay: 0.21 },
    ]);
  }

  win() {
    this.chord([
      { freq: 523,  duration: 0.3, gain: 0.3 },
      { freq: 659,  duration: 0.3, gain: 0.28, delay: 0.1 },
      { freq: 784,  duration: 0.3, gain: 0.28, delay: 0.2 },
      { freq: 1047, duration: 0.4, gain: 0.35, delay: 0.3 },
      { freq: 1319, duration: 0.6, gain: 0.35, delay: 0.42 },
    ]);
  }

  lose() {
    this.chord([
      { freq: 392, duration: 0.5, gain: 0.3,  type: 'sawtooth' },
      { freq: 370, duration: 0.5, gain: 0.28, type: 'sawtooth', delay: 0.18 },
      { freq: 349, duration: 0.5, gain: 0.28, type: 'sawtooth', delay: 0.36 },
      { freq: 294, duration: 0.8, gain: 0.3,  type: 'sawtooth', delay: 0.54 },
    ]);
  }

  click() {
    if (this._muted) return;
    const ctx = this.getCtx();
    this.note(880, 0.05, 0.12, 'sine', ctx.currentTime);
  }

  // ── Background Music ──────────────────────────────────────────────

  startMusic(theme?: MusicTheme) {
    const th = theme ?? this._musicTheme;
    this._paused = false;

    // Custom: HTMLAudioElement
    if (th === 'custom') {
      this.stopSynth();
      if (this._customAudio) {
        this._customAudio.volume = this._muted ? 0 : 0.5;
        this._customAudio.currentTime = 0;
        this._customAudio.play().catch(() => {/* autoplay blocked */});
      }
      return;
    }

    this.startSynth(th);
  }

  private stopSynth() {
    if (this.musicStop) {
      this.musicStop();
      this.musicStop = null;
    }
  }

  stopMusic() {
    this.stopSynth();
    if (this._customAudio) {
      this._customAudio.pause();
      this._customAudio.currentTime = 0;
    }
  }

  private startSynth(th: MusicTheme) {
    this.stopSynth();
    if (typeof window === 'undefined') return;
    if (th === 'off' || th === 'custom') return;

    const ctx = this.getCtx();
    const dest = this.getMusicGain();
    let stopped = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    type Step = [number, number, number, OscType];

    // ── Battle: fast punchy square waves ──────────────────────────
    const BATTLE_BPM = 148;
    const battleMelody: Step[] = [
      [659, 0.5, 0.18, 'square'], [523, 0.5, 0.15, 'square'],
      [587, 0.5, 0.16, 'square'], [523, 0.5, 0.15, 'square'],
      [698, 1.0, 0.18, 'square'], [659, 0.5, 0.16, 'square'],
      [587, 0.5, 0.15, 'square'], [523, 1.0, 0.17, 'square'],
    ];
    const battleBass: Step[] = [
      [130, 0.5, 0.12, 'sawtooth'], [130, 0.5, 0.1, 'sawtooth'],
      [146, 0.5, 0.12, 'sawtooth'], [146, 0.5, 0.1, 'sawtooth'],
      [156, 1.0, 0.12, 'sawtooth'], [130, 0.5, 0.1, 'sawtooth'],
      [146, 0.5, 0.12, 'sawtooth'], [130, 1.0, 0.12, 'sawtooth'],
    ];

    // ── Chill: slow breathy sines ──────────────────────────────────
    const CHILL_BPM = 90;
    const chillMelody: Step[] = [
      [392, 1.0, 0.14, 'sine'], [440, 1.0, 0.13, 'sine'],
      [494, 1.0, 0.14, 'sine'], [440, 1.0, 0.12, 'sine'],
      [392, 2.0, 0.14, 'sine'], [349, 1.0, 0.13, 'sine'],
      [330, 1.0, 0.12, 'sine'], [294, 2.0, 0.13, 'sine'],
    ];
    const chillPad: Step[] = [
      [196, 2.0, 0.08, 'triangle'], [220, 2.0, 0.07, 'triangle'],
      [196, 2.0, 0.08, 'triangle'], [174, 2.0, 0.07, 'triangle'],
    ];

    // ── Retro: NES-style arpeggios ─────────────────────────────────
    const RETRO_BPM = 160;
    const retroMelody: Step[] = [
      [1047, 0.25, 0.16, 'square'], [880,  0.25, 0.14, 'square'],
      [1047, 0.25, 0.16, 'square'], [1175, 0.25, 0.15, 'square'],
      [1319, 0.5,  0.17, 'square'], [1175, 0.25, 0.14, 'square'],
      [1047, 0.25, 0.15, 'square'], [880,  0.5,  0.16, 'square'],
    ];
    const retroBass: Step[] = [
      [131, 0.5, 0.13, 'square'], [131, 0.5, 0.11, 'square'],
      [147, 0.5, 0.13, 'square'], [147, 0.5, 0.11, 'square'],
      [165, 0.5, 0.13, 'square'], [147, 0.5, 0.11, 'square'],
      [131, 0.5, 0.13, 'square'], [131, 0.5, 0.11, 'square'],
    ];

    // ── Lo-fi: warm triangle jazz ──────────────────────────────────
    const LOFI_BPM = 72;
    const lofiMelody: Step[] = [
      [330, 1.5, 0.12, 'triangle'], [370, 0.5, 0.10, 'triangle'],
      [392, 2.0, 0.12, 'triangle'], [349, 1.5, 0.10, 'triangle'],
      [330, 0.5, 0.11, 'triangle'], [294, 2.0, 0.12, 'triangle'],
      [311, 1.5, 0.10, 'triangle'], [330, 2.5, 0.11, 'triangle'],
    ];
    const lofiPad: Step[] = [
      [165, 3.0, 0.07, 'sine'], [185, 3.0, 0.06, 'sine'],
      [165, 3.0, 0.07, 'sine'], [147, 3.0, 0.06, 'sine'],
    ];

    let bpm: number;
    let melody: Step[];
    let bass: Step[];

    if (th === 'battle') {
      bpm = BATTLE_BPM; melody = battleMelody; bass = battleBass;
    } else if (th === 'retro') {
      bpm = RETRO_BPM;  melody = retroMelody;  bass = retroBass;
    } else if (th === 'lofi') {
      bpm = LOFI_BPM;   melody = lofiMelody;   bass = lofiPad;
    } else {
      bpm = CHILL_BPM;  melody = chillMelody;  bass = chillPad;
    }

    const beat = 60 / bpm;

    function schedulePattern(pattern: Step[], startTime: number) {
      let pos = startTime;
      for (const [freq, beats, gain, type] of pattern) {
        const dur = beats * beat * 0.88;
        if (!stopped) {
          const osc = ctx.createOscillator();
          const g   = ctx.createGain();
          osc.connect(g);
          g.connect(dest);
          osc.type = type;
          osc.frequency.value = freq;
          g.gain.setValueAtTime(0, pos);
          g.gain.linearRampToValueAtTime(gain, pos + 0.04);
          g.gain.setValueAtTime(gain, pos + dur - 0.06);
          g.gain.linearRampToValueAtTime(0, pos + dur);
          osc.start(pos);
          osc.stop(pos + dur + 0.02);
        }
        pos += beats * beat;
      }
      return pos;
    }

    function loop() {
      if (stopped) return;
      const now = ctx.currentTime;
      const endMel = schedulePattern(melody, now);
      schedulePattern(bass, now);
      const loopDur = (endMel - now) * 1000 - 200;
      timeoutId = setTimeout(loop, Math.max(loopDur, 100));
    }

    loop();

    this.musicStop = () => {
      stopped = true;
      clearTimeout(timeoutId);
      if (this.musicGain) {
        const now = ctx.currentTime;
        this.musicGain.gain.setTargetAtTime(0, now, 0.3);
        setTimeout(() => {
          if (this.musicGain) this.musicGain.gain.value = this._muted ? 0 : 0.12;
        }, 1200);
      }
    };
  }
}

// Singleton — safe to import anywhere
export const audioEngine = typeof window !== 'undefined'
  ? new AudioEngine()
  : null as unknown as AudioEngine;
