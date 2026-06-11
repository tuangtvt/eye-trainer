// plugins/fixation-hold.js — Bài "Nhìn Chằm": giữ ngón tay + nhìn vào mặt thú

var jsPsychFixationHold = (function () {

  class FixationHoldPlugin {
    constructor(jsPsych) { this.jsPsych = jsPsych; }

    static get info() {
      return {
        name: 'fixation-hold',
        parameters: {
          holdMs:      { default: 3000 },
          distractors: { default: 0 },
          trialNumber: { default: 0 },
          totalTrials: { default: 5 },
        }
      };
    }

    trial(display_element, trial) {
      display_element.innerHTML = `
        <div id="hud">
          <span class="hud-level">👀 Nhìn Chằm</span>
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
      const CX = canvas.width / 2;
      const CY = canvas.height / 2;
      const FACE_SIZE = Math.min(canvas.width, canvas.height) * 0.14;
      const TOUCH_RADIUS = FACE_SIZE * 1.4;

      let rafId;
      let frame = 0;
      let holding = false;
      let holdStart = null;
      let holdTotal = 0;
      let completed = false;
      let resultShown = false;
      let resultStart = null;

      // Distractors: vị trí cố định, di chuyển nhẹ
      const distractorList = Array.from({ length: trial.distractors }, (_, i) => {
        const angle = (i / trial.distractors) * Math.PI * 2;
        const dist = Math.min(canvas.width, canvas.height) * 0.35;
        return {
          x: CX + dist * Math.cos(angle),
          y: CY + dist * Math.sin(angle),
          phase: Math.random() * Math.PI * 2,
          color: ['#FF6B9D', '#00D4AA', '#FF9800'][i % 3],
        };
      });

      const onTouch = (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        const dx = touch.clientX - rect.left - CX;
        const dy = touch.clientY - rect.top  - CY;
        if (Math.hypot(dx, dy) < TOUCH_RADIUS) {
          if (!holding) {
            holding = true;
            holdStart = performance.now();
            Sounds.tap();
            Sounds.holdStart();
          }
        }
      };

      const onTouchEnd = () => { holding = false; };

      const onMouse = (e) => {
        const rect = canvas.getBoundingClientRect();
        const dx = e.clientX - rect.left - CX;
        const dy = e.clientY - rect.top  - CY;
        if (e.buttons > 0 && Math.hypot(dx, dy) < TOUCH_RADIUS) {
          if (!holding) {
            holding = true;
            holdStart = performance.now();
            Sounds.tap();
            Sounds.holdStart();
          }
        } else {
          holding = false;
        }
      };

      canvas.addEventListener('touchstart', onTouch, { passive: false });
      canvas.addEventListener('touchend',   onTouchEnd);
      canvas.addEventListener('mousemove',  onMouse);
      canvas.addEventListener('mousedown',  onMouse);
      canvas.addEventListener('mouseup',    onTouchEnd);

      const endTrial = (success) => {
        cancelAnimationFrame(rafId);
        canvas.removeEventListener('touchstart', onTouch);
        canvas.removeEventListener('touchend', onTouchEnd);
        canvas.removeEventListener('mousemove', onMouse);
        this.jsPsych.finishTrial({
          hit: success,
          holdAchievedMs: Math.round(holdTotal),
          holdRequiredMs: trial.holdMs,
          rt: null,
          trial_number: trial.trialNumber,
        });
      };

      const render = (now) => {
        rafId = requestAnimationFrame(render);
        frame++;

        if (holding && holdStart) {
          holdTotal = now - holdStart;
        }
        if (holdTotal >= trial.holdMs && !completed) {
          completed = true;
          Sounds.holdComplete();
        }

        // Nếu đã xong, chờ 800ms rồi kết thúc
        if (completed && !resultShown) {
          resultShown = true;
          resultStart = now;
        }
        if (resultShown && (now - resultStart) > 800) {
          endTrial(true);
          return;
        }

        Draw.clear(ctx, canvas);
        Draw.starfield(ctx, canvas, stars);

        // Distractors nhấp nháy
        distractorList.forEach(d => {
          const pulse = 1 + 0.15 * Math.sin(now * 0.003 + d.phase);
          ctx.save();
          ctx.globalAlpha = 0.7;
          Draw.target(ctx, d.x, d.y, 22 * pulse, d.color, now * 0.06);
          ctx.restore();
        });

        // Ring tiến trình
        const progress = Math.min(holdTotal / trial.holdMs, 1);
        if (progress > 0) {
          ctx.save();
          ctx.strokeStyle = completed ? '#4CAF50' : '#FFD700';
          ctx.lineWidth = 8;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.arc(CX, CY, FACE_SIZE + 18, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        // Vòng chạm
        ctx.save();
        ctx.strokeStyle = holding
          ? (completed ? '#4CAF50' : 'rgba(255,215,0,0.4)')
          : 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 8]);
        ctx.beginPath();
        ctx.arc(CX, CY, TOUCH_RADIUS, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // Mặt thú
        Draw.animalFace(ctx, CX, CY, FACE_SIZE, frame);

        // Instruction
        if (!holding && !completed) {
          ctx.save();
          ctx.fillStyle = 'rgba(255,255,255,0.5)';
          ctx.font = `bold ${Math.round(canvas.width * 0.04)}px 'Segoe UI', Arial`;
          ctx.textAlign = 'center';
          ctx.fillText('Chạm và nhìn vào đây!', CX, CY + FACE_SIZE + 55);
          ctx.restore();
        }

        // Thanh tiến trình dưới
        Draw.fixationBar(ctx, canvas, progress);

        // Score
        const scoreEl = document.getElementById('hud-score');
        if (scoreEl) {
          const pct = Math.round(progress * 100);
          scoreEl.textContent = `★ ${pct}%`;
        }
      };

      rafId = requestAnimationFrame(render);
    }
  }

  return FixationHoldPlugin;
})();
