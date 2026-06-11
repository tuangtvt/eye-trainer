// engine/draw.js — Canvas drawing utilities

const Draw = {

  // Xoá canvas
  clear(ctx, canvas, bgColor = '#0a0e1a') {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  },

  // Dấu thập fixation trung tâm
  fixationCross(ctx, x, y, size = 20, color = '#FFFFFF', alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - size, y); ctx.lineTo(x + size, y);
    ctx.moveTo(x, y - size); ctx.lineTo(x, y + size);
    ctx.stroke();
    ctx.restore();
  },

  // Target tròn có pulse animation
  target(ctx, x, y, radius, color = '#FFD700', pulsePhase = 0) {
    const pulse = 1 + 0.08 * Math.sin(pulsePhase);
    const r = radius * pulse;

    // Vầng sáng ngoài
    const glow = ctx.createRadialGradient(x, y, r * 0.3, x, y, r * 1.8);
    glow.addColorStop(0, color + '60');
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, r * 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Vòng ngoài
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();

    // Nhân trong
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.45, 0, Math.PI * 2);
    ctx.fill();
  },

  // Nhân vật cá SVG-style trên canvas
  fish(ctx, x, y, size = 40, direction = 1, color = '#4FC3F7') {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(direction, 1); // 1 = phải, -1 = trái

    // Thân cá
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(0, 0, size, size * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();

    // Đuôi
    ctx.beginPath();
    ctx.moveTo(-size * 0.8, 0);
    ctx.lineTo(-size * 1.4, -size * 0.5);
    ctx.lineTo(-size * 1.4, size * 0.5);
    ctx.closePath();
    ctx.fill();

    // Vây trên
    ctx.fillStyle = color + 'CC';
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.5);
    ctx.quadraticCurveTo(size * 0.3, -size * 0.9, size * 0.5, -size * 0.5);
    ctx.closePath();
    ctx.fill();

    // Mắt
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(size * 0.5, -size * 0.1, size * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.arc(size * 0.55, -size * 0.1, size * 0.1, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  },

  // Feedback hit: vòng nổ xanh lá
  hitEffect(ctx, x, y, progress) { // progress: 0→1
    const r = 40 + progress * 60;
    const alpha = 1 - progress;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = '#4CAF50';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  },

  // Feedback miss: X đỏ
  missEffect(ctx, x, y, progress) {
    const alpha = 1 - progress;
    const size = 25;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = '#F44336';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - size, y - size); ctx.lineTo(x + size, y + size);
    ctx.moveTo(x + size, y - size); ctx.lineTo(x - size, y + size);
    ctx.stroke();
    ctx.restore();
  },

  // Thanh tiến trình fixation
  fixationBar(ctx, canvas, progress, color = '#FFD700') {
    const w = canvas.width * 0.6;
    const h = 14;
    const x = (canvas.width - w) / 2;
    const y = canvas.height - 60;

    // Nền
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 7);
    ctx.fill();

    // Fill
    if (progress > 0) {
      const grad = ctx.createLinearGradient(x, 0, x + w, 0);
      grad.addColorStop(0, '#FFD700');
      grad.addColorStop(1, '#00D4AA');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, y, w * progress, h, 7);
      ctx.fill();
    }
  },

  // Sao nhỏ ngẫu nhiên trên nền
  starfield(ctx, canvas, stars) {
    stars.forEach(s => {
      ctx.fillStyle = `rgba(255,255,255,${s.alpha})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    });
  },

  // Text lớn trung tâm (điểm, đếm ngược)
  centerText(ctx, canvas, text, color = '#FFD700', size = 80) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.font = `900 ${size}px 'Segoe UI', Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    ctx.restore();
  },

  // Nhân vật mặt thú (cho fixation)
  animalFace(ctx, x, y, size, frame = 0) {
    // Mặt
    ctx.fillStyle = '#FF9800';
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();

    // Tai
    ctx.fillStyle = '#FF9800';
    [[-0.7, -0.8], [0.7, -0.8]].forEach(([dx, dy]) => {
      ctx.beginPath();
      ctx.arc(x + dx * size, y + dy * size, size * 0.35, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = '#FFCCBC';
    [[-0.7, -0.8], [0.7, -0.8]].forEach(([dx, dy]) => {
      ctx.beginPath();
      ctx.arc(x + dx * size, y + dy * size, size * 0.2, 0, Math.PI * 2);
      ctx.fill();
    });

    // Mắt (chớp theo frame)
    const eyeH = (frame % 120 < 5) ? size * 0.05 : size * 0.18;
    ctx.fillStyle = '#3E2723';
    [[-0.32, -0.15], [0.32, -0.15]].forEach(([dx, dy]) => {
      ctx.beginPath();
      ctx.ellipse(x + dx * size, y + dy * size, size * 0.15, eyeH, 0, 0, Math.PI * 2);
      ctx.fill();
    });

    // Highlight mắt
    ctx.fillStyle = '#FFFFFF';
    [[-0.26, -0.2], [0.38, -0.2]].forEach(([dx, dy]) => {
      ctx.beginPath();
      ctx.arc(x + dx * size, y + dy * size, size * 0.05, 0, Math.PI * 2);
      ctx.fill();
    });

    // Mũi
    ctx.fillStyle = '#BF360C';
    ctx.beginPath();
    ctx.ellipse(x, y + size * 0.12, size * 0.12, size * 0.09, 0, 0, Math.PI * 2);
    ctx.fill();

    // Miệng cười
    ctx.strokeStyle = '#3E2723';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(x, y + size * 0.2, size * 0.22, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();
  }
};
