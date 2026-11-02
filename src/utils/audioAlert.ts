/**
 * Advanced Web Audio API synthesizer for Dooars Daily Basket notifications.
 * Generates ultra-loud, realistic acoustic counter bell and continuous delivery partner alarm
 * without requiring external MP3/WAV assets to guarantee 100% offline reliability.
 */

class DualAudioAlertManager {
  private audioCtx: AudioContext | null = null;
  private marketIntervalId: any = null;
  private deliveryIntervalId: any = null;
  private isMarketAlerting = false;
  private isDeliveryAlerting = false;
  private isMuted = false;
  private userInteracted = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const unlock = () => {
        this.unlockAudio();
        window.removeEventListener('click', unlock);
        window.removeEventListener('touchstart', unlock);
        window.removeEventListener('keydown', unlock);
      };
      window.addEventListener('click', unlock, { passive: true });
      window.addEventListener('touchstart', unlock, { passive: true });
      window.addEventListener('keydown', unlock, { passive: true });
    }
  }

  private initContext(): AudioContext | null {
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  public unlockAudio(): boolean {
    this.userInteracted = true;
    const ctx = this.initContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    return ctx ? ctx.state === 'running' : false;
  }

  public isAudioUnlocked(): boolean {
    return this.userInteracted && (this.audioCtx ? this.audioCtx.state === 'running' : false);
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stopAllAlerts();
    }
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public isMarketPartnerAlerting(): boolean {
    return this.isMarketAlerting;
  }

  public isDeliveryPartnerAlerting(): boolean {
    return this.isDeliveryAlerting;
  }

  public getIsAlerting(): boolean {
    return this.isMarketAlerting || this.isDeliveryAlerting;
  }

  /**
   * Sound 1: Market Partner Loud Double-Strike Counter Bell
   * Sounds like a crisp, loud brass bell "DING-DONG! ... DING-DONG!"
   */
  private playMarketBellStrike() {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      if (!ctx || ctx.state !== 'running') return;

      const now = ctx.currentTime;

      // Master compressor to boost loudness safely without clipping
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-14, now);
      compressor.knee.setValueAtTime(20, now);
      compressor.ratio.setValueAtTime(12, now);
      compressor.attack.setValueAtTime(0.002, now);
      compressor.release.setValueAtTime(0.15, now);
      compressor.connect(ctx.destination);

      // Strike 1 (High bell strike ~ 784 Hz / G5)
      const playChimeNote = (startTime: number, baseFreq: number, gainLevel: number) => {
        const oscPrimary = ctx.createOscillator();
        const gainPrimary = ctx.createGain();
        oscPrimary.type = 'sine';
        oscPrimary.frequency.setValueAtTime(baseFreq, startTime);

        // Overtone for metallic brass resonance
        const oscHarmonic = ctx.createOscillator();
        const gainHarmonic = ctx.createGain();
        oscHarmonic.type = 'triangle';
        oscHarmonic.frequency.setValueAtTime(baseFreq * 2.76, startTime);

        gainPrimary.gain.setValueAtTime(gainLevel, startTime);
        gainPrimary.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.55);

        gainHarmonic.gain.setValueAtTime(gainLevel * 0.35, startTime);
        gainHarmonic.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.35);

        oscPrimary.connect(gainPrimary);
        gainPrimary.connect(compressor);
        oscHarmonic.connect(gainHarmonic);
        gainHarmonic.connect(compressor);

        oscPrimary.start(startTime);
        oscPrimary.stop(startTime + 0.55);
        oscHarmonic.start(startTime);
        oscHarmonic.stop(startTime + 0.35);
      };

      // Two loud strikes in quick succession
      playChimeNote(now, 784, 0.85); // Note 1: High G5
      playChimeNote(now + 0.16, 1046.5, 0.95); // Note 2: C6 (Loud alert peak)
    } catch (err) {
      console.warn('Market partner audio alert playback warning:', err);
    }
  }

  /**
   * Sound 2: Delivery Partner Continuous Loud Bell Ringing
   * High-intensity acoustic bicycle / telephone bell alarm
   * Rapid repeated strikes ("TRRR-RING! TRRR-RING!") repeating continuously until received.
   */
  private playDeliveryContinuousBellStrike() {
    if (this.isMuted) return;
    try {
      const ctx = this.initContext();
      if (!ctx || ctx.state !== 'running') return;

      const now = ctx.currentTime;

      // Compressor for high-impact loudness
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-10, now);
      compressor.ratio.setValueAtTime(15, now);
      compressor.attack.setValueAtTime(0.001, now);
      compressor.release.setValueAtTime(0.1, now);
      compressor.connect(ctx.destination);

      // Tremolo / Rapid rapid hammer strikes (mimicking mechanical bell hammer)
      const hammerCount = 6;
      const strikeInterval = 0.045; // 45ms per vibration

      for (let i = 0; i < hammerCount; i++) {
        const strikeTime = now + i * strikeInterval;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        // Dual alternating chime frequencies (1320 Hz & 1580 Hz)
        osc.type = i % 2 === 0 ? 'sine' : 'square';
        osc.frequency.setValueAtTime(i % 2 === 0 ? 1318.51 : 1567.98, strikeTime);

        gain.gain.setValueAtTime(0.9, strikeTime);
        gain.gain.exponentialRampToValueAtTime(0.001, strikeTime + 0.08);

        osc.connect(gain);
        gain.connect(compressor);

        osc.start(strikeTime);
        osc.stop(strikeTime + 0.08);
      }

      // Trailing ring sustain
      const sustainOsc = ctx.createOscillator();
      const sustainGain = ctx.createGain();
      sustainOsc.type = 'triangle';
      sustainOsc.frequency.setValueAtTime(1318.51, now + hammerCount * strikeInterval);
      sustainGain.gain.setValueAtTime(0.7, now + hammerCount * strikeInterval);
      sustainGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);

      sustainOsc.connect(sustainGain);
      sustainGain.connect(compressor);
      sustainOsc.start(now + hammerCount * strikeInterval);
      sustainOsc.stop(now + 0.65);
    } catch (err) {
      console.warn('Delivery partner continuous audio alert playback warning:', err);
    }
  }

  /**
   * Start Market Partner order received alert (loud bell repeating every 2.4s)
   */
  public playMarketPartnerAlert() {
    if (this.isMarketAlerting) return;
    this.isMarketAlerting = true;
    this.playMarketBellStrike();

    if (this.marketIntervalId) clearInterval(this.marketIntervalId);
    this.marketIntervalId = setInterval(() => {
      if (!this.isMarketAlerting) {
        clearInterval(this.marketIntervalId);
        return;
      }
      this.playMarketBellStrike();
    }, 2400);
  }

  // Alias for backward compatibility
  public playNewOrderAlert() {
    this.playMarketPartnerAlert();
  }

  public startAlert() {
    this.playMarketPartnerAlert();
  }

  public stopMarketPartnerAlert() {
    this.isMarketAlerting = false;
    if (this.marketIntervalId) {
      clearInterval(this.marketIntervalId);
      this.marketIntervalId = null;
    }
  }

  // Alias for backward compatibility
  public stopAlert() {
    this.stopMarketPartnerAlert();
  }

  /**
   * Start Delivery Partner Continuous Bell Alert
   * Continues ringing loudly every 1.5 seconds non-stop until received!
   */
  public playDeliveryPartnerContinuousBell() {
    if (this.isDeliveryAlerting) return;
    this.isDeliveryAlerting = true;
    this.playDeliveryContinuousBellStrike();

    if (this.deliveryIntervalId) clearInterval(this.deliveryIntervalId);
    this.deliveryIntervalId = setInterval(() => {
      if (!this.isDeliveryAlerting) {
        clearInterval(this.deliveryIntervalId);
        return;
      }
      this.playDeliveryContinuousBellStrike();
    }, 1500);
  }

  public stopDeliveryPartnerAlert() {
    this.isDeliveryAlerting = false;
    if (this.deliveryIntervalId) {
      clearInterval(this.deliveryIntervalId);
      this.deliveryIntervalId = null;
    }
  }

  public stopAllAlerts() {
    this.stopMarketPartnerAlert();
    this.stopDeliveryPartnerAlert();
  }
}

export const orderAlertAudio = new DualAudioAlertManager();
