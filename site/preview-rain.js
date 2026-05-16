const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

const dpr = () => Math.max(1, window.devicePixelRatio || 1);

const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");

const resize = () => {
  const ratio = dpr();
  const w = Math.max(1, Math.floor(window.innerWidth * ratio));
  const h = Math.max(1, Math.floor(window.innerHeight * ratio));
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
};

window.addEventListener("resize", resize, { passive: true });
resize();

const roundRectPath = (g, x, y, w, h, r) => {
  const rr = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + rr, y);
  g.lineTo(x + w - rr, y);
  g.quadraticCurveTo(x + w, y, x + w, y + rr);
  g.lineTo(x + w, y + h - rr);
  g.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  g.lineTo(x + rr, y + h);
  g.quadraticCurveTo(x, y + h, x, y + h - rr);
  g.lineTo(x, y + rr);
  g.quadraticCurveTo(x, y, x + rr, y);
  g.closePath();
};

const createHypercarSprite = ({ width = 56, height = 112, scale = 2 } = {}) => {
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));
  const off = document.createElement("canvas");
  off.width = w;
  off.height = h;
  const g = off.getContext("2d");
  if (!g) return { canvas: off, w, h, ax: w / 2, ay: h * 0.62 };

  const c = {
    bodyDark: "#0b0d10",
    bodyLight: "#222a33",
    glassTop: "rgba(90,140,170,0.24)",
    glassBottom: "rgba(10,20,28,0.92)",
    trim: "rgba(255,255,255,0.12)",
    light: "rgba(200,230,255,0.92)",
    shadow: "rgba(0,0,0,0.52)",
  };

  g.clearRect(0, 0, w, h);

  const bodyX = 6 * scale;
  const bodyY = 3.5 * scale;
  const bodyW = w - 12 * scale;
  const bodyH = h - 7 * scale;
  const bodyR = 14 * scale;

  const bodyGrad = g.createLinearGradient(0, bodyY, 0, bodyY + bodyH);
  bodyGrad.addColorStop(0, c.bodyLight);
  bodyGrad.addColorStop(0.55, c.bodyDark);
  bodyGrad.addColorStop(1, c.bodyLight);

  roundRectPath(g, bodyX, bodyY, bodyW, bodyH, bodyR);
  g.fillStyle = bodyGrad;
  g.fill();

  g.save();
  g.globalCompositeOperation = "source-atop";
  const spine = g.createLinearGradient(0, 0, w, 0);
  spine.addColorStop(0, "rgba(255,255,255,0)");
  spine.addColorStop(0.36, "rgba(255,255,255,0.13)");
  spine.addColorStop(0.52, "rgba(255,255,255,0.05)");
  spine.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = spine;
  g.beginPath();
  g.ellipse(w * 0.52, h * 0.52, w * 0.18, h * 0.44, -0.2, 0, Math.PI * 2);
  g.fill();
  g.restore();

  const cabinY = bodyY + bodyH * 0.23;
  const cabinH = bodyH * 0.38;
  const glassGrad = g.createLinearGradient(0, cabinY, 0, cabinY + cabinH);
  glassGrad.addColorStop(0, c.glassTop);
  glassGrad.addColorStop(1, c.glassBottom);
  g.fillStyle = glassGrad;
  g.beginPath();
  g.ellipse(w * 0.5, cabinY + cabinH * 0.56, w * 0.18, cabinH * 0.46, 0, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = c.trim;
  g.lineWidth = Math.max(1.5, 1.6 * scale);
  g.beginPath();
  g.ellipse(w * 0.5, cabinY + cabinH * 0.56, w * 0.205, cabinH * 0.51, 0, 0, Math.PI * 2);
  g.stroke();

  const headY = bodyY + bodyH * 0.12;
  g.fillStyle = c.light;
  g.beginPath();
  g.ellipse(w * 0.28, headY + bodyH * 0.085, w * 0.085, bodyH * 0.048, -0.55, 0, Math.PI * 2);
  g.ellipse(w * 0.72, headY + bodyH * 0.085, w * 0.085, bodyH * 0.048, 0.55, 0, Math.PI * 2);
  g.fill();

  const wheel = (cx, cy) => {
    g.fillStyle = "rgba(0,0,0,0.78)";
    roundRectPath(g, cx - w * 0.105, cy - h * 0.06, w * 0.21, h * 0.12, 12 * scale);
    g.fill();
    g.fillStyle = "rgba(255,255,255,0.06)";
    roundRectPath(g, cx - w * 0.062, cy - h * 0.03, w * 0.124, h * 0.06, 10 * scale);
    g.fill();
  };

  wheel(w * 0.19, h * 0.34);
  wheel(w * 0.81, h * 0.34);
  wheel(w * 0.19, h * 0.74);
  wheel(w * 0.81, h * 0.74);

  const intakeY = bodyY + bodyH * 0.78;
  g.fillStyle = "rgba(0,0,0,0.38)";
  roundRectPath(g, w * 0.16, intakeY, w * 0.68, bodyH * 0.09, 10 * scale);
  g.fill();

  return { canvas: off, w, h, ax: w / 2, ay: h * 0.62 };
};

const sprite = createHypercarSprite({ scale: 2 });

const rain = Array.from({ length: 140 }, (_, i) => ({
  x: ((i * 73) % 997) / 997,
  y: ((i * 41) % 733) / 733,
  s: 0.6 + ((i * 17) % 10) * 0.08,
}));

const drawCar = (x, y, angleRad, sizePx) => {
  const scale = Math.max(0.001, sizePx / sprite.h);

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angleRad);
  ctx.scale(scale, scale);

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.shadowColor = "rgba(220,230,255,0.40)";
  ctx.shadowBlur = 18;
  ctx.drawImage(sprite.canvas, -sprite.ax, -sprite.ay);
  ctx.restore();

  ctx.shadowColor = "rgba(0,0,0,0.62)";
  ctx.shadowBlur = 14;
  ctx.drawImage(sprite.canvas, -sprite.ax, -sprite.ay);

  ctx.restore();
};

const drawHud = (w, h, speed, score, progress) => {
  const pad = 14;
  const boxW = Math.min(w * 0.48, 340);
  const boxH = 98;

  ctx.save();

  ctx.fillStyle = "rgba(10,10,18,0.58)";
  roundRectPath(ctx, pad, pad, boxW, boxH, 18);
  ctx.fill();
  ctx.strokeStyle = "rgba(244,244,245,0.10)";
  ctx.lineWidth = 1.5;
  roundRectPath(ctx, pad + 0.75, pad + 0.75, boxW - 1.5, boxH - 1.5, 17);
  ctx.stroke();

  ctx.fillStyle = "rgba(244,244,245,0.92)";
  ctx.font = `${Math.max(12, Math.floor(w * 0.02))}px ui-sans-serif, system-ui`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("陀螺仪赛车", pad + 14, pad + 24);

  ctx.fillStyle = "rgba(226,232,240,0.95)";
  ctx.font = `${Math.max(22, Math.floor(w * 0.055))}px ui-sans-serif, system-ui`;
  ctx.fillText(`${Math.round(speed)}`, pad + 14, pad + 64);

  ctx.fillStyle = "rgba(161,161,170,0.95)";
  ctx.font = `${Math.max(11, Math.floor(w * 0.02))}px ui-sans-serif, system-ui`;
  ctx.fillText("SPEED", pad + 14 + Math.max(44, Math.floor(w * 0.1)), pad + 64);

  ctx.fillStyle = "rgba(245,158,11,0.92)";
  ctx.font = `${Math.max(12, Math.floor(w * 0.022))}px ui-sans-serif, system-ui`;
  ctx.fillText(`SCORE ${score}`, pad + 14, pad + 86);

  const barW = Math.min(w * 0.42, 320);
  const barH = 10;
  const bx = (w - barW) / 2;
  const by = h - 22;
  ctx.globalAlpha = 0.65;
  ctx.fillStyle = "rgba(10,10,18,0.50)";
  roundRectPath(ctx, bx, by, barW, barH, 8);
  ctx.fill();
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = "rgba(245,158,11,0.85)";
  roundRectPath(ctx, bx, by, Math.max(10, barW * clamp(progress, 0, 1)), barH, 8);
  ctx.fill();

  ctx.restore();
};

const state = { t: 0, speed: 246, score: 88, progress: 0.12, heading: 0.0, offX: 0 };

const drawRainScene = (w, h, t) => {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#05070c");
  sky.addColorStop(0.65, "#070a10");
  sky.addColorStop(1, "#050508");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  const roadW = Math.min(w * 0.62, 460);
  const cx = w * 0.5;
  const left = cx - roadW / 2 + state.offX;
  const right = cx + roadW / 2 + state.offX;

  const asphalt = ctx.createLinearGradient(0, 0, 0, h);
  asphalt.addColorStop(0, "rgba(24,28,34,0.92)");
  asphalt.addColorStop(1, "rgba(12,14,18,0.96)");
  ctx.fillStyle = asphalt;
  ctx.fillRect(left, 0, roadW, h);

  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = "rgba(244,244,245,0.14)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(left + 1.5, 0);
  ctx.lineTo(left + 1.5, h);
  ctx.moveTo(right - 1.5, 0);
  ctx.lineTo(right - 1.5, h);
  ctx.stroke();
  ctx.restore();

  const highlight = ctx.createLinearGradient(left, 0, right, 0);
  highlight.addColorStop(0, "rgba(255,255,255,0.0)");
  highlight.addColorStop(0.45, "rgba(255,255,255,0.10)");
  highlight.addColorStop(0.55, "rgba(255,255,255,0.06)");
  highlight.addColorStop(1, "rgba(255,255,255,0.0)");
  ctx.fillStyle = highlight;
  ctx.fillRect(left, 0, roadW, h);

  const stripeGap = 64;
  const stripeH = 28;
  const stripeW = 6;
  const phase = (t * state.speed * 0.04) % stripeGap;
  ctx.fillStyle = "rgba(226,232,240,0.22)";
  for (let y = -stripeGap; y < h + stripeGap; y += stripeGap) {
    ctx.fillRect(cx - stripeW / 2 + state.offX, y + phase, stripeW, stripeH);
  }

  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  const wind = 0.22 + 0.12 * Math.sin(t * 0.9);
  for (const r of rain) {
    const x = left + roadW * ((r.x + t * (0.05 + r.s * 0.02)) % 1);
    const y = h * ((r.y + t * (0.55 + r.s * 0.18)) % 1);
    const len = (18 + 22 * r.s) * dpr();
    ctx.fillRect(x + wind * len, y, 1.2 * dpr(), len);
  }
  ctx.restore();

  const fog = ctx.createLinearGradient(0, 0, 0, h);
  fog.addColorStop(0, "rgba(8,10,14,0.58)");
  fog.addColorStop(0.45, "rgba(8,10,14,0.18)");
  fog.addColorStop(1, "rgba(8,10,14,0)");
  ctx.fillStyle = fog;
  ctx.fillRect(0, 0, w, h);

  const vignette = ctx.createRadialGradient(w * 0.5, h * 0.55, w * 0.2, w * 0.5, h * 0.55, w * 0.74);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.62)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);
};

const loop = (now) => {
  state.t = now / 1000;
  state.heading = Math.sin(state.t * 0.55) * 0.26;
  state.offX = Math.sin(state.t * 0.3) * (Math.min(canvas.width, canvas.height) * 0.025);
  state.progress = (0.12 + state.t * 0.012) % 1;
  state.score = 88 + Math.floor(10 * (0.5 + 0.5 * Math.sin(state.t * 0.7)));
  state.speed = 220 + 70 * (0.5 + 0.5 * Math.sin(state.t * 1.0));

  drawRainScene(canvas.width, canvas.height, state.t);
  const sizePx = clamp(Math.min(canvas.width, canvas.height) * 0.18, 86, 160);
  drawCar(canvas.width * 0.5, canvas.height * 0.64, state.heading, sizePx);
  drawHud(canvas.width, canvas.height, state.speed, state.score, state.progress);

  requestAnimationFrame(loop);
};

requestAnimationFrame(loop);

