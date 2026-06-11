// plugins/saccade-task.js — Bài "Bắt Sao": tap vào target xuất hiện

var jsPsychSaccadeTask = (function () {

  class SaccadeTaskPlugin {
    constructor(jsPsych) { this.jsPsych = jsPsych; }

    static get info() {
      return {
        name: 'saccade-task',
        parameters: {
          targetSize:  { type: jsPsych.ParameterType?.INT    ?? 'INT',    default: 45 },
          gapMs:       { type: jsPsych.ParameterType?.INT    ?? 'INT',    default: 0  },
          timeoutMs:   { type: jsPsych.ParameterType?.INT    ?? 'INT',    default: 3000 },
          trialNumber: { type: jsPsych.ParameterType?.INT    ?? 'INT',    default: 0  },
          totalTrials: { type: jsPsych.ParameterType?.INT    ?? 'INT',    default: 8  },
        }
      };
    }

    trial(display_element, trial) {
      // ── Setup canvas ──
      display_element.innerHTML = `
        <div id="hud">
          <span class="hud-level" id="hud-exercise">🎯 Bắt Sao</span>
          <span class="hud-stars" id="hud-score">★ 0</span>
          <span class="hud-timer" id="hud-progress">${trial.trialNumber + 1}/${trial.totalTrials}</span>
        </div>
        <canvas id="ex-canvas" class="exercise-canvas"></canvas>
      `;

      const canvas = document.getElementById('ex-canvas');
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const ctx = canvas.getContext('2d');

      const stars = Adaptive.initStars(canvas.width, canvas.height);
      let rafId;
      let phase = 'fixation'; // fixation → gap → target → feedback → done
      let phaseStart = performance.now();
      let targetPos = null;
      let pulsePhase = 0;
      let hitPos = null;
      let isHit = false;
      let responseTime = null;
      let targetAppearTime = null;
      let feedbackProgress = 0;

      GazeTracker.setTrial(trial.trialNumber);

      const endTrial = () => {
        cancelAnimationFrame(rafId);
        canvas.removeEventListener('touchstart', onTouch);
        canvas.removeEventListener('mousedown', onMouse);
        this.jsPsych.finishTrial({
          rt: responseTime,
          hit: isHit,
          target_x: targetPos?.x,
          target_y: targetPos?.y,
          touch_x: hitPos?.x,
          touch_y: hitPos?.y,
          trial_number: trial.trialNumber,
        });
      };

      const onInput = (x, y) => {
        if (phase !== 'target') return;
        Sounds.tap();
        const dist = Math.hypot(x - targetPos.x, y - targetPos.y);
        responseTime = performance.now() - targetAppearTime;
        isHit = dist < (trial.targetSize + 20); // hit area lớn hơn visual
        hitPos = { x, y };
        if (isHit) Sounds.hit();
        else Sounds.miss();
        phase = 'feedback';
        phaseStart = performance.now();
      };

      const onTouch = (e) => {
        e.preventDefault();
        const t = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        onInput(t.clientX - rect.left, t.clientY - rect.top);
      };

      const onMouse = (e) => {
        const rect = canvas.getBoundingClientRect();
        onInput(e.clientX - rect.left, e.clientY - rect.top);
      };

      canvas.addEventListener('touchstart', onTouch, { passive: false });
      canvas.addEventListener('mousedown', onMouse);

      const render = (now) => {
        rafId = requestAnimationFrame(render);
        const elapsed = now - phaseStart;
        pulsePhase += 0.08;

        Draw.clear(ctx, canvas);
        Draw.starfield(ctx, canvas, stars);

        // ── State machine ──
        if (phase === 'fixation') {
          Draw.fixationCross(ctx, canvas.width / 2, canvas.height / 2);
          if (elapsed > 600 + Math.random() * 0) { // jitter đã tính ở ngoài
            if (trial.gapMs > 0) {
              phase = 'gap';
            } else {
              targetPos = Adaptive.randomTargetPosition(canvas.width, canvas.height);
              targetAppearTime = performance.now();
              phase = 'target';
            }
            phaseStart = now;
          }

        } else if (phase === 'gap') {
          // Màn trống — không fixation, không target
          if (elapsed > trial.gapMs) {
            targetPos = Adaptive.randomTargetPosition(canvas.width, canvas.height);
            targetAppearTime = performance.now();
            phase = 'target';
            phaseStart = now;
          }

        } else if (phase === 'target') {
          Draw.target(ctx, targetPos.x, targetPos.y, trial.targetSize, '#FFD700', pulsePhase);

          // Timeout
          if (elapsed > trial.timeoutMs) {
            isHit = false;
            hitPos = null;
            responseTime = null;
            phase = 'feedback';
            phaseStart = now;
          }

        } else if (phase === 'feedback') {
          feedbackProgress = Math.min(elapsed / 500, 1);

          // Hiển thị target mờ dần
          if (targetPos) {
            Draw.target(ctx, targetPos.x, targetPos.y, trial.targetSize,
              isHit ? '#4CAF50' : '#F44336', pulsePhase);
          }

          // Effect
          if (hitPos && isHit) {
            Draw.hitEffect(ctx, hitPos.x, hitPos.y, feedbackProgress);
          } else if (targetPos && !isHit) {
            Draw.missEffect(ctx, targetPos.x, targetPos.y, feedbackProgress);
          }

          if (feedbackProgress >= 1) endTrial();
        }
      };

      // Jitter fixation duration một lần
      setTimeout(() => {
        rafId = requestAnimationFrame(render);
      }, Math.random() * 300);
      rafId = requestAnimationFrame(render);
    }
  }

  return SaccadeTaskPlugin;
})();
