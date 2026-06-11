// data/sessions.js — Lưu trữ session qua localStorage

const Sessions = {
  KEY: 'joubert_sessions',
  LEVEL_KEY: 'joubert_levels',

  // Lưu kết quả một session
  save(exerciseType, results, level) {
    const all = this.loadAll();
    const session = {
      id: Date.now(),
      date: new Date().toISOString(),
      exercise: exerciseType,
      level,
      totalTrials: results.length,
      hits: results.filter(r => r.hit).length,
      accuracy: results.length
        ? (results.filter(r => r.hit).length / results.length * 100).toFixed(1)
        : 0,
      meanRT: results.length
        ? Math.round(results.filter(r => r.rt).reduce((s, r) => s + r.rt, 0) / results.filter(r => r.rt).length)
        : null,
      starsEarned: this._calcStars(results),
      rawData: results,
    };
    all.push(session);
    try {
      localStorage.setItem(this.KEY, JSON.stringify(all));
    } catch(e) {
      // localStorage đầy — xoá session cũ nhất
      all.shift();
      localStorage.setItem(this.KEY, JSON.stringify(all));
    }
    return session;
  },

  loadAll() {
    try {
      return JSON.parse(localStorage.getItem(this.KEY) || '[]');
    } catch { return []; }
  },

  _toDateKey(isoString) {
    const d = new Date(isoString);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  },

  _todayKey() {
    return this._toDateKey(new Date().toISOString());
  },

  formatDateKey(dateKey) {
    const [y, m, d] = dateKey.split('-');
    return `${d}/${m}/${y}`;
  },

  getSessionsForDate(dateKey) {
    return this.loadAll().filter(s => this._toDateKey(s.date) === dateKey);
  },

  /** Các ngày có dữ liệu, mới nhất trước */
  getAvailableDates() {
    const keys = new Set(this.loadAll().map(s => this._toDateKey(s.date)));
    return [...keys].sort((a, b) => b.localeCompare(a));
  },

  /** Tóm tắt từng ngày: [{ date, sessions, stars, avgAccuracy }] */
  getDailyOverview(limit = 14) {
    const byDate = {};
    this.loadAll().forEach(s => {
      const key = this._toDateKey(s.date);
      if (!byDate[key]) byDate[key] = { date: key, sessions: 0, stars: 0, accuracySum: 0 };
      byDate[key].sessions++;
      byDate[key].stars += s.starsEarned;
      byDate[key].accuracySum += parseFloat(s.accuracy);
    });
    return Object.values(byDate)
      .map(d => ({
        date: d.date,
        sessions: d.sessions,
        stars: d.stars,
        avgAccuracy: (d.accuracySum / d.sessions).toFixed(1),
      }))
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, limit);
  },

  // Level hiện tại cho từng exercise
  saveLevel(exerciseType, level) {
    const levels = this.loadLevels();
    levels[exerciseType] = level;
    localStorage.setItem(this.LEVEL_KEY, JSON.stringify(levels));
  },

  loadLevels() {
    try {
      return JSON.parse(localStorage.getItem(this.LEVEL_KEY) || '{}');
    } catch { return {}; }
  },

  getLevel(exerciseType) {
    return this.loadLevels()[exerciseType] ?? 0;
  },

  // Thống kê tổng hợp (dateKey = null → toàn bộ, 'YYYY-MM-DD' → theo ngày)
  getSummary(dateKey = null) {
    const all = dateKey ? this.getSessionsForDate(dateKey) : this.loadAll();
    const summary = {};
    ['saccade', 'pursuit', 'fixation', 'gap'].forEach(ex => {
      const sessions = all.filter(s => s.exercise === ex);
      const accuracyValues = sessions.map(s => parseFloat(s.accuracy));
      summary[ex] = {
        totalSessions: sessions.length,
        totalStars: sessions.reduce((s, r) => s + r.starsEarned, 0),
        lastAccuracy: sessions.length ? sessions[sessions.length - 1].accuracy : null,
        avgAccuracy: accuracyValues.length
          ? (accuracyValues.reduce((s, v) => s + v, 0) / accuracyValues.length).toFixed(1)
          : null,
        trend: this._trend(sessions),
        currentLevel: this.getLevel(ex),
      };
    });
    return summary;
  },

  // Trend: mảng accuracy 7 session gần nhất
  _trend(sessions) {
    return sessions.slice(-7).map(s => parseFloat(s.accuracy));
  },

  _calcStars(results) {
    if (!results.length) return 0;
    const acc = results.filter(r => r.hit).length / results.length;
    if (acc >= 0.85) return 3;
    if (acc >= 0.60) return 2;
    if (acc >= 0.35) return 1;
    return 0;
  },

  // Export JSON để chia sẻ với bác sĩ
  exportJSON(dateKey = null) {
    const sessions = dateKey ? this.getSessionsForDate(dateKey) : this.loadAll();
    const data = {
      exportDate: new Date().toISOString(),
      filterDate: dateKey,
      sessions,
      summary: this.getSummary(dateKey),
      dailyOverview: this.getDailyOverview(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `luyen-mat-${new Date().toLocaleDateString('vi-VN').replace(/\//g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  clearAll() {
    localStorage.removeItem(this.KEY);
    localStorage.removeItem(this.LEVEL_KEY);
  }
};
