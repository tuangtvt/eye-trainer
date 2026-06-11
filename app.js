// app.js — Controller chính, điều phối màn hình và jsPsych

const App = {
  currentExercise: null,
  jsPsychInstance: null,

  init() {
    this._bindCards();
    this._bindButtons();
    this._bindSound();
    this._bindWebGazer();
  },

  _bindCards() {
    document.querySelectorAll('.card').forEach(card => {
      card.addEventListener('click', () => {
        this.startExercise(card.dataset.exercise);
      });
    });
  },

  _bindButtons() {
    document.getElementById('btn-dashboard').addEventListener('click', () => {
      window.location.href = 'dashboard/report.html';
    });
    document.getElementById('btn-play-again').addEventListener('click', () => {
      this.startExercise(this.currentExercise);
    });
    document.getElementById('btn-home').addEventListener('click', () => {
      this.showScreen('welcome-screen');
    });
  },

  _bindSound() {
    const checkbox = document.getElementById('enable-sound');
    checkbox.checked = Sounds.init();
    checkbox.addEventListener('change', (e) => {
      Sounds.setEnabled(e.target.checked);
      if (e.target.checked) Sounds.tap();
    });
  },

  _bindWebGazer() {
    document.getElementById('enable-webgazer').addEventListener('change', async (e) => {
      if (e.target.checked) {
        const ok = await GazeTracker.init();
        if (!ok) {
          e.target.checked = false;
          alert('Không thể khởi động camera. Vui lòng kiểm tra quyền truy cập.');
        }
      } else {
        GazeTracker.stop();
      }
    });
  },

  showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
  },

  async startExercise(type) {
    this.currentExercise = type;
    this.showScreen('exercise-screen');

    // Đếm ngược 3-2-1
    await this._countdown();

    const level = Sessions.getLevel(type);
    const config = Adaptive.getConfig(type, level);
    const timeline = this._buildTimeline(type, config);

    // Khởi tạo jsPsych mới cho mỗi session
    const container = document.getElementById('jspsych-container');
    container.innerHTML = '';

    this.jsPsychInstance = initJsPsych({
      display_element: 'jspsych-container',
      on_finish: (data) => {
        this._onExerciseFinish(type, data, level, config);
      },
    });

    // Đăng ký plugins
    this.jsPsychInstance.pluginAPI;
    const plugins = {
      'saccade-task':  jsPsychSaccadeTask,
      'pursuit-task':  jsPsychPursuitTask,
      'fixation-hold': jsPsychFixationHold,
      'gap-saccade':   jsPsychGapSaccade,
    };

    // Chèn nút thoát
    const exitBtn = document.createElement('button');
    exitBtn.id = 'btn-exit-exercise';
    exitBtn.textContent = '✕';
    exitBtn.addEventListener('click', () => {
      if (this.jsPsychInstance) {
        this.jsPsychInstance.endCurrentTimeline();
      }
      this.showScreen('welcome-screen');
    });
    container.appendChild(exitBtn);

    this.jsPsychInstance.run(timeline);
  },

  _buildTimeline(type, config) {
    const cfg = Adaptive.configs[type];
    const n = cfg.trialsPerBlock;

    const trialBase = {
      saccade: () => Array.from({ length: n }, (_, i) => ({
        type: jsPsychSaccadeTask,
        targetSize:  config.targetSize,
        gapMs:       config.gapMs || 0,
        timeoutMs:   3000,
        trialNumber: i,
        totalTrials: n,
      })),

      pursuit: () => [{
        type: jsPsychPursuitTask,
        speed:         config.speed,
        pathAmplitude: config.pathAmplitude,
        durationMs:    14000,
        trialNumber:   0,
        totalTrials:   1,
      }],

      fixation: () => Array.from({ length: n }, (_, i) => ({
        type: jsPsychFixationHold,
        holdMs:      config.holdMs,
        distractors: config.distractors || 0,
        trialNumber: i,
        totalTrials: n,
      })),

      gap: () => Array.from({ length: n }, (_, i) => ({
        type: jsPsychGapSaccade,
        targetSize:  config.targetSize,
        gapMs:       config.gapMs || 0,
        timeoutMs:   2500,
        trialNumber: i,
        totalTrials: n,
      })),
    };

    return trialBase[type]();
  },

  _onExerciseFinish(type, data, level, config) {
    // Lấy trial results
    const trials = data.trials || data.values?.() || [];
    const results = trials.map(t => ({
      hit: t.hit ?? false,
      rt:  t.rt  ?? null,
      accuracy: t.accuracy ?? null,
    }));

    // Adaptive
    const newLevel = Adaptive.evaluate(type, level, results);
    Sessions.saveLevel(type, newLevel);

    // Lưu session
    const session = Sessions.save(type, results, level);

    // Hiển thị kết quả
    this._showResult(session, level, newLevel, type);
  },

  _showResult(session, oldLevel, newLevel, type) {
    this.showScreen('result-screen');

    const acc = parseFloat(session.accuracy);
    const stars = session.starsEarned;

    // Trophy
    const trophy = document.getElementById('result-trophy');
    trophy.textContent = stars === 3 ? '🏆' : stars === 2 ? '🥈' : stars === 1 ? '🥉' : '💪';

    // Title
    const title = document.getElementById('result-title');
    if (acc >= 85)       title.textContent = 'Tuyệt vời! 🎉';
    else if (acc >= 60)  title.textContent = 'Tốt lắm! 👍';
    else if (acc >= 35)  title.textContent = 'Cố lên nào! 💪';
    else                 title.textContent = 'Thử lại nhé! 🔄';

    // Stats
    const statsEl = document.getElementById('result-stats');
    const rtText = session.meanRT ? `${session.meanRT}ms` : '--';
    statsEl.innerHTML = `
      <div class="stat-item">
        <div class="stat-value">${session.accuracy}%</div>
        <div class="stat-label">Độ chính xác</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">${rtText}</div>
        <div class="stat-label">Thời gian p/xạ</div>
      </div>
    `;

    // Stars
    const starsEl = document.getElementById('stars-earned');
    starsEl.textContent = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);

    // Level change notification
    if (newLevel > oldLevel) {
      const notice = document.createElement('div');
      notice.style.cssText = 'color:#00D4AA;font-weight:700;font-size:14px;';
      notice.textContent = '🆙 Lên level mới!';
      starsEl.after(notice);
    } else if (newLevel < oldLevel) {
      const notice = document.createElement('div');
      notice.style.cssText = 'color:#FF9800;font-weight:700;font-size:14px;';
      notice.textContent = '📉 Giảm độ khó một chút';
      starsEl.after(notice);
    }
  },

  _countdown() {
    return new Promise(resolve => {
      const overlay = document.createElement('div');
      overlay.id = 'countdown-overlay';
      document.body.appendChild(overlay);

      let count = 3;
      overlay.textContent = count;

      const interval = setInterval(() => {
        count--;
        if (count <= 0) {
          clearInterval(interval);
          overlay.remove();
          resolve();
        } else {
          overlay.textContent = count;
        }
      }, 800);
    });
  }
};

// Khởi động
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
