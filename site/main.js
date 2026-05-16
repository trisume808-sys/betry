const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const lerp = (a, b, t) => a + (b - a) * t;
const randRange = (min, max) => min + (max - min) * Math.random();
const BUILD_ID = "20260516-13";
const SCORE_BASE = 100;
const calcScore = (_ms, penalty) => Math.max(0, SCORE_BASE - penalty);
const CAR_HALF_PX = 10;
const WALL_HIT_EPS_PX = 1;

const track = {
  halfWidth: 250,
  bends: [
    { start: 120, length: 680, amp: -260 },
    { start: 1480, length: 780, amp: 320 },
    { start: 2920, length: 640, amp: -220 },
    { start: 4180, length: 900, amp: 360 },
    { start: 5780, length: 700, amp: -320 },
    { start: 7240, length: 860, amp: 260 },
    { start: 8920, length: 760, amp: -360 },
    { start: 10480, length: 980, amp: 300 },
  ],
};

const bendShape = (t) => {
  const u = clamp(t, 0, 1);
  return u * u * (3 - 2 * u);
};

const centerX = (y) => {
  let x = 0;
  for (const b of track.bends) {
    const t = (y - b.start) / b.length;
    x += b.amp * bendShape(t);
  }
  return x;
};

const halfWidth = () => track.halfWidth;

const roadAngleAt = (y) => {
  const eps = 14;
  const d = (centerX(y + eps) - centerX(y - eps)) / (2 * eps);
  return Math.atan(d);
};

const finishDistance = 12400;

const state = {
  status: "setup",
  inputMode: "sensor",
  sensorPermission: "unknown",
  sensorEnabled: false,
  sensorSupported: true,
  sensitivity: 3.2,
  steerStrength: 1.25,
  returnRate: 7.5,
  calibration: 0,
  tiltRaw: 0,
  tilt: 0,
  tiltSmooth: 0,
  elapsedMs: 0,
  distance: 0,
  speed: 0,
  offroad: false,
  penalty: 0,
  score: 0,
  finishMs: null,
  build: (import.meta?.env?.VITE_BUILD_ID ?? BUILD_ID).slice(0, 16),
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
  roadAngle: 0,
  distance: 0,
  elapsedMs: 0,
  steerSmooth: 0,
  steerAngle: 0,
  gyroFlip: 1,
  nextGyroFlipMs: 0,
  lastPenaltyMs: 0,
  penaltyFlashUntil: 0,
  lastPenaltyDelta: 0,
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
  state.penalty = 0;
  state.score = SCORE_BASE;
  state.tiltSmooth = 0;
  sim.x = 0;
  sim.heading = 0;
  sim.roadAngle = 0;
  sim.distance = 0;
  sim.elapsedMs = 0;
  sim.steerSmooth = 0;
  sim.steerAngle = 0;
  sim.gyroFlip = 1;
  sim.nextGyroFlipMs = randRange(2500, 6500);
  sim.lastPenaltyMs = 0;
  sim.penaltyFlashUntil = 0;
  sim.lastPenaltyDelta = 0;
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
  if (key === "steerStrength") state.steerStrength = 0.4 + t * (2.5 - 0.4);
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
  const r = Math.min(18, rect.h / 2);
  ctx.globalAlpha = 1;
  if (variant === "primary") {
    const g = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
    g.addColorStop(0, "rgba(52,211,153,0.98)");
    g.addColorStop(1, "rgba(16,185,129,0.92)");
    ctx.fillStyle = g;
  } else {
    const g = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
    g.addColorStop(0, "rgba(24,24,27,0.78)");
    g.addColorStop(1, "rgba(9,9,11,0.64)");
    ctx.fillStyle = g;
  }
  drawRoundRect(rect.x, rect.y, rect.w, rect.h, r);
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle =
    variant === "primary" ? "rgba(167,243,208,0.55)" : "rgba(244,244,245,0.14)";
  ctx.stroke();

  ctx.globalAlpha = 0.28;
  ctx.fillStyle = "rgba(255,255,255,1)";
  drawRoundRect(rect.x + 1, rect.y + 1, rect.w - 2, rect.h * 0.44, r - 1);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.fillStyle = variant === "primary" ? "rgba(9,9,11,0.95)" : "rgba(244,244,245,0.92)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const maxW = rect.w - 24;
  const splitAt = label.indexOf("（");
  const canTwoLine = splitAt > 0 && rect.h >= 46;
  if (canTwoLine) {
    const a = label.slice(0, splitAt);
    const b = label.slice(splitAt);
    let fs = Math.floor(rect.h * 0.28);
    for (let i = 0; i < 18; i += 1) {
      ctx.font = `${fs}px ui-sans-serif, system-ui`;
      if (ctx.measureText(a).width <= maxW && ctx.measureText(b).width <= maxW) break;
      fs = Math.max(10, fs - 1);
    }
    const ym = rect.y + rect.h / 2;
    ctx.fillText(a, rect.x + rect.w / 2, ym - fs * 0.6);
    ctx.fillText(b, rect.x + rect.w / 2, ym + fs * 0.6);
  } else {
    let fs = Math.floor(rect.h * 0.38);
    for (let i = 0; i < 18; i += 1) {
      ctx.font = `${fs}px ui-sans-serif, system-ui`;
      if (ctx.measureText(label).width <= maxW) break;
      fs = Math.max(10, fs - 1);
    }
    ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2);
  }
  ctx.restore();
};

const drawSlider = (key, rect, value, min, max, label) => {
  ui.rects.set(key, rect);
  const t = clamp((value - min) / (max - min), 0, 1);
  ctx.save();
  const r = Math.min(14, rect.h / 2);
  ctx.globalAlpha = 1;
  ctx.fillStyle = "rgba(9,9,11,0.55)";
  drawRoundRect(rect.x, rect.y, rect.w, rect.h, r);
  ctx.fill();
  ctx.lineWidth = 1.25;
  ctx.strokeStyle = "rgba(244,244,245,0.12)";
  ctx.stroke();

  const barH = Math.max(10, Math.floor(rect.h * 0.34));
  const barY = rect.y + rect.h - barH - 6;
  ctx.fillStyle = "rgba(24,24,27,0.85)";
  drawRoundRect(rect.x + 10, barY, rect.w - 20, barH, Math.min(10, barH / 2));
  ctx.fill();

  const fillW = (rect.w - 20) * t;
  const g = ctx.createLinearGradient(rect.x + 10, barY, rect.x + 10 + fillW, barY);
  g.addColorStop(0, "rgba(52,211,153,0.95)");
  g.addColorStop(1, "rgba(16,185,129,0.85)");
  ctx.fillStyle = g;
  drawRoundRect(rect.x + 10, barY, fillW, barH, Math.min(10, barH / 2));
  ctx.fill();

  ctx.fillStyle = "rgba(244,244,245,0.92)";
  ctx.font = `${Math.floor(rect.h * 0.34)}px ui-sans-serif, system-ui`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(label, rect.x + 12, rect.y + Math.floor(rect.h * 0.44));

  ctx.fillStyle = "rgba(161,161,170,0.95)";
  ctx.textAlign = "right";
  ctx.fillText(value.toFixed(2), rect.x + rect.w - 12, rect.y + Math.floor(rect.h * 0.44));
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

  const left = [];
  const right = [];

  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const yWorld = distance + t * lookahead;
    const c = centerX(yWorld);
    const hw = Math.max(1, halfWidth(yWorld));
    const scale = roadHalfPx / hw;
    const cx = w / 2 + c * scale;
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
  const stripePeriod = stripeH + stripeGap;
  const stripeShift = ((distance * 0.6) % stripePeriod + stripePeriod) % stripePeriod;
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = "#e5e7eb";
  for (let y = y1 + stripeShift; y > y0 - stripePeriod; y -= stripePeriod) {
    const yy = y;
    const t = clamp((y1 - yy) / (y1 - y0), 0, 1);
    const yWorld = distance + t * lookahead;
    const c = centerX(yWorld);
    const hw = Math.max(1, halfWidth(yWorld));
    const scale = roadHalfPx / hw;
    const cx = w / 2 + c * scale;
    drawRoundRect(cx - stripeW / 2, yy - stripeH, stripeW, stripeH, 3);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  const finishT = (finishDistance - distance) / lookahead;
  if (finishT > 0 && finishT < 1) {
    const y = lerp(y1, y0, finishT);
    const yWorld = finishDistance;
    const c = centerX(yWorld);
    const hw = Math.max(1, halfWidth(yWorld));
    const scale = roadHalfPx / hw;
    const cx = w / 2 + c * scale;
    drawFinishBand(cx, roadHalfPx, y);
  }

  const carMarkerY = h * 0.74;
  const carT = clamp((y1 - carMarkerY) / (y1 - y0), 0, 1);
  const carYWorld = distance + carT * lookahead;
  const carC = centerX(carYWorld);
  const carHw = Math.max(1, halfWidth(carYWorld));
  const carScale = roadHalfPx / carHw;
  const carCx = w / 2 + carC * carScale;
  const carMarkerX = carCx + (carX - carC) * carScale;
  
  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.strokeStyle = "rgba(244,244,245,0.18)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(carMarkerX, carMarkerY - 40);
  ctx.lineTo(carMarkerX, carMarkerY + 12);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = "rgba(244,244,245,0.22)";
  drawRoundRect(carMarkerX - 10, carMarkerY - 16, 20, 32, 6);
  ctx.fill();
  ctx.fillStyle = "rgba(52,211,153,0.92)";
  ctx.beginPath();
  ctx.save();
  ctx.translate(carMarkerX, carMarkerY - 18);
  ctx.rotate(heading);
  ctx.moveTo(0, -10);
  ctx.lineTo(8, 10);
  ctx.lineTo(-8, 10);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.restore();

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
  const inset = 12;

  const steps = 160;
  const ptsL = [];
  const ptsR = [];
  let minX = Infinity;
  let maxX = -Infinity;

  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const yWorld = t * finishDistance;
    const c = centerX(yWorld);
    const hw = halfWidth(yWorld);
    minX = Math.min(minX, c - hw);
    maxX = Math.max(maxX, c + hw);
    ptsL.push([c - hw, t]);
    ptsR.push([c + hw, t]);
  }

  const spanX = Math.max(1, maxX - minX);
  const sx = (mapW - inset * 2) / spanX;
  const sy = mapH - inset * 2;

  const mapX = (x) => x0 + inset + (x - minX) * sx;
  const mapY = (t) => y0 + inset + t * sy;

  ctx.save();
  ctx.fillStyle = "rgba(10,10,18,0.65)";
  drawRoundRect(x0, y0, mapW, mapH, 14);
  ctx.fill();
  ctx.strokeStyle = "rgba(52,211,153,0.35)";
  ctx.lineWidth = 1.5;
  drawRoundRect(x0 + 0.75, y0 + 0.75, mapW - 1.5, mapH - 1.5, 13);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(mapX(ptsL[0][0]), mapY(ptsL[0][1]));
  for (let i = 1; i < ptsL.length; i += 1) ctx.lineTo(mapX(ptsL[i][0]), mapY(ptsL[i][1]));
  for (let i = ptsR.length - 1; i >= 0; i -= 1) ctx.lineTo(mapX(ptsR[i][0]), mapY(ptsR[i][1]));
  ctx.closePath();
  ctx.fillStyle = "rgba(20,20,27,0.9)";
  ctx.fill();

  const startY = mapY(0);
  const finishY = mapY(1);
  ctx.strokeStyle = "rgba(244,244,245,0.55)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x0 + inset, startY);
  ctx.lineTo(x0 + mapW - inset, startY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x0 + inset, finishY);
  ctx.lineTo(x0 + mapW - inset, finishY);
  ctx.stroke();

  const carT = clamp(distance / finishDistance, 0, 1);
  const carPx = mapX(carX);
  const carPy = mapY(carT);
  ctx.save();
  ctx.translate(carPx, carPy);
  ctx.rotate(Math.PI + heading);
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

  const steerAngle = clamp(sim.heading * 2.5, -1.35, 1.35);
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
  drawRoundRect(pad, pad, boxW, 92, 16);
  ctx.fill();
  ctx.fillStyle = "rgba(244,244,245,0.92)";
  ctx.font = `${Math.max(12, Math.floor(w * 0.02))}px ui-sans-serif, system-ui`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("陀螺仪赛车 MVP", pad + 12, pad + 22);
  ctx.fillStyle = "rgba(161,161,170,0.9)";
  ctx.font = `${Math.max(10, Math.floor(w * 0.016))}px ui-sans-serif, system-ui`;
  ctx.fillText(`build ${state.build}`, pad + 12, pad + 42);
  ctx.fillText(`len ${finishDistance} / bends ${track.bends.length}`, pad + 12, pad + 60);
  ctx.fillStyle = "rgba(52,211,153,0.9)";
  ctx.fillText(`score ${state.score}  penalty ${state.penalty}`, pad + 12, pad + 80);
  ctx.restore();
};

const drawSetupUi = (w, h) => {
  ui.rects.clear();
  const portrait = h >= w * 1.05;
  const pad = Math.max(14, Math.floor(w * 0.03));
  const panelW = Math.min(w - pad * 2, 540);
  const x0 = (w - panelW) / 2;
  const y0 = portrait ? Math.floor(h * 0.18) : Math.floor(h * 0.62);
  const panelH = portrait ? Math.min(Math.floor(h * 0.72), 560) : h - y0 - pad;

  ctx.save();
  const bg = ctx.createLinearGradient(0, y0, 0, y0 + panelH);
  bg.addColorStop(0, "rgba(10,10,18,0.78)");
  bg.addColorStop(1, "rgba(9,9,11,0.55)");
  ctx.fillStyle = bg;
  drawRoundRect(x0, y0, panelW, panelH, 22);
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "rgba(244,244,245,0.12)";
  ctx.stroke();

  const base = Math.min(w, h);
  const titleFs = Math.max(14, Math.floor(base * (portrait ? 0.04 : 0.05)));
  const subFs = Math.max(11, Math.floor(base * (portrait ? 0.028 : 0.032)));

  ctx.fillStyle = "rgba(244,244,245,0.95)";
  ctx.font = `${titleFs}px ui-sans-serif, system-ui`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  const titleY = y0 + 34;
  ctx.fillText("陀螺仪赛车", x0 + 18, titleY);
  ctx.fillStyle = "rgba(161,161,170,0.95)";
  ctx.font = `${subFs}px ui-sans-serif, system-ui`;
  const subY = titleY + Math.floor(titleFs * 0.92) + 10;
  ctx.fillText("启用传感器 → 校准中位 → 开始", x0 + 18, subY);

  const btnH = portrait ? Math.max(52, Math.floor(h * 0.062)) : Math.max(44, Math.floor(h * 0.065));
  const gap = portrait ? 12 : 10;
  const innerPad = 18;
  const colW = (panelW - innerPad * 2 - gap) / 2;
  const rowY = subY + 18;

  const enableLabel = isPermissionPromptRequired() ? "启用传感器（点我）" : "启用传感器";
  drawButton("enable", enableLabel, { x: x0 + innerPad, y: rowY, w: panelW - innerPad * 2, h: btnH }, "primary");
  drawButton("calibrate", "校准中位", { x: x0 + innerPad, y: rowY + btnH + gap, w: colW, h: btnH }, "ghost");
  drawButton("touch", "触控模式", { x: x0 + innerPad + colW + gap, y: rowY + btnH + gap, w: colW, h: btnH }, "ghost");

  drawButton("start", "开始", { x: x0 + innerPad, y: rowY + (btnH + gap) * 2, w: panelW - innerPad * 2, h: btnH }, "primary");

  drawButton("fs", "横屏全屏", { x: x0 + innerPad, y: rowY + (btnH + gap) * 3, w: colW, h: btnH }, "ghost");
  drawButton("exitfs", "退出全屏", { x: x0 + innerPad + colW + gap, y: rowY + (btnH + gap) * 3, w: colW, h: btnH }, "ghost");

  const sliderY = rowY + (btnH + gap) * 4 + 8;
  const sliderH = portrait ? Math.max(44, Math.floor(h * 0.056)) : Math.max(38, Math.floor(h * 0.05));
  drawSlider("sensitivity", { x: x0 + innerPad, y: sliderY, w: panelW - innerPad * 2, h: sliderH }, state.sensitivity, 0.6, 8, "灵敏度");
  drawSlider(
    "steerStrength",
    { x: x0 + innerPad, y: sliderY + sliderH + 12, w: panelW - innerPad * 2, h: sliderH },
    state.steerStrength,
    0.4,
    2.5,
    "转向强度",
  );
  drawSlider(
    "returnRate",
    { x: x0 + innerPad, y: sliderY + (sliderH + 12) * 2, w: panelW - innerPad * 2, h: sliderH },
    state.returnRate,
    2,
    14,
    "回正速度",
  );

  ctx.fillStyle = "rgba(161,161,170,0.95)";
  ctx.font = `${Math.max(10, Math.floor(w * 0.018))}px ui-sans-serif, system-ui`;
  const t1 = `倾斜 ${state.tilt.toFixed(2)} / 平滑 ${state.tiltSmooth.toFixed(2)}`;
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
  const infoY = sliderY + (sliderH + 12) * 3 + 14;
  ctx.fillText(t1, x0 + innerPad, infoY + 18);
  ctx.fillText(t2, x0 + innerPad, infoY + 40);
  ctx.restore();
};

const drawRunUi = (w, h) => {
  ui.rects.clear();
  const pad = 14;
  const boxW = Math.min(w * 0.42, 270);
  ctx.save();
  ctx.fillStyle = "rgba(10,10,18,0.55)";
  drawRoundRect(pad, pad + 62, boxW, 68, 16);
  ctx.fill();
  ctx.fillStyle = "rgba(244,244,245,0.9)";
  ctx.font = `${Math.max(12, Math.floor(w * 0.018))}px ui-sans-serif, system-ui`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(`计时 ${formatMs(state.finishMs ?? state.elapsedMs)}`, pad + 12, pad + 92);
  ctx.fillStyle = "rgba(52,211,153,0.95)";
  ctx.font = `${Math.max(14, Math.floor(w * 0.02))}px ui-sans-serif, system-ui`;
  ctx.fillText(`得分 ${state.score}`, pad + 12, pad + 118);
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
  const tiltBase = clamp(mapped - state.calibration, -1, 1);
  state.tilt = tiltBase;
  state.tiltRaw = sensor.raw;

  const sensorSteer =
    state.inputMode === "sensor" && state.sensorEnabled ? tiltBase * sim.gyroFlip : tiltBase;

  const steerTarget = state.inputMode === "touch" || !state.sensorEnabled ? touch.steer : sensorSteer;

  const follow = 1 - Math.pow(0.001, dt);
  sim.steerSmooth = lerp(sim.steerSmooth, steerTarget, follow * 0.18);
  state.tiltSmooth = sim.steerSmooth;

  const maxHeadingRad = 0.85;
  const targetHeading = steerTarget * maxHeadingRad;
  sim.heading = lerp(sim.heading, targetHeading, 55 * dt);
  sim.steerAngle = sim.heading;

  if (state.status === "running") {
    sim.elapsedMs += dtMs;
    if (state.inputMode === "sensor" && state.sensorEnabled) {
      if (sim.elapsedMs >= sim.nextGyroFlipMs) {
        sim.gyroFlip *= -1;
        sim.nextGyroFlipMs = sim.elapsedMs + randRange(2500, 6500);
      }
    }

    const baseSpeed = 260;
    const y0 = h * 0.16;
    const y1 = h * 0.9;
    const carMarkerY = h * 0.74;
    const lookahead = 1100;
    const carT = clamp((y1 - carMarkerY) / (y1 - y0), 0, 1);
    const yCarWorld = sim.distance + carT * lookahead;
    const c = centerX(yCarWorld);
    const hw = halfWidth(yCarWorld);
    const roadHalfPx = Math.min(w * 0.28, 240);
    const scale = roadHalfPx / Math.max(1, hw);
    const carHalfPx = CAR_HALF_PX;
    const carHalf = carHalfPx / Math.max(0.001, scale);
    const cx = w / 2 + c * scale;
    const markerX = w / 2 + sim.x * scale;
    const leftWall = cx - roadHalfPx + carHalfPx;
    const rightWall = cx + roadHalfPx - carHalfPx;
    const wallNow = markerX <= leftWall || markerX >= rightWall;
    const speed = baseSpeed * (wallNow ? 0.55 : 1);

    sim.distance += speed * dt;

    const steer = sim.steerSmooth * state.sensitivity * state.steerStrength;
    sim.x += steer * speed * dt * 0.85;

    if (!touch.active && Math.abs(steerTarget) < 0.02) {
      sim.x *= Math.pow(0.92, (dtMs / 16.7) * (state.returnRate / 7.5));
    }

    const yCarWorldNew = sim.distance + carT * lookahead;
    const nc = centerX(yCarWorldNew);
    const nhw = halfWidth(yCarWorldNew);
    const nscale = roadHalfPx / Math.max(1, nhw);
    const ncx = w / 2 + nc * nscale;
    const rawMarkerX = w / 2 + sim.x * nscale;
    const left = ncx - roadHalfPx + carHalfPx;
    const right = ncx + roadHalfPx - carHalfPx;
    const clampedMarkerX = clamp(rawMarkerX, left, right);
    const hitWall = Math.abs(rawMarkerX - clampedMarkerX) >= WALL_HIT_EPS_PX;
    if (hitWall && sim.elapsedMs - sim.lastPenaltyMs > 250) {
      sim.lastPenaltyMs = sim.elapsedMs;
      const delta = 1;
      state.penalty += delta;
      sim.lastPenaltyDelta = delta;
      sim.penaltyFlashUntil = sim.elapsedMs + 520;
    }
    sim.x = (clampedMarkerX - w / 2) / Math.max(0.001, nscale);

    if (sim.distance >= finishDistance) {
      sim.distance = finishDistance;
      if (state.finishMs == null) state.finishMs = Math.max(0, Math.floor(sim.elapsedMs));
      state.score = calcScore(state.finishMs, state.penalty);
      state.status = "setup";
    }
  }

  const y0 = h * 0.16;
  const y1 = h * 0.9;
  const carMarkerY = h * 0.74;
  const lookahead = 1100;
  const carT = clamp((y1 - carMarkerY) / (y1 - y0), 0, 1);
  const yCarWorldNow = sim.distance + carT * lookahead;
  const cNow = centerX(yCarWorldNow);
  const hwNow = halfWidth(yCarWorldNow);
  const roadHalfPxNow = Math.min(w * 0.28, 240);
  const scaleNow = roadHalfPxNow / Math.max(1, hwNow);
  const cxNow = w / 2 + cNow * scaleNow;
  const carHalfPxNow = CAR_HALF_PX;
  const markerNow = w / 2 + sim.x * scaleNow;
  const offroadNow =
    state.status === "running" &&
    (markerNow <= cxNow - roadHalfPxNow + carHalfPxNow ||
      markerNow >= cxNow + roadHalfPxNow - carHalfPxNow);
  const speedNow = state.status === "running" ? 260 * (offroadNow ? 0.55 : 1) : 0;
  sim.roadAngle = roadAngleAt(yCarWorldNow);

  state.elapsedMs = Math.max(0, Math.floor(sim.elapsedMs));
  state.distance = sim.distance;
  state.speed = speedNow;
  state.offroad = offroadNow;
  state.penalty = Math.max(0, Math.floor(state.penalty));
  state.score = calcScore(state.finishMs ?? state.elapsedMs, state.penalty);

  drawFrame(w, h);
};

const drawFrame = (w, h) => {
  ctx.clearRect(0, 0, w, h);
  drawSky(w, h);
  const heading = sim.roadAngle + sim.heading;
  drawRoadFlat(w, h, sim.x, sim.distance, heading);
  drawMiniMap(w, h, sim.x, sim.distance, state.offroad, heading);
  drawCockpit(w, h, state.offroad);
  drawTopHud(w, h);
  if (state.status === "running" && sim.penaltyFlashUntil > sim.elapsedMs) {
    const k = clamp((sim.penaltyFlashUntil - sim.elapsedMs) / 520, 0, 1);
    ctx.save();
    ctx.globalAlpha = 0.25 + 0.55 * k;
    ctx.fillStyle = "rgba(248,113,113,0.55)";
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = "rgba(248,113,113,0.98)";
    ctx.font = `${Math.max(26, Math.floor(w * 0.06))}px ui-sans-serif, system-ui`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`-${sim.lastPenaltyDelta}`, w * 0.5, h * 0.42);
    ctx.restore();
  }
  if (state.status === "running") drawRunUi(w, h);
  else drawSetupUi(w, h);
  if (state.status !== "running" && state.finishMs != null) {
    ctx.save();
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = "rgba(10,10,18,0.72)";
    const bw = Math.min(w * 0.78, 520);
    const bh = Math.min(h * 0.26, 220);
    const bx = (w - bw) / 2;
    const by = h * 0.22;
    drawRoundRect(bx, by, bw, bh, 22);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = "rgba(52,211,153,0.98)";
    ctx.font = `${Math.max(34, Math.floor(w * 0.08))}px ui-sans-serif, system-ui`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`得分 ${state.score}`, w * 0.5, by + bh * 0.42);
    ctx.fillStyle = "rgba(244,244,245,0.9)";
    ctx.font = `${Math.max(14, Math.floor(w * 0.022))}px ui-sans-serif, system-ui`;
    ctx.fillText(`用时 ${formatMs(state.finishMs)}   扣分 ${state.penalty}`, w * 0.5, by + bh * 0.78);
    ctx.restore();
  }
};

const loop = (t) => {
  updateSim(t);
  requestAnimationFrame(loop);
};

requestAnimationFrame(loop);
