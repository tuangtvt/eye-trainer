// plugins/pursuit-task.js — Bài "Theo Cá": giữ ngón tay theo chú cá

var jsPsychPursuitTask = (function () {

  class PursuitTaskPlugin {
    constructor(jsPsych) { this.jsPsych = jsPsych; }

    static get info() {
      return {
        name: 'pursuit-task',
        parameters: {
          speed:         { default: 0.4  },
          pathAmplitude: { default: 0.35 },
          durationMs:    { default: 15000 },
          trialNumber:   { default: 0 },
          totalTrials:   { default: 1 },
        }
      };
    }

    trial(display_element, trial) {
      display_element.innerHTML = `
        <div id="hud">
          <span class="hud-level">🐠 Theo Cá</span>
          <span class="hud-stars" id="hud-score">★ 0</span>
          <span class="hud-timer" id="hud-timer">15s</span>
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
      const AMP_X = canvas.width  * trial.pathAmplitude;
      const AMP_Y = canvas.height * trial.pathAmplitude * 0.7;

      let rafId;
      let t = 0;                    // tham số đường Lissajous
      let touchPos = null;          // vị trí ngón tay hiện tại
      let wasOnTarget = false;
      let onTargetFrames = 0;
      let totalFrames = 0;
      let startTime = null;
      const hitRadius = 70;         // vùng "đang theo" tính được

      // Lissajous path
      const fishPos = (t) => ({
        x: CX + AMP_X * Math.sin(1.0 * t + Math.PI / 4),
        y: CY + AMP_Y * Math.sin(1.8 * t),
      });

      const onTouch = (e) => {
        e.preventDefault();
        Sounds.tap();
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        touchPos = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
      };

      const onTouchEnd = () => {
        if (wasOnTarget) Sounds.catchOff();
        wasOnTarget = false;
        touchPos = null;
      };
      const onMouse    = (e) => {
        if (e.buttons === 0) {
          if (wasOnTarget) Sounds.catchOff();
          wasOnTarget = false;
          touchPos = null;
          return;
        }
        if (!touchPos) Sounds.tap();
        const rect = canvas.getBoundingClientRect();
        touchPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      };

      canvas.addEventListener('touchstart', onTouch, { passive: false });
      canvas.addEventListener('touchmove',  onTouch, { passive: false });
      canvas.addEventListener('touchend',   onTouchEnd);
      canvas.addEventListener('mousemove',  onMouse);
      canvas.addEventListener('mousedown',  onMouse);
      canvas.addEventListener('mouseup',    onTouchEnd);

      const endTrial = () => {
        cancelAnimationFrame(rafId);
        canvas.removeEventListener('touchstart', onTouch);
        canvas.removeEventListener('touchmove', onTouch);
        canvas.removeEventListener('touchend', onTouchEnd);
        const accuracy = totalFrames > 0
          ? (onTargetFrames / totalFrames * 100).toFixed(1)
          : 0;
        this.jsPsych.finishTrial({
          accuracy: parseFloat(accuracy),
          hit: parseFloat(accuracy) >= 50,
          rt: null,
          trial_number: trial.trialNumber,
        });
      };

      const render = (now) => {
        rafId = requestAnimationFrame(render);
        if (!startTime) startTime = now;

        const elapsed = now - startTime;
        const remaining = Math.max(0, trial.durationMs - elapsed);

        if (elapsed >= trial.durationMs) { endTrial(); return; }

        t += trial.speed * 0.012;
        totalFrames++;

        const fish = fishPos(t);
        const direction = Math.cos(t) > 0 ? 1 : -1;

        Draw.clear(ctx, canvas);
        Draw.starfield(ctx, canvas, stars);

        // Đường path mờ (gợi ý hướng đi)
        ctx.save();
        ctx.strokeStyle = 'rgba(79,195,247,0.1)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 10]);
        ctx.beginPath();
        for (let pt = t - 2; pt <= t + 4; pt += 0.05) {
          const p = fishPos(pt);
          pt === t - 2 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
        ctx.restore();

        // Dây nối ngón tay → cá
        if (touchPos) {
          const dist = Math.hypot(touchPos.x - fish.x, touchPos.y - fish.y);
          const isOn = dist < hitRadius;
          if (isOn && !wasOnTarget) Sounds.catchOn();
          else if (!isOn && wasOnTarget) Sounds.catchOff();
          wasOnTarget = isOn;
          if (isOn) onTargetFrames++;

          ctx.save();
          ctx.strokeStyle = isOn ? 'rgba(76,175,80,0.5)' : 'rgba(244,67,54,0.3)';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 6]);
          ctx.beginPath();
          ctx.moveTo(touchPos.x, touchPos.y);
          ctx.lineTo(fish.x, fish.y);
          ctx.stroke();
          ctx.restore();

          // Vòng ngón tay
          ctx.save();
          ctx.strokeStyle = isOn ? '#4CAF50' : '#FF9800';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(touchPos.x, touchPos.y, 28, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        Draw.fish(ctx, fish.x, fish.y, 36, direction);

        // Bọt khí nhỏ
        ctx.save();
        ctx.fillStyle = 'rgba(79,195,247,0.4)';
        for (let b = 1; b <= 3; b++) {
          const bx = fish.x - direction * (20 + b * 14) + Math.sin(t * 3 + b) * 8;
          const by = fish.y + Math.sin(t * 2 + b) * 6;
          ctx.beginPath();
          ctx.arc(bx, by, 3 - b * 0.6, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

        // HUD timer
        const timerEl = document.getElementById('hud-timer');
        if (timerEl) timerEl.textContent = Math.ceil(remaining / 1000) + 's';

        // Score %
        const scoreEl = document.getElementById('hud-score');
        if (scoreEl && totalFrames > 0) {
          const pct = Math.round(onTargetFrames / totalFrames * 100);
          scoreEl.textContent = `★ ${pct}%`;
        }
      };

      rafId = requestAnimationFrame(render);
    }
  }

  return PursuitTaskPlugin;
})();
