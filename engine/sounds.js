// engine/sounds.js — Hiệu ứng âm thanh cho điểm chạm (Web Audio API)

const Sounds = {
  STORAGE_KEY: 'joubert_sound_enabled',
  _ctx: null,
  _enabled: true,

  init() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored !== null) this._enabled = stored === 'true';
    } catch (_) {}
    return this._enabled;
  },

  isEnabled() {
    return this._enabled;
  },

  setEnabled(on) {
    this._enabled = on;
    try {
      localStorage.setItem(this.STORAGE_KEY, String(on));
    } catch (_) {}
  },

  _getCtx() {
    if (!this._ctx) {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this._ctx.state === 'suspended') {
      this._ctx.resume();
    }
    return this._ctx;
  },

  _playTone(freq, duration, opts = {}) {
    if (!this._enabled) return;
    const {
      type = 'sine',
      volume = 0.2,
      attack = 0.008,
      delay = 0,
    } = opts;

    try {
      const ctx = this._getCtx();
      const t0 = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(volume, t0 + attack);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + duration + 0.02);
    } catch (_) {}
  },

  /** Chạm màn hình — tiếng pop nhẹ */
  tap() {
    this._playTone(920, 0.05, { volume: 0.12, type: 'triangle' });
  },

  /** Trúng mục tiêu — chuỗi nốt vui */
  hit() {
    this._playTone(523, 0.1, { volume: 0.18, delay: 0 });
    this._playTone(659, 0.1, { volume: 0.16, delay: 0.07 });
    this._playTone(784, 0.14, { volume: 0.14, delay: 0.14 });
  },

  /** Trượt mục tiêu — tiếng thấp mềm */
  miss() {
    this._playTone(280, 0.12, { volume: 0.1, type: 'sine' });
    this._playTone(220, 0.16, { volume: 0.08, type: 'sine', delay: 0.06 });
  },

  /** Bắt đầu giữ chạm (Nhìn Chằm) */
  holdStart() {
    this._playTone(440, 0.09, { volume: 0.14, type: 'triangle' });
  },

  /** Hoàn thành giữ đủ thời gian */
  holdComplete() {
    this._playTone(587, 0.1, { volume: 0.16, delay: 0 });
    this._playTone(740, 0.1, { volume: 0.14, delay: 0.08 });
    this._playTone(880, 0.18, { volume: 0.12, delay: 0.16 });
  },

  /** Ngón tay bám được cá (Theo Cá) */
  catchOn() {
    this._playTone(660, 0.07, { volume: 0.1, type: 'triangle' });
  },

  /** Ngón tay rời khỏi vùng bám */
  catchOff() {
    this._playTone(330, 0.06, { volume: 0.06, type: 'sine' });
  },
};
