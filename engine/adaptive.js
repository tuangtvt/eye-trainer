// engine/adaptive.js — Logic tự điều chỉnh độ khó

const Adaptive = {

  // Config theo từng loại bài tập
  configs: {
    saccade: {
      levels: [
        { targetSize: 55, speed: null,  gapMs: 0,   label: 'Dễ' },
        { targetSize: 45, speed: null,  gapMs: 0,   label: 'Trung bình' },
        { targetSize: 38, speed: null,  gapMs: 200, label: 'Khó hơn' },
        { targetSize: 30, speed: null,  gapMs: 200, label: 'Thử thách' },
      ],
      trialsPerBlock: 8,
      upThreshold:   0.82, // acc > 82% → lên level
      downThreshold: 0.45, // acc < 45% → xuống level
    },
    pursuit: {
      levels: [
        { speed: 0.25, pathAmplitude: 0.30, label: 'Rất chậm' },
        { speed: 0.40, pathAmplitude: 0.35, label: 'Chậm' },
        { speed: 0.60, pathAmplitude: 0.40, label: 'Trung bình' },
        { speed: 0.85, pathAmplitude: 0.45, label: 'Nhanh hơn' },
      ],
      trialsPerBlock: 1, // 1 trial = 1 đoạn đường dài
      upThreshold:   0.75,
      downThreshold: 0.40,
    },
    fixation: {
      levels: [
        { holdMs: 2000, distractors: 0, label: 'Dễ' },
        { holdMs: 3500, distractors: 0, label: 'Trung bình' },
        { holdMs: 5000, distractors: 2, label: 'Khó' },
        { holdMs: 7000, distractors: 3, label: 'Thử thách' },
      ],
      trialsPerBlock: 5,
      upThreshold:   0.80,
      downThreshold: 0.40,
    },
    gap: {
      levels: [
        { gapMs: 0,   targetSize: 55, label: 'Không gap' },
        { gapMs: 150, targetSize: 50, label: 'Gap nhỏ' },
        { gapMs: 200, targetSize: 42, label: 'Gap chuẩn' },
        { gapMs: 250, targetSize: 36, label: 'Gap lớn' },
      ],
      trialsPerBlock: 10,
      upThreshold:   0.80,
      downThreshold: 0.45,
    }
  },

  // Lấy config level hiện tại
  getConfig(exerciseType, level) {
    const cfg = this.configs[exerciseType];
    const clampedLevel = Math.max(0, Math.min(level, cfg.levels.length - 1));
    return { ...cfg.levels[clampedLevel], level: clampedLevel };
  },

  // Tính level mới sau block
  evaluate(exerciseType, currentLevel, trialResults) {
    const cfg = this.configs[exerciseType];
    if (!trialResults.length) return currentLevel;

    const acc = trialResults.filter(r => r.hit).length / trialResults.length;
    const maxLevel = cfg.levels.length - 1;

    let newLevel = currentLevel;
    if (acc >= cfg.upThreshold && currentLevel < maxLevel) {
      newLevel = currentLevel + 1;
    } else if (acc < cfg.downThreshold && currentLevel > 0) {
      newLevel = currentLevel - 1;
    }

    return newLevel;
  },

  // Tạo vị trí target ngẫu nhiên — tránh trung tâm và rìa
  randomTargetPosition(canvasW, canvasH, margin = 80) {
    // Chia màn hình thành 4 vùng, chọn ngẫu nhiên để tránh cùng góc
    const zones = [
      { xMin: margin, xMax: canvasW / 2 - margin / 2,
        yMin: margin, yMax: canvasH / 2 - margin / 2 },
      { xMin: canvasW / 2 + margin / 2, xMax: canvasW - margin,
        yMin: margin, yMax: canvasH / 2 - margin / 2 },
      { xMin: margin, xMax: canvasW / 2 - margin / 2,
        yMin: canvasH / 2 + margin / 2, yMax: canvasH - margin },
      { xMin: canvasW / 2 + margin / 2, xMax: canvasW - margin,
        yMin: canvasH / 2 + margin / 2, yMax: canvasH - margin },
    ];
    const zone = zones[Math.floor(Math.random() * zones.length)];
    return {
      x: zone.xMin + Math.random() * (zone.xMax - zone.xMin),
      y: zone.yMin + Math.random() * (zone.yMax - zone.yMin),
    };
  },

  // Khởi tạo starfield nền
  initStars(canvasW, canvasH, count = 60) {
    return Array.from({ length: count }, () => ({
      x: Math.random() * canvasW,
      y: Math.random() * canvasH,
      r: Math.random() * 1.5 + 0.3,
      alpha: Math.random() * 0.5 + 0.1,
    }));
  },
};
