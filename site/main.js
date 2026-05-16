const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

const centerX = (y) => {
  const base = 50 * Math.sin(y * 0.0011) + 28 * Math.sin(y * 0.0023 + 1.7);
  const a = 240;
  const y1 = 520;
  const y2 = 900;
  const y3 = 1280;
  const s1 = smoothstep(260, y1, y);
  const s2 = smoothstep(y1, y2, y);
  const s3 = smoothstep(y2, y3, y);
  const bend1 = lerp(0, a, s1);
  const bend2 = lerp(a, -a, s2);
  const bend3 = lerp(-a, 0, s3);
  const bends = y < y1 ? bend1 : y < y2 ? bend2 : bend3;
  return base + bends;
};
const halfWidth = (y) => 135 + 18 * Math.sin(y * 0.0007 + 0.5);

const state = {
  status: "setup",
  inputMode: "sensor",
  sensorPermission: "unknown",
  sensorEnabled: false,
  sensorSupported: true,
  sensitivity: 3.2,
  steerStrength: 2.4,
  returnRate: 7.5,
  calibration: 0,
  tiltRaw: 0,
  tilt: 0,
  tiltSmooth: 0,
  elapsedMs: 0,
  distance: 0,
  speed: 0,
  offroad: false,
  finishMs: null,
  build: (import.meta?.env?.VITE_BUILD_ID ?? "canvas").slice(0, 7),
};

const ui = {
  rects: new Map(),
  pointerDown: null,
  sliderActive: false,
  sliderKey: null,
};

const sim = {
  x: 0,
  heading: 0,
  distance: 0,
  elapsedMs: 0,
  steerSmooth: 0,
  steerAngle: 0,
  lastT: 0,
  lastTelemetryT: 0,
};

const sensor = {
  hasData: false,
  mapped: 0,
  raw: 0,
  motionHasData: false,
  stop: null,
};

const touch = {
  active: false,
  startX: 0,
  steer: 0,
};

const finishDistance = 3200;

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const dpr = () => Math.max(1, window.devicePixelRatio || 1);

const resize = () => {
  const ratio = dpr();
  const w = Math.max(1, Math.floor(window.innerWidth * ratio));
  const h = Math.max(1, Math.floor(window.innerHeight * ratio));
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
};

window.addEventListener("resize", resize, { passive: true });
resize();

const getScreenAngle = () => {
  const angle = screen?.orientation?.angle;
  const legacy = window.orientation;
  return typeof angle === "number" ? angle : typeof legacy === "number" ? legacy : 0;
};

const canUseMotion = () => typeof window !== "undefined" && "DeviceMotionEvent" in window;
const canUseOrientation = () => typeof window !== "undefined" && "DeviceOrientationEvent" in window;

const isPermissionPromptRequired = () => {
  const dm = DeviceMotionEvent;
  const dor = DeviceOrientationEvent;
  return typeof dm?.requestPermission === "function" || typeof dor?.requestPermission === "function";
};

const requestSensorPermission = async () => {
  const dm = DeviceMotionEvent;
  const dor = DeviceOrientationEvent;
  const req = dm?.requestPermission ?? dor?.requestPermission;
  if (!req) return "granted";
  return req.call(dm);
};

const pickAxis = (x, y, angle) => {
  if (typeof x !== "number" || typeof y !== "number") return null;
  const a = ((angle % 360) + 360) % 360;
  if (a === 0 || a === 180) return x;
  if (a === 90) return -y;
  if (a === 270) return y;
  return x;
};

const pickOrientationAxis = (gamma, beta, angle) => {
  if (typeof gamma !== "number" || typeof beta !== "number") return null;
  const a = ((angle % 360) + 360) % 360;
  if (a === 0) return gamma;
  if (a === 180) return -gamma;
  if (a === 90) return beta;
  if (a === 270) return -beta;
  return gamma;
};

const startSensor = () => {
  stopSensor();
  sensor.hasData = false;
  sensor.motionHasData = false;

  const clampG = 4.5;

  const motionHandler = (e) => {
    const ag = e.accelerationIncludingGravity;
    const angle = getScreenAngle();
    const raw = pickAxis(ag?.x, ag?.y, angle);
    if (raw == null) return;
    const mapped = clamp(raw / clampG, -1, 1);
    sensor.raw = raw;
    sensor.mapped = mapped;
    sensor.hasData = true;
    sensor.motionHasData = true;
  };

  const orientationHandler = (e) => {
    if (sensor.motionHasData) return;
    const angle = getScreenAngle();
    const rawDeg = pickOrientationAxis(e.gamma, e.beta, angle);
    if (rawDeg == null) return;
    const mapped = clamp(rawDeg / 45, -1, 1);
    sensor.raw = rawDeg;
    sensor.mapped = mapped;
    sensor.hasData = true;
  };

  window.addEventListener("devicemotion", motionHandler, { passive: true });
  const timer = window.setTimeout(() => {
    if (!canUseOrientation()) return;
    if (sensor.motionHasData) return;
    window.addEventListener("deviceorientation", orientationHandler, { passive: true });
  }, 900);

  sensor.stop = () => {
    window.clearTimeout(timer);
    window.removeEventListener("devicemotion", motionHandler);
    window.removeEventListener("deviceorientation", orientationHandler);
    sensor.stop = null;
  };
};

const stopSensor = () => {
  if (typeof sensor.stop === "function") sensor.stop();
};

const resetRun = () => {
  state.finishMs = null;
  state.elapsedMs = 0;
  state.distance = 0;
  state.speed = 0;
  state.offroad = false;
  state.tiltSmooth = 0;
  sim.x = 0;
  sim.heading = 0;
  sim.distance = 0;
  sim.elapsedMs = 0;
  sim.steerSmooth = 0;
  sim.lastT = 0;
  sim.lastTelemetryT = 0;
};

const startRun = () => {
  resetRun();
  state.status = "running";
};

const resetAll = () => {
  resetRun();
  state.status = "setup";
};

const calibrate = () => {
  state.calibration += state.tilt;
};

const toggleFullscreenLandscape = async () => {
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
    }
  } catch {
    return;
  }
  try {
    await screen?.orientation?.lock?.("landscape");
  } catch {
    return;
  }
};

const exitFullscreen = async () => {
  try {
    await document.exitFullscreen();
  } catch {
    return;
  }
};

const enableSensor = async () => {
  const supported = canUseMotion() || canUseOrientation();
  state.sensorSupported = supported;
  if (!supported) {
    state.sensorPermission = "denied";
    state.sensorEnabled = false;
    state.inputMode = "touch";
    return;
  }

  try {
    const res = await requestSensorPermission();
    if (res === "granted") {
      state.sensorPermission = "granted";
      state.sensorEnabled = true;
      state.inputMode = "sensor";
      startSensor();
    } else {
      state.sensorPermission = "denied";
      state.sensorEnabled = false;
      state.inputMode = "touch";
    }
  } catch {
    state.sensorPermission = "denied";
    state.sensorEnabled = false;
    state.inputMode = "touch";
  }
};

const setInputTouch = () => {
  state.inputMode = "touch";
  state.sensorEnabled = false;
};

const hit = (x, y, rect) => x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;

const pointerToCanvas = (e) => {
  const r = canvas.getBoundingClientRect();
  const ratio = canvas.width / r.width;
  return {
    x: (e.clientX - r.left) * ratio,
    y: (e.clientY - r.top) * ratio,
  };
};

const onPointerDown = (e) => {
  const p = pointerToCanvas(e);
  ui.pointerDown = p;

  if (state.status === "running") {
    const btn = ui.rects.get("restart");
    if (btn && hit(p.x, p.y, btn)) {
      resetAll();
      return;
    }
    touch.active = true;
    touch.startX = p.x;
    return;
  }

  for (const key of ["sensitivity", "steerStrength", "returnRate"]) {
    const sl = ui.rects.get(key);
    if (sl && hit(p.x, p.y, sl)) {
      ui.sliderActive = true;
      ui.sliderKey = key;
      setSliderByX(key, p.x, sl);
      return;
    }
  }

  for (const key of ["enable", "calibrate", "start", "touch", "fs", "exitfs"]) {
    const r = ui.rects.get(key);
    if (r && hit(p.x, p.y, r)) {
      handleButton(key);
      return;
    }
  }
};

const onPointerMove = (e) => {
  const p = pointerToCanvas(e);
  if (state.status === "running") {
    if (!touch.active) return;
    const r = canvas.getBoundingClientRect();
    const ratio = canvas.width / r.width;
    const dx = (p.x - touch.startX);
    const steer = clamp(dx / (r.width * 0.28 * ratio), -1, 1);
    touch.steer = steer;
    if (state.inputMode !== "touch") state.inputMode = "touch";
    return;
  }

  if (!ui.sliderActive) return;
  const key = ui.sliderKey;
  if (!key) return;
  const sl = ui.rects.get(key);
  if (!sl) return;
  setSliderByX(key, p.x, sl);
};

const onPointerUp = () => {
  ui.pointerDown = null;
  ui.sliderActive = false;
  ui.sliderKey = null;
  touch.active = false;
  touch.steer = 0;
};

canvas.addEventListener("pointerdown", onPointerDown);
canvas.addEventListener("pointermove", onPointerMove);
canvas.addEventListener("pointerup", onPointerUp);
canvas.addEventListener("pointercancel", onPointerUp);

const setSliderByX = (key, x, rect) => {
  const t = clamp((x - rect.x) / rect.w, 0, 1);
  if (key === "sensitivity") state.sensitivity = 0.6 + t * (8 - 0.6);
  if (key === "steerStrength") state.steerStrength = 0.8 + t * (4.2 - 0.8);
  if (key === "returnRate") state.returnRate = 2 + t * (14 - 2);
};

const handleButton = (key) => {
  if (key === "enable") enableSensor();
  if (key === "calibrate") calibrate();
  if (key === "start") startRun();
  if (key === "touch") setInputTouch();
  if (key === "fs") toggleFullscreenLandscape();
  if (key === "exitfs") exitFullscreen();
};

const formatMs = (ms) => {
  const s = ms / 1000;
  const m = Math.floor(s / 60);
  const r = s - m * 60;
  return `${m}:${r.toFixed(2).padStart(5, "0")}`;
};

const drawRoundRect = (x, y, w, h, r) => {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
};

const drawButton = (key, label, rect, variant) => {
  ui.rects.set(key, rect);
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.fillStyle = variant === "primary" ? "rgba(52,211,153,0.92)" : "rgba(24,24,27,0.72)";
  drawRoundRect(rect.x, rect.y, rect.w, rect.h, 14);
  ctx.fill();
  ctx.fillStyle = variant === "primary" ? "rgba(9,9,11,0.95)" : "rgba(244,244,245,0.92)";
  ctx.font = `${Math.floor(rect.h * 0.45)}px ui-sans-serif, system-ui`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2);
  ctx.restore();
};

const drawSlider = (key, rect, value, min, max, label) => {
  ui.rects.set(key, rect);
  const t = clamp((value - min) / (max - min), 0, 1);
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.fillStyle = "rgba(24,24,27,0.65)";
  drawRoundRect(rect.x, rect.y, rect.w, rect.h, 12);
  ctx.fill();
  ctx.fillStyle = "rgba(52,211,153,0.75)";
  const fillW = rect.w * t;
  drawRoundRect(rect.x, rect.y, fillW, rect.h, 12);
  ctx.fill();
  ctx.fillStyle = "rgba(244,244,245,0.9)";
  ctx.font = `${Math.floor(rect.h * 0.62)}px ui-sans-serif, system-ui`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`${label} ${value.toFixed(2)}`, rect.x + rect.w / 2, rect.y + rect.h / 2);
  ctx.restore();
};

const drawSky = (w, h) => {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#04040a");
  g.addColorStop(0.6, "#070710");
  g.addColorStop(1, "#0a0a12");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.globalAlpha = 0.18;
  for (let i = 0; i < 70; i += 1) {
    const x = (w * (i * 37 % 97)) / 97;
    const y = (h * (i * 19 % 83)) / 83;
    const r = 1 + ((i * 13) % 4);
    ctx.fillStyle = i % 9 === 0 ? "#a7f3d0" : "#e4e4e7";
    ctx.beginPath();
    ctx.arc(x, y * 0.55, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
};

const drawFinishBand = (cx, roadHalf, y) => {
  const bandH = 16;
  const lx = cx - roadHalf;
  const rx = cx + roadHalf;
  ctx.save();
  ctx.beginPath();
  ctx.rect(lx, y - bandH / 2, rx - lx, bandH);
  ctx.clip();
  ctx.fillStyle = "#0b0b10";
  ctx.fillRect(lx, y - bandH / 2, rx - lx, bandH);
  const cell = 16;
  for (let x = Math.floor(lx / cell) * cell; x < rx + cell; x += cell) {
    for (let yy = Math.floor((y - bandH / 2) / cell) * cell; yy < y + bandH; yy += cell) {
      const on = ((x / cell) | 0) + ((yy / cell) | 0);
      ctx.fillStyle = on % 2 === 0 ? "#f4f4f5" : "#111827";
      ctx.fillRect(x, yy, cell, cell);
    }
  }
  ctx.restore();
};

const drawRoadFlat = (w, h, carX, distance, heading) => {
  const y0 = h * 0.16;
  const y1 = h * 0.9;
  const steps = 56;
  const lookahead = 1100;
  const roadHalfPx = Math.min(w * 0.28, 240);
  const curveScale = 0.22;
  const viewCarX = carX + heading * 210;

  const left = [];
  const right = [];

  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const yWorld = distance + t * lookahead;
    const c = centerX(yWorld) - viewCarX;
    const cx = w / 2 + c * curveScale;
    const y = lerp(y1, y0, t);
    left.push([cx - roadHalfPx, y]);
    right.push([cx + roadHalfPx, y]);
  }

  ctx.save();
  ctx.fillStyle = "rgba(10,10,16,0.85)";
  ctx.fillRect(0, y0, w, y1 - y0);

  ctx.beginPath();
  ctx.moveTo(left[0][0], left[0][1]);
  for (let i = 1; i < left.length; i += 1) ctx.lineTo(left[i][0], left[i][1]);
  for (let i = right.length - 1; i >= 0; i -= 1) ctx.lineTo(right[i][0], right[i][1]);
  ctx.closePath();
  ctx.fillStyle = "#14141b";
  ctx.fill();

  ctx.lineWidth = Math.max(3, Math.floor(w * 0.006));
  ctx.strokeStyle = "rgba(52,211,153,0.55)";
  ctx.beginPath();
  ctx.moveTo(left[0][0], left[0][1]);
  for (let i = 1; i < left.length; i += 1) ctx.lineTo(left[i][0], left[i][1]);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(right[0][0], right[0][1]);
  for (let i = 1; i < right.length; i += 1) ctx.lineTo(right[i][0], right[i][1]);
  ctx.stroke();

  const stripeH = 26;
  const stripeW = 6;
  const stripeGap = 18;
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = "#e5e7eb";
  for (let y = y1; y > y0; y -= stripeH + stripeGap) {
    const dy = (distance * 0.22) % (stripeH + stripeGap);
    const yy = y + dy;
    const t = clamp((y1 - yy) / (y1 - y0), 0, 1);
    const yWorld = distance + t * lookahead;
    const c = centerX(yWorld) - viewCarX;
    const cx = w / 2 + c * curveScale;
    drawRoundRect(cx - stripeW / 2, yy - stripeH, stripeW, stripeH, 3);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  const finishT = (finishDistance - distance) / lookahead;
  if (finishT > 0 && finishT < 1) {
    const y = lerp(y1, y0, finishT);
    const yWorld = finishDistance;
    const c = centerX(yWorld) - viewCarX;
    const cx = w / 2 + c * curveScale;
    drawFinishBand(cx, roadHalfPx, y);
  }

  const fog = ctx.createLinearGradient(0, y0, 0, y1);
  fog.addColorStop(0, "rgba(0,0,0,0.58)");
  fog.addColorStop(0.35, "rgba(0,0,0,0.12)");
  fog.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = fog;
  ctx.fillRect(0, y0, w, y1 - y0);
  ctx.restore();
};

const drawMiniMap = (w, h, carX, distance, offroad, heading) => {
  const pad = 14;
  const mapW = Math.min(w * 0.34, 260);
  const mapH = mapW * 0.72;
  const x0 = w - pad - mapW;
  const y0 = pad;
  const y1 = y0 + mapH;

  const behind = 240;
  const ahead = 620;
  const start = distance - behind;
  const end = distance + ahead;
  const steps = 42;

  const ptsL = [];
  const ptsR = [];
  let maxAbs = 1;

  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const yWorld = lerp(start, end, t);
    const c = centerX(yWorld) - carX;
    const hw = halfWidth(yWorld);
    maxAbs = Math.max(maxAbs, Math.abs(c) + hw);
    ptsL.push([c - hw, t]);
    ptsR.push([c + hw, t]);
  }

  const sx = (mapW * 0.46) / maxAbs;
  const cx = x0 + mapW / 2;

  ctx.save();
  ctx.fillStyle = "rgba(10,10,18,0.65)";
  drawRoundRect(x0, y0, mapW, mapH, 14);
  ctx.fill();
  ctx.strokeStyle = "rgba(52,211,153,0.35)";
  ctx.lineWidth = 1.5;
  drawRoundRect(x0 + 0.75, y0 + 0.75, mapW - 1.5, mapH - 1.5, 13);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx + ptsL[0][0] * sx, y1 - ptsL[0][1] * mapH);
  for (let i = 1; i < ptsL.length; i += 1) ctx.lineTo(cx + ptsL[i][0] * sx, y1 - ptsL[i][1] * mapH);
  for (let i = ptsR.length - 1; i >= 0; i -= 1) ctx.lineTo(cx + ptsR[i][0] * sx, y1 - ptsR[i][1] * mapH);
  ctx.closePath();
  ctx.fillStyle = "rgba(20,20,27,0.9)";
  ctx.fill();

  const finishT = (finishDistance - start) / (end - start);
  if (finishT > 0 && finishT < 1) {
    const y = y1 - finishT * mapH;
    ctx.strokeStyle = "rgba(244,244,245,0.65)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x0 + 10, y);
    ctx.lineTo(x0 + mapW - 10, y);
    ctx.stroke();
  }

  const carY = y1 - ((distance - start) / (end - start)) * mapH;
  ctx.save();
  ctx.translate(cx, carY);
  ctx.rotate(heading);
  ctx.fillStyle = offroad ? "rgba(248,113,113,0.95)" : "rgba(52,211,153,0.95)";
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(6, 8);
  ctx.lineTo(-6, 8);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.restore();
};

const drawCockpit = (w, h, offroad) => {
  const cockpitH = h * 0.28;
  const y0 = h - cockpitH;

  ctx.save();
  const rg = ctx.createLinearGradient(0, y0, 0, h);
  rg.addColorStop(0, "rgba(0,0,0,0)");
  rg.addColorStop(0.15, "rgba(0,0,0,0.65)");
  rg.addColorStop(1, "rgba(0,0,0,0.92)");
  ctx.fillStyle = rg;
  ctx.fillRect(0, y0, w, cockpitH);

  const dashY = h - cockpitH * 0.76;
  ctx.fillStyle = "rgba(17,24,39,0.62)";
  drawRoundRect(w * 0.06, dashY, w * 0.88, cockpitH * 0.48, 22);
  ctx.fill();

  const wheelR = Math.min(w, h) * 0.12;
  const wx = w * 0.5;
  const wy = h - cockpitH * 0.08;
  ctx.lineWidth = Math.max(5, Math.floor(wheelR * 0.09));
  ctx.strokeStyle = "rgba(228,228,231,0.18)";
  ctx.beginPath();
  ctx.arc(wx, wy, wheelR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = offroad ? "rgba(248,113,113,0.65)" : "rgba(52,211,153,0.55)";
  ctx.beginPath();
  ctx.arc(wx, wy, wheelR * 0.66, -Math.PI * 0.15, Math.PI * 1.15);
  ctx.stroke();

  const steerAngle = clamp(sim.steerAngle * 2.2, -1.35, 1.35);
  ctx.save();
  ctx.translate(wx, wy);
  ctx.rotate(steerAngle);
  ctx.strokeStyle = "rgba(244,244,245,0.65)";
  ctx.lineWidth = Math.max(3, Math.floor(wheelR * 0.08));
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -wheelR * 0.72);
  ctx.stroke();
  ctx.restore();

  const light = offroad ? "rgba(248,113,113,0.85)" : "rgba(52,211,153,0.85)";
  ctx.fillStyle = light;
  drawRoundRect(w * 0.08, dashY + 14, w * 0.18, 10, 6);
  ctx.fill();
  ctx.globalAlpha = 0.75;
  ctx.fillStyle = "rgba(244,244,245,0.9)";
  ctx.font = `${Math.max(12, Math.floor(w * 0.02))}px ui-sans-serif, system-ui`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(offroad ? "OFFROAD" : "ON TRACK", w * 0.29, dashY + 24);
  ctx.restore();
};

const drawTopHud = (w, h) => {
  const pad = 14;
  ctx.save();
  ctx.fillStyle = "rgba(10,10,18,0.62)";
  const boxW = Math.min(w * 0.42, 270);
  drawRoundRect(pad, pad, boxW, 54, 16);
  ctx.fill();
  ctx.fillStyle = "rgba(244,244,245,0.92)";
  ctx.font = `${Math.max(12, Math.floor(w * 0.02))}px ui-sans-serif, system-ui`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("陀螺仪赛车 MVP", pad + 12, pad + 22);
  ctx.fillStyle = "rgba(161,161,170,0.9)";
  ctx.font = `${Math.max(10, Math.floor(w * 0.016))}px ui-sans-serif, system-ui`;
  ctx.fillText(`build ${state.build}`, pad + 12, pad + 42);
  ctx.restore();
};

const drawSetupUi = (w, h) => {
  ui.rects.clear();
  const pad = 14;
  const panelW = Math.min(w * 0.9, 520);
  const x0 = (w - panelW) / 2;
  const y0 = h * 0.62;
  const panelH = h - y0 - pad - (state.status === "setup" ? 0 : 0);

  ctx.save();
  ctx.fillStyle = "rgba(10,10,18,0.62)";
  drawRoundRect(x0, y0, panelW, panelH, 20);
  ctx.fill();

  ctx.fillStyle = "rgba(244,244,245,0.95)";
  ctx.font = `${Math.max(12, Math.floor(w * 0.022))}px ui-sans-serif, system-ui`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("校准 → 开始", x0 + 14, y0 + 26);

  const btnH = Math.max(44, Math.floor(h * 0.06));
  const gap = 10;
  const colW = (panelW - 14 * 2 - gap) / 2;
  const rowY = y0 + 38;

  const enableLabel = isPermissionPromptRequired() ? "启用传感器（点我）" : "启用传感器";
  drawButton("enable", enableLabel, { x: x0 + 14, y: rowY, w: colW, h: btnH }, "primary");
  drawButton("calibrate", "校准中位", { x: x0 + 14 + colW + gap, y: rowY, w: colW, h: btnH }, "ghost");

  drawButton("start", "开始", { x: x0 + 14, y: rowY + btnH + gap, w: colW, h: btnH }, "primary");
  drawButton("touch", "触控模式", { x: x0 + 14 + colW + gap, y: rowY + btnH + gap, w: colW, h: btnH }, "ghost");

  drawButton("fs", "横屏全屏", { x: x0 + 14, y: rowY + (btnH + gap) * 2, w: colW, h: btnH }, "ghost");
  drawButton("exitfs", "退出全屏", { x: x0 + 14 + colW + gap, y: rowY + (btnH + gap) * 2, w: colW, h: btnH }, "ghost");

  const sliderY = rowY + (btnH + gap) * 3 + 4;
  const sliderH = Math.max(34, Math.floor(h * 0.045));
  drawSlider("sensitivity", { x: x0 + 14, y: sliderY, w: panelW - 28, h: sliderH }, state.sensitivity, 0.6, 8, "灵敏度");
  drawSlider(
    "steerStrength",
    { x: x0 + 14, y: sliderY + sliderH + 10, w: panelW - 28, h: sliderH },
    state.steerStrength,
    0.8,
    4.2,
    "转向强度",
  );
  drawSlider(
    "returnRate",
    { x: x0 + 14, y: sliderY + (sliderH + 10) * 2, w: panelW - 28, h: sliderH },
    state.returnRate,
    2,
    14,
    "回正速度",
  );

  ctx.fillStyle = "rgba(161,161,170,0.95)";
  ctx.font = `${Math.max(10, Math.floor(w * 0.016))}px ui-sans-serif, system-ui`;
  const t1 = `倾斜 ${state.tilt.toFixed(2)} / 平滑 ${state.tiltSmooth.toFixed(2)} / 计时 ${formatMs(state.elapsedMs)}`;
  const t2 =
    state.inputMode === "touch"
      ? "触控：按住画面左右拖动"
      : state.sensorPermission === "denied"
        ? "传感器不可用/被拒绝，可用触控模式"
        : state.sensorEnabled
          ? sensor.hasData
            ? "传感器已启用：先校准，再开始"
            : "传感器已启用但未收到数据：建议用 Chrome/Edge，并允许“运动与传感器”"
          : "未启用传感器";
  const infoY = sliderY + (sliderH + 10) * 3 + 12;
  ctx.fillText(t1, x0 + 14, infoY + 16);
  ctx.fillText(t2, x0 + 14, infoY + 36);
  ctx.restore();
};

const drawRunUi = (w, h) => {
  ui.rects.clear();
  const pad = 14;
  const boxW = Math.min(w * 0.42, 270);
  ctx.save();
  ctx.fillStyle = "rgba(10,10,18,0.55)";
  drawRoundRect(pad, pad + 62, boxW, 44, 16);
  ctx.fill();
  ctx.fillStyle = "rgba(244,244,245,0.9)";
  ctx.font = `${Math.max(12, Math.floor(w * 0.018))}px ui-sans-serif, system-ui`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(`计时 ${formatMs(state.finishMs ?? state.elapsedMs)}`, pad + 12, pad + 92);
  ctx.restore();

  const btnW = Math.min(w * 0.6, 360);
  const btnH = 44;
  const x = (w - btnW) / 2;
  const y = h - btnH - pad - 10 - (Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("env(safe-area-inset-bottom)")) || 0);
  drawButton("restart", "重开", { x, y, w: btnW, h: btnH }, "primary");
};

const updateSim = (t) => {
  const dtMs = sim.lastT ? t - sim.lastT : 16.7;
  sim.lastT = t;
  const dt = clamp(dtMs / 1000, 0, 0.05);

  const w = canvas.width;
  const h = canvas.height;

  const mapped = state.inputMode === "sensor" && state.sensorEnabled && sensor.hasData ? sensor.mapped : 0;
  const tilt = clamp(mapped - state.calibration, -1, 1);
  state.tilt = tilt;
  state.tiltRaw = sensor.raw;

  const steerTarget = state.inputMode === "touch" || !state.sensorEnabled ? touch.steer : tilt;
  const follow = 1 - Math.pow(0.001, dt);
  sim.steerSmooth = lerp(sim.steerSmooth, steerTarget, follow * 0.32);
  state.tiltSmooth = sim.steerSmooth;

  const baseSpeed = 260;
  const carHalf = 12;
  const y0 = sim.distance;
  const c0 = centerX(y0);
  const hw0 = halfWidth(y0);
  const offroad0 = Math.abs(sim.x - c0) > hw0 - carHalf;
  const speed0 = baseSpeed * (offroad0 ? 0.55 : 1);

  if (state.status === "running") {
    sim.elapsedMs += dtMs;
    const neutral = !touch.active && Math.abs(steerTarget) < 0.02;
    const steerInput = clamp(sim.steerSmooth * state.sensitivity, -1, 1);
    const maxSteerRad = 0.78;
    const targetSteerAngle = neutral ? 0 : steerInput * maxSteerRad;
    const rate = neutral ? state.returnRate : 10.5;
    sim.steerAngle += clamp(targetSteerAngle - sim.steerAngle, -rate * dt, rate * dt);

    const wheelBase = 185;
    const yawRate = (speed0 / wheelBase) * Math.tan(sim.steerAngle) * state.steerStrength;
    sim.heading += yawRate * dt;
    sim.heading = clamp(sim.heading, -1.25, 1.25);
    sim.heading *= Math.exp(-0.22 * dt);

    sim.distance += speed0 * Math.cos(sim.heading) * dt;
    sim.x += speed0 * Math.sin(sim.heading) * dt;

    const ny = sim.distance;
    const nc = centerX(ny);
    const nhw = halfWidth(ny);
    if (Math.abs(sim.x - nc) > nhw - carHalf) sim.x = nc + clamp(sim.x - nc, -(nhw - carHalf), nhw - carHalf);

    if (sim.distance >= finishDistance) {
      state.finishMs = Math.max(0, Math.floor(sim.elapsedMs));
      state.status = "setup";
      resetRun();
    }
  }

  const y1 = sim.distance;
  const c1 = centerX(y1);
  const hw1 = halfWidth(y1);
  const offroad = Math.abs(sim.x - c1) > hw1 - carHalf;
  const speed = baseSpeed * (offroad ? 0.55 : 1);

  state.elapsedMs = Math.max(0, Math.floor(sim.elapsedMs));
  state.distance = sim.distance;
  state.speed = speed;
  state.offroad = offroad;

  drawFrame(w, h);
};

const drawFrame = (w, h) => {
  ctx.clearRect(0, 0, w, h);
  drawSky(w, h);
  drawRoadFlat(w, h, sim.x, sim.distance, sim.heading);
  drawMiniMap(w, h, sim.x, sim.distance, state.offroad, sim.heading);
  drawCockpit(w, h, state.offroad);
  drawTopHud(w, h);
  if (state.status === "running") drawRunUi(w, h);
  else drawSetupUi(w, h);
};

const loop = (t) => {
  updateSim(t);
  requestAnimationFrame(loop);
};

requestAnimationFrame(loop);
