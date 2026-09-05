/**
 * Subtle synthesized sound effects using Web Audio API
 */
class SoundPlayer {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.5; // Default 50% volume for alarms & notifications

  constructor() {
    try {
      if (typeof window !== 'undefined') {
        const savedVol = localStorage.getItem('showup_alarm_volume');
        if (savedVol !== null) {
          const parsed = parseFloat(savedVol);
          if (!isNaN(parsed)) {
            this.volume = Math.max(0, Math.min(1, parsed));
          }
        }
        const savedMute = localStorage.getItem('showup_sound_muted');
        if (savedMute !== null) {
          this.isMuted = savedMute === 'true';
        }
      }
    } catch {}
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('showup_alarm_volume', String(this.volume));
      }
    } catch {}
  }

  public getVolume(): number {
    return this.volume;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('showup_sound_muted', String(this.isMuted));
      }
    } catch {}
    return this.isMuted;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('showup_sound_muted', String(this.isMuted));
      }
    } catch {}
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Minimal UI click sound.
   * EXCLUDED from master volume gain to maintain an ultra-subtle, non-distracting tactile tick.
   */
  public playClick() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      // Soft sine micro-tick
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(240, now + 0.03);

      // Minimal fixed gain: 0.02 (extremely subtle and polite)
      gain.gain.setValueAtTime(0.02, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.03);
    } catch {
      // Audio errors safely caught
    }
  }

  public playClockIn() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now); // A4
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5

      const targetGain = 0.2 * this.volume;
      gain.gain.setValueAtTime(0.01 * this.volume, now);
      gain.gain.linearRampToValueAtTime(targetGain, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch {
      // Audio errors safely caught
    }
  }

  public playClockOut() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, now); // E5
      osc.frequency.exponentialRampToValueAtTime(329.63, now + 0.18); // E4

      const targetGain = 0.2 * this.volume;
      gain.gain.setValueAtTime(0.01 * this.volume, now);
      gain.gain.linearRampToValueAtTime(targetGain, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.3);
    } catch {
      // Audio errors safely caught
    }
  }

  public playAlarm(frequency: number = 880, duration: number = 0.3, customVolume?: number) {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const targetVol = customVolume !== undefined ? customVolume : this.volume;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, now);

      gain.gain.setValueAtTime(0.25 * targetVol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + duration);
    } catch {
      // Audio errors safely caught
    }
  }

  public playSuccess() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.16); // G5

      const targetGain = 0.2 * this.volume;
      gain.gain.setValueAtTime(0.01 * this.volume, now);
      gain.gain.linearRampToValueAtTime(targetGain, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch {
      // Audio errors safely caught
    }
  }
}

export const sounds = new SoundPlayer();

export default sounds;
