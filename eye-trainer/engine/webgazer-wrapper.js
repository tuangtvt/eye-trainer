// engine/webgazer-wrapper.js — Lớp bọc WebGazer, bật/tắt linh hoạt

const GazeTracker = {
  enabled: false,
  initialized: false,
  currentGaze: null,
  gazeLog: [],       // [{x, y, t, trial}]
  _currentTrial: 0,

  // Bật WebGazer với calibration tối giản
  async init() {
    if (!window.webgazer) {
      console.warn('WebGazer không khả dụng');
      return false;
    }
    try {
      await webgazer
        .setRegression('ridge')
        .setTracker('TFFacemesh')
        .begin();

      webgazer.showVideoPreview(true)
              .showPredictionPoints(false);

      webgazer.setGazeListener((data, ts) => {
        if (data) {
          this.currentGaze = { x: data.x, y: data.y, t: ts };
          this.gazeLog.push({ ...this.currentGaze, trial: this._currentTrial });
        }
      });

      this.initialized = true;
      this.enabled = true;
      console.log('WebGazer đã khởi động');
      return true;
    } catch (err) {
      console.warn('WebGazer lỗi:', err.message);
      return false;
    }
  },

  // Tạm dừng gaze listener
  pause() {
    if (this.initialized) webgazer.pause();
  },

  resume() {
    if (this.initialized) webgazer.resume();
  },

  stop() {
    if (this.initialized) {
      webgazer.end();
      this.initialized = false;
      this.enabled = false;
    }
  },

  setTrial(n) {
    this._currentTrial = n;
  },

  // Lấy log cho trial hiện tại
  getTrialGaze(trialN) {
    return this.gazeLog.filter(g => g.trial === trialN);
  },

  // Tính % thời gian nhìn vào vùng target (circle)
  gazeOnTargetPercent(trialN, targetX, targetY, radius = 120) {
    const log = this.getTrialGaze(trialN);
    if (!log.length) return null;
    const onTarget = log.filter(g =>
      Math.hypot(g.x - targetX, g.y - targetY) < radius
    ).length;
    return (onTarget / log.length * 100).toFixed(1);
  },

  clearLog() {
    this.gazeLog = [];
  }
};
