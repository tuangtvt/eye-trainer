// plugins/gap-saccade.js — Bài "Phản Xạ": saccade với gap period

var jsPsychGapSaccade = (function () {

  class GapSaccadePlugin {
    constructor(jsPsych) { this.jsPsych = jsPsych; }

    static get info() {
      return {
        name: 'gap-saccade',
        parameters: {
          targetSize:  { default: 48 },
          gapMs:       { default: 200 },
          timeoutMs:   { default: 2500 },
          trialNumber: { default: 0 },
          totalTrials: { default: 10 },
        }
      };
    }

    trial(display_element, trial) {
      display_element.innerHTML = `
        <div id="hud">
          <span class="hud-level">⚡ Phản Xạ</span>
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
      let phase = 'fixation';
      let phaseStart = performance.now();
      let pulsePhase = 0;
      let targetPos = null;
      let hitPos = null;
      let isHit = false;
      let responseTime = null;
      let targetAppearTime = null;
      let feedbackProgress = 0;
      // Hướng ngang (trái/phải) ưu tiên vì JS khó saccade ngang nhất
      const preferHorizontal = Math.random() > 0.35;

      const genTarget = () => {
        const margin = 80;
        if (preferHorizontal) {
          // Chọn trái hoặc phải
          const side = Math.random() > 0.5 ? 1 : -1;
          return {
            x: canvas.width / 2 + side * (canvas.width * 0.3 + Math.random() * canvas.width * 0.1),
            y: canvas.height / 2 + (Math.random() - 0.5) * canvas.height * 0.3,
          };
        }
        return Adaptive.randomTargetPosition(canvas.width, canvas.height, margin);
      };

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
          horizontal: preferHorizontal,
          trial_number: trial.trialNumber,
        });
      };

      const onInput = (x, y) => {
        if (phase !== 'target') return;
        Sounds.tap();
        const dist = Math.hypot(x - targetPos.x, y - targetPos.y);
        responseTime = performance.now() - targetAppearTime;
        isHit = dist < (trial.targetSize + 20);
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

      // Fixation duration: 700–1100ms (jitter)
      const fixDuration = 700 + Math.floor(Math.random() * 400);

      const render = (now) => {
        rafId = requestAnimationFrame(render);
        const elapsed = now - phaseStart;
        pulsePhase += 0.08;

        Draw.clear(ctx, canvas);
        Draw.starfield(ctx, canvas, stars);

        if (phase === 'fixation') {
          // Fixation cross rõ
          Draw.fixationCross(ctx, canvas.width / 2, canvas.height / 2, 22, '#FFFFFF');

          // Label hướng hint (tùy chọn giảm tải nhận thức)
          if (preferHorizontal) {
            ctx.save();
            ctx.fillStyle = 'rgba(79,195,247,0.25)';
            ctx.font = `bold ${Math.round(canvas.width * 0.05)}px Arial`;
            ctx.textAlign = 'center';
            ctx.fillText('← →', canvas.width / 2, canvas.height / 2 + 60);
            ctx.restore();
          }

          if (elapsed > fixDuration) {
            phase = trial.gapMs > 0 ? 'gap' : 'target_appear';
            if (phase === 'target_appear') {
              targetPos = genTarget();
              targetAppearTime = performance.now();
              phase = 'target';
            }
            phaseStart = now;
          }

        } else if (phase === 'gap') {
          // Màn tối hoàn toàn — không có fixation
          // Chỉ có stars nền
          if (elapsed > trial.gapMs) {
            targetPos = genTarget();
            targetAppearTime = performance.now();
            phase = 'target';
            phaseStart = now;
          }

        } else if (phase === 'target') {
          // Target sáng — màu xanh để phân biệt với saccade thường
          Draw.target(ctx, targetPos.x, targetPos.y, trial.targetSize, '#00D4AA', pulsePhase);

          // Countdown bar dưới (timeout visual)
          const timeoutProgress = 1 - elapsed / trial.timeoutMs;
          ctx.save();
          ctx.fillStyle = timeoutProgress > 0.3 ? 'rgba(0,212,170,0.5)' : 'rgba(244,67,54,0.5)';
          const barW = canvas.width * 0.5 * timeoutProgress;
          ctx.fillRect((canvas.width - canvas.width * 0.5) / 2, canvas.height - 30, barW, 6);
          ctx.restore();

          if (elapsed > trial.timeoutMs) {
            isHit = false; hitPos = null; responseTime = null;
            phase = 'feedback'; phaseStart = now;
          }

        } else if (phase === 'feedback') {
          feedbackProgress = Math.min(elapsed / 500, 1);

          Draw.target(ctx, targetPos.x, targetPos.y, trial.targetSize,
            isHit ? '#4CAF50' : '#F44336', pulsePhase);

          if (hitPos && isHit) {
            Draw.hitEffect(ctx, hitPos.x, hitPos.y, feedbackProgress);
            // RT badge
            if (responseTime) {
              ctx.save();
              ctx.fillStyle = '#4CAF50';
              ctx.font = `bold ${Math.round(canvas.width * 0.06)}px Arial`;
              ctx.textAlign = 'center';
              ctx.fillText(`${Math.round(responseTime)}ms`, canvas.width / 2, 100);
              ctx.restore();
            }
          } else if (targetPos) {
            Draw.missEffect(ctx, targetPos.x, targetPos.y, feedbackProgress);
          }

          if (feedbackProgress >= 1) endTrial();
        }
      };

      rafId = requestAnimationFrame(render);
    }
  }

  return GapSaccadePlugin;
})();
