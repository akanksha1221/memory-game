/**
 * Procedural Audio Synthesizer for Memory Card Game using Web Audio API
 * Generates rich, low-latency, dynamic sound effects without external audio assets.
 */

class SoundSynth {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
  }

  // Lazy-initialize the AudioContext after user interaction to comply with autoplay policies
  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  // Create oscillator and gain nodes with automatic clean-up
  createChain(type = 'sine', duration = 0.5) {
    this.init();
    if (this.isMuted) return null;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    // Schedule stop and cleanup
    const now = this.ctx.currentTime;
    osc.start(now);
    osc.stop(now + duration);

    // Release memory after finished
    setTimeout(() => {
      osc.disconnect();
      gain.disconnect();
    }, (duration + 0.1) * 1000);

    return { osc, gain, now };
  }

  playFlip() {
    const chain = this.createChain('sine', 0.15);
    if (!chain) return;

    const { osc, gain, now } = chain;
    
    // Upward pitch sweep
    osc.frequency.setValueAtTime(350, now);
    osc.frequency.exponentialRampToValueAtTime(700, now + 0.12);

    // Fast decay envelope
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
  }

  playMatch() {
    // Elegant arpeggiated double chord
    this.init();
    if (this.isMuted) return;

    const now = this.ctx.currentTime;
    const playNote = (freq, delay, dur) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + delay);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      gain.gain.setValueAtTime(0.001, now + delay);
      gain.gain.linearRampToValueAtTime(0.18, now + delay + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + dur);

      osc.start(now + delay);
      osc.stop(now + delay + dur);

      setTimeout(() => {
        osc.disconnect();
        gain.disconnect();
      }, (delay + dur + 0.1) * 1000);
    };

    // Uplifting pentatonic progression: C5 -> E5 -> G5 -> C6
    playNote(523.25, 0.00, 0.25); // C5
    playNote(659.25, 0.08, 0.25); // E5
    playNote(783.99, 0.16, 0.25); // G5
    playNote(1046.50, 0.24, 0.40); // C6
  }

  playMismatch() {
    const chain = this.createChain('sawtooth', 0.25);
    if (!chain) return;

    const { osc, gain, now } = chain;
    
    // Descending, slightly detuned error buzz
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.linearRampToValueAtTime(90, now + 0.22);

    // Envelope
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
  }

  playTick() {
    const chain = this.createChain('triangle', 0.06);
    if (!chain) return;

    const { osc, gain, now } = chain;
    
    // Tiny, high-pitched mechanical clock tick
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.setValueAtTime(800, now + 0.02);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
  }

  playClick() {
    const chain = this.createChain('sine', 0.08);
    if (!chain) return;

    const { osc, gain, now } = chain;
    
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.08);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.1, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
  }

  playVictory() {
    this.init();
    if (this.isMuted) return;

    const now = this.ctx.currentTime;
    const playNote = (freq, delay, dur, type = 'sine') => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now + delay);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      gain.gain.setValueAtTime(0.001, now + delay);
      gain.gain.linearRampToValueAtTime(0.15, now + delay + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + dur);

      osc.start(now + delay);
      osc.stop(now + delay + dur);

      setTimeout(() => {
        osc.disconnect();
        gain.disconnect();
      }, (delay + dur + 0.1) * 1000);
    };

    // Joyful, fast arpeggio ending on a triumphant major chord
    const tempo = 0.07;
    playNote(261.63, 0 * tempo, 0.2, 'triangle');  // C4
    playNote(329.63, 1 * tempo, 0.2, 'triangle');  // E4
    playNote(392.00, 2 * tempo, 0.2, 'triangle');  // G4
    playNote(523.25, 3 * tempo, 0.2, 'triangle');  // C5
    playNote(659.25, 4 * tempo, 0.2, 'triangle');  // E5
    playNote(783.99, 5 * tempo, 0.2, 'triangle');  // G5
    playNote(1046.50, 6 * tempo, 0.6, 'sine');     // C6 (Triumphant long note)
    
    // Accompanying major triad chord underneath C6
    playNote(523.25, 6 * tempo, 0.6, 'triangle');  // C5
    playNote(659.25, 6 * tempo, 0.6, 'triangle');  // E5
    playNote(783.99, 6 * tempo, 0.6, 'triangle');  // G5
  }

  playDefeat() {
    this.init();
    if (this.isMuted) return;

    const now = this.ctx.currentTime;
    const playNote = (freq, delay, dur) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + delay);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      gain.gain.setValueAtTime(0.001, now + delay);
      gain.gain.linearRampToValueAtTime(0.12, now + delay + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + dur);

      osc.start(now + delay);
      osc.stop(now + delay + dur);

      setTimeout(() => {
        osc.disconnect();
        gain.disconnect();
      }, (delay + dur + 0.1) * 1000);
    };

    // Somber descending minor progression
    const tempo = 0.18;
    playNote(220.00, 0 * tempo, 0.25); // A3
    playNote(207.65, 1 * tempo, 0.25); // G#3
    playNote(196.00, 2 * tempo, 0.25); // G3
    playNote(174.61, 3 * tempo, 0.6);  // F3 (Melancholy resolution)
  }
}

export const audio = new SoundSynth();
