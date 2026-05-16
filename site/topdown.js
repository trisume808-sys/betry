const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

const dpr = () => Math.max(1, window.devicePixelRatio || 1);

const canvas = document.getElementById("game");
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
  if (!g) return { canvas: off, w, h, ax: w / 2, ay: h / 2 };

  const c = {
    bodyDark: "#0a0c0f",
    bodyLight: "#1b222a",
    glassTop: "rgba(55,105,140,0.45)",
    glassBottom: "rgba(10,20,28,0.86)",
    trim: "rgba(255,255,255,0.10)",
    light: "rgba(160,220,255,0.85)",
    shadow: "rgba(0,0,0,0.48)",
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
  spine.addColorStop(0.38, "rgba(255,255,255,0.16)");
  spine.addColorStop(0.58, "rgba(255,255,255,0.06)");
  spine.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = spine;
  g.beginPath();
  g.ellipse(w * 0.52, h * 0.52, w * 0.18, h * 0.44, -0.2, 0, Math.PI * 2);
  g.fill();
  g.restore();

  const noseY = bodyY + bodyH * 0.14;
  const noseW = bodyW * 0.72;
  const noseX = (w - noseW) / 2;
  const noseH = bodyH * 0.16;
  g.fillStyle = c.shadow;
  roundRectPath(g, noseX, noseY, noseW, noseH, 10 * scale);
  g.fill();

  const intakeY = bodyY + bodyH * 0.78;
  g.fillStyle = "rgba(0,0,0,0.36)";
  roundRectPath(g, w * 0.16, intakeY, w * 0.68, bodyH * 0.09, 10 * scale);
  g.fill();

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

  const badgeY = bodyY + bodyH * 0.44;
  g.fillStyle = "rgba(255,206,84,0.85)";
  roundRectPath(g, w * 0.48, badgeY, w * 0.04, bodyH * 0.045, 3 * scale);
  g.fill();

  const shadowGrad = g.createRadialGradient(w * 0.5, h * 0.58, w * 0.12, w * 0.5, h * 0.58, w * 0.5);
  shadowGrad.addColorStop(0, "rgba(0,0,0,0)");
  shadowGrad.addColorStop(1, "rgba(0,0,0,0.22)");
  g.fillStyle = shadowGrad;
  g.fillRect(0, 0, w, h);

  return { canvas: off, w, h, ax: w / 2, ay: h * 0.62 };
};

const sprite = createHypercarSprite({ scale: 2 });

const key = new Set();
window.addEventListener("keydown", (e) => key.add(e.key.toLowerCase()));
window.addEventListener("keyup", (e) => key.delete(e.key.toLowerCase()));

const pointer = { active: false, startX: 0, steer: 0, accel: false };

const pointerToCanvas = (e) => {
  const r = canvas.getBoundingClientRect();
  const ratio = canvas.width / r.width;
  return { x: (e.clientX - r.left) * ratio, y: (e.clientY - r.top) * ratio };
};

const onDown = (e) => {
  const p = pointerToCanvas(e);
  pointer.active = true;
  pointer.startX = p.x;
  pointer.steer = 0;
  pointer.accel = true;
};

const onMove = (e) => {
  if (!pointer.active) return;
  const p = pointerToCanvas(e);
  const dx = p.x - pointer.startX;
  pointer.steer = clamp(dx / (canvas.width * 0.22), -1, 1);
};

const onUp = () => {
  pointer.active = false;
  pointer.steer = 0;
  pointer.accel = false;
};

canvas.addEventListener("pointerdown", onDown);
canvas.addEventListener("pointermove", onMove);
canvas.addEventListener("pointerup", onUp);
canvas.addEventListener("pointercancel", onUp);

const sim = { x: 0, y: 0, a: 0, speed: 0, stripe: 0, lastT: 0 };

const drawCar = (x, y, aRad, scale) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(aRad);
  ctx.scale(scale, scale);
  ctx.drawImage(sprite.canvas, -sprite.ax, -sprite.ay);
  ctx.restore();
};

const drawFrame = (w, h) => {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#070912";
  ctx.fillRect(0, 0, w, h);

  const carScreenX = w * 0.5;
  const carScreenY = h * 0.62;

  const roadW = Math.min(w * 0.62, 420);
  const margin = 26;
  const offroad = Math.abs(sim.x) > roadW / 2 - margin;

  ctx.fillStyle = "#111827";
  ctx.fillRect(carScreenX - roadW / 2 - sim.x, 0, roadW, h);

  ctx.strokeStyle = "rgba(52,211,153,0.55)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(carScreenX - roadW / 2 - sim.x, 0);
  ctx.lineTo(carScreenX - roadW / 2 - sim.x, h);
  ctx.moveTo(carScreenX + roadW / 2 - sim.x, 0);
  ctx.lineTo(carScreenX + roadW / 2 - sim.x, h);
  ctx.stroke();

  const stripeGap = 62;
  const stripeH = 26;
  const stripeW = 6;
  const base = Math.floor((sim.y - h) / stripeGap) * stripeGap;
  ctx.fillStyle = "rgba(244,244,245,0.35)";
  for (let yy = base; yy < sim.y + h; yy += stripeGap) {
    const sy = carScreenY + (yy - sim.y) + (sim.stripe % stripeGap);
    ctx.fillRect(carScreenX - stripeW / 2 - sim.x, sy - stripeH / 2, stripeW, stripeH);
  }

  const sizePx = clamp(Math.min(w, h) * 0.19, 72, 140);
  const drawScale = sizePx / sprite.h;
  drawCar(carScreenX, carScreenY, sim.a, drawScale);

  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = offroad ? "rgba(248,113,113,0.95)" : "rgba(52,211,153,0.95)";
  ctx.font = `${Math.max(14, Math.floor(w * 0.03))}px ui-sans-serif, system-ui`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(offroad ? "OFFROAD" : `${Math.round(sim.speed)} px/s`, 16, h - 18);
  ctx.restore();
};

const update = (t) => {
  const dtMs = sim.lastT ? t - sim.lastT : 16.7;
  sim.lastT = t;
  const dt = clamp(dtMs / 1000, 0, 0.05);

  const accelKey = key.has("w") || key.has("arrowup");
  const brakeKey = key.has("s") || key.has("arrowdown");
  const left = key.has("a") || key.has("arrowleft");
  const right = key.has("d") || key.has("arrowright");

  const steer = clamp((left ? -1 : 0) + (right ? 1 : 0) + pointer.steer, -1, 1);
  const accel = accelKey || pointer.accel;
  const brake = brakeKey;

  const maxSpeed = 520;
  const accelRate = 900;
  const brakeRate = 1200;
  const drag = 520;
  const turnRate = 2.9;

  if (accel) sim.speed = Math.min(maxSpeed, sim.speed + accelRate * dt);
  else sim.speed = Math.max(0, sim.speed - drag * dt);
  if (brake) sim.speed = Math.max(0, sim.speed - brakeRate * dt);

  const steerScale = (0.25 + 0.75 * (sim.speed / maxSpeed)) * turnRate;
  sim.a += steer * steerScale * dt;

  sim.x += Math.sin(sim.a) * sim.speed * dt;
  sim.y += -Math.cos(sim.a) * sim.speed * dt;
  sim.stripe += sim.speed * dt;

  drawFrame(canvas.width, canvas.height);
  requestAnimationFrame(update);
};

requestAnimationFrame(update);

