# Luyện Mắt Vui Vẻ — Prototype

Ứng dụng luyện tập mắt dành cho bệnh nhân Joubert syndrome, thiết kế cho bé 8 tuổi dùng màn hình cảm ứng.

## Cấu trúc dự án

```
joubert-eye-trainer/
├── index.html              ← Entry point, mở file này để dùng
├── style.css               ← Theme tối, màu sắc thân thiện
├── app.js                  ← Controller chính
│
├── plugins/                ← jsPsych plugins (1 file = 1 bài tập)
│   ├── saccade-task.js     ← 🎯 Bắt Sao: tap vào target xuất hiện
│   ├── pursuit-task.js     ← 🐠 Theo Cá: giữ ngón tay theo chú cá
│   ├── fixation-hold.js    ← 👀 Nhìn Chằm: giữ ngón tay + nhìn vào mặt thú
│   └── gap-saccade.js      ← ⚡ Phản Xạ: saccade với gap period
│
├── engine/
│   ├── draw.js             ← Canvas drawing helpers (target, fish, face...)
│   ├── adaptive.js         ← Logic tăng/giảm độ khó tự động
│   └── webgazer-wrapper.js ← Bật/tắt WebGazer (tùy chọn)
│
├── data/
│   └── sessions.js         ← localStorage manager + export JSON
│
├── assets/
│   ├── sounds/             ← (placeholder — thêm file .mp3 nếu muốn)
│   └── sprites/            ← (placeholder — thêm SVG sprite nếu muốn)
│
└── dashboard/
    └── report.html         ← Trang xem tiến trình + sparkline chart
```

## Cách chạy

**Cách 1 — Mở trực tiếp (không cần server):**
```
Mở file index.html trên Chrome/Edge/Safari
```

**Cách 2 — Local server (khuyến nghị, cần WebGazer):**
```bash
cd joubert-eye-trainer
npx serve .
# Truy cập: http://localhost:3000
```

> WebGazer yêu cầu HTTPS hoặc localhost để truy cập camera.

## Các bài tập

| Bài | Mục tiêu lâm sàng | Cơ chế |
|-----|-------------------|--------|
| 🎯 Bắt Sao | Saccade initiation | Target xuất hiện ngẫu nhiên, tap vào |
| 🐠 Theo Cá | Smooth pursuit | Cá bơi theo đường Lissajous, giữ ngón tay theo |
| 👀 Nhìn Chằm | Fixation stability | Giữ ngón tay + nhìn vào mặt thú X giây |
| ⚡ Phản Xạ | Gap saccade (giảm latency) | Target xuất hiện sau khoảng tối (gap) |

## Adaptive difficulty

Sau mỗi block:
- Accuracy > 82% → lên level
- Accuracy < 45% → xuống level
- 45–82% → giữ nguyên (vùng luyện tập tối ưu)

Mỗi bài có 4 level, lưu vào `localStorage` riêng cho từng bài.

## WebGazer (tùy chọn)

Tích hợp eye tracking qua webcam để:
- Log vùng nhìn theo thời gian
- Tính % thời gian nhìn vào target
- Dữ liệu gaze xuất kèm JSON report

**Lưu ý:** Độ chính xác WebGazer ~50-100px trên webcam thông thường. Không dùng làm input chính — chỉ dùng để ghi nhận dữ liệu bổ sung cho bác sĩ.

## Export dữ liệu

Nút "Xuất báo cáo JSON" trong Dashboard tạo file `.json` chứa:
- Toàn bộ session history
- Accuracy trend theo thời gian
- Level hiện tại từng bài
- Reaction time trung bình

File này có thể chia sẻ với bác sĩ/therapist để theo dõi tiến trình.

## Tùy chỉnh

**Thay đổi số trial một session** — `engine/adaptive.js`:
```js
saccade: { trialsPerBlock: 8, ... }  // đổi 8 → số khác
```

**Thay đổi threshold adaptive** — `engine/adaptive.js`:
```js
upThreshold:   0.82,  // acc > 82% → lên level
downThreshold: 0.45,  // acc < 45% → xuống level
```

**Thêm âm thanh feedback** — trong plugin, sau `Draw.hitEffect(...)`:
```js
new Audio('../assets/sounds/hit.mp3').play();
```
