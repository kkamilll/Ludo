// Audio Synthesis Engine using Web Audio API
class AudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem('ludo_muted') === 'true';
  }

  // Initialize the audio context (must be called after a user interaction)
  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return;
    }
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn("Web Audio API is not supported in this browser.", e);
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem('ludo_muted', this.muted);
    return this.muted;
  }

  isMuted() {
    return this.muted;
  }

  // Sound: Dice Roll (a series of rapid clicks that slow down)
  playRoll() {
    this.init();
    if (this.muted || !this.ctx) return;

    const now = this.ctx.currentTime;
    const duration = 1.0; // 1 second rolling sound
    const numClicks = 12;

    for (let i = 0; i < numClicks; i++) {
      // Calculate exponential spacing to simulate deceleration
      const ratio = i / (numClicks - 1);
      const timeOffset = Math.pow(ratio, 1.5) * duration;
      const clickTime = now + timeOffset;

      this.triggerClick(clickTime, 200 + (1 - ratio) * 400);
    }
  }

  triggerClick(time, frequency) {
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(frequency, time);
    // Quick frequency sweep down for punchy click
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.04);

    gainNode.gain.setValueAtTime(0.15, time);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.04);

    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc.start(time);
    osc.stop(time + 0.05);
  }

  // Sound: Pawn movement (short ascending pitch sweep)
  playMove() {
    this.init();
    if (this.muted || !this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(250, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.15);

    gainNode.gain.setValueAtTime(0.12, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.16);
  }

  // Sound: Pawn capture/eating (explosion noise + dropping pitch)
  playCapture() {
    this.init();
    if (this.muted || !this.ctx) return;

    const now = this.ctx.currentTime;

    // 1. Synthesize explosion noise
    const bufferSize = this.ctx.sampleRate * 0.35; // 0.35 seconds
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noiseNode = this.ctx.createBufferSource();
    noiseNode.buffer = buffer;

    // Filter noise to make it rumble
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, now);
    filter.frequency.exponentialRampToValueAtTime(100, now + 0.3);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.25, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    noiseNode.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);

    // 2. Synthesize descending electronic sweep
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(500, now);
    osc.frequency.linearRampToValueAtTime(80, now + 0.35);

    oscGain.gain.setValueAtTime(0.15, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(oscGain);
    oscGain.connect(this.ctx.destination);

    // Start nodes
    noiseNode.start(now);
    osc.start(now);

    noiseNode.stop(now + 0.4);
    osc.stop(now + 0.4);
  }

  // Sound: Victory fanfare (beautiful upbeat arpeggio)
  playWin() {
    this.init();
    if (this.muted || !this.ctx) return;

    const now = this.ctx.currentTime;
    const notes = [
      { note: 261.63, dur: 0.15 }, // C4
      { note: 329.63, dur: 0.15 }, // E4
      { note: 392.00, dur: 0.15 }, // G4
      { note: 523.25, dur: 0.15 }, // C5
      { note: 659.25, dur: 0.15 }, // E5
      { note: 783.99, dur: 0.15 }, // G5
      { note: 1046.50, dur: 0.5 }  // C6
    ];

    let currentOffset = 0;
    notes.forEach((n) => {
      const time = now + currentOffset;
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(n.note, time);

      gainNode.gain.setValueAtTime(0.12, time);
      gainNode.gain.setValueAtTime(0.12, time + n.dur - 0.03);
      gainNode.gain.exponentialRampToValueAtTime(0.001, time + n.dur);

      osc.connect(gainNode);
      gainNode.connect(this.ctx.destination);

      osc.start(time);
      osc.stop(time + n.dur + 0.01);

      currentOffset += n.dur * 0.8;
    });
  }
}

export const audio = new AudioEngine();
