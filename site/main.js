const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const lerp = (a, b, t) => a + (b - a) * t;
const randRange = (min, max) => min + (max - min) * Math.random();
const BUILD_ID = "20260517-24";
const SCORE_BASE = 100;
const calcScore = (_ms, penalty) => Math.max(0, SCORE_BASE - penalty);
const CAR_HALF_PX = 10;
const WALL_HIT_EPS_PX = 1;
const VIEW_Y0_T = 0;
const VIEW_Y1_T = 0.92;
const CAR_MARKER_Y_T = 0.74;

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
    light: "rgba(255,255,255,0.96)",
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
  g.save();
  g.globalCompositeOperation = "source-atop";
  g.fillStyle = shadowGrad;
  g.fillRect(0, 0, w, h);
  g.restore();

  return { canvas: off, w, h, ax: w / 2, ay: h / 2 };
};

const playerSprite = createHypercarSprite({ scale: 2 });

const makeHeadlightGlow = (tone) => {
  const pad = 26;
  const canvas = document.createElement("canvas");
  canvas.width = playerSprite.w + pad * 2;
  canvas.height = playerSprite.h + pad * 2;
  const g = canvas.getContext("2d");
  if (!g) return null;

  const cx = pad + playerSprite.w * 0.5;
  const cy = pad + playerSprite.h * 0.223;
  const dx = playerSprite.w * 0.22;
  const rx = playerSprite.w * 0.10;
  const ry = playerSprite.h * 0.06;

  const glowOuter =
    tone === "danger" ? "rgba(248,113,113,0.95)" : "rgba(220,240,255,0.85)";
  const glowInner =
    tone === "danger" ? "rgba(255,200,200,0.92)" : "rgba(255,255,255,0.92)";

  g.save();
  g.globalCompositeOperation = "screen";
  g.shadowColor = glowOuter;
  g.shadowBlur = 36;
  g.fillStyle = glowOuter;
  g.beginPath();
  g.ellipse(cx - dx, cy, rx, ry, -0.55, 0, Math.PI * 2);
  g.ellipse(cx + dx, cy, rx, ry, 0.55, 0, Math.PI * 2);
  g.fill();
  g.shadowBlur = 14;
  g.fillStyle = glowInner;
  g.beginPath();
  g.ellipse(cx - dx, cy, rx * 0.55, ry * 0.55, -0.55, 0, Math.PI * 2);
  g.ellipse(cx + dx, cy, rx * 0.55, ry * 0.55, 0.55, 0, Math.PI * 2);
  g.fill();
  g.restore();

  return { canvas, ax: playerSprite.ax + pad, ay: playerSprite.ay + pad };
};

const playerGlowNormal = makeHeadlightGlow("normal");
const playerGlowDanger = makeHeadlightGlow("danger");

const drawPlayerSprite = (x, y, angleRad, sizePx, offroad, danger) => {
  const s = Math.max(0.001, sizePx / playerSprite.h);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angleRad);
  ctx.scale(s, s);

  const hx = playerSprite.w * 0.22;
  const hy = -playerSprite.h * 0.277;
  const beamLen = playerSprite.h * 0.95;
  const beamW = playerSprite.w * 0.26;
  const beam = ctx.createLinearGradient(0, hy, 0, hy - beamLen);
  if (danger) {
    beam.addColorStop(0, "rgba(248,113,113,0.28)");
    beam.addColorStop(0.25, "rgba(248,113,113,0.14)");
    beam.addColorStop(1, "rgba(248,113,113,0)");
  } else {
    beam.addColorStop(0, "rgba(255,255,255,0.32)");
    beam.addColorStop(0.25, "rgba(220,240,255,0.18)");
    beam.addColorStop(1, "rgba(220,240,255,0)");
  }

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.fillStyle = beam;
  ctx.globalAlpha = 1;
  for (const sx of [-hx, hx]) {
    ctx.beginPath();
    ctx.moveTo(sx - beamW * 0.26, hy + 2);
    ctx.lineTo(sx + beamW * 0.26, hy + 2);
    ctx.lineTo(sx + beamW, hy - beamLen);
    ctx.lineTo(sx - beamW, hy - beamLen);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  const glow = danger ? playerGlowDanger : playerGlowNormal;
  if (glow) ctx.drawImage(glow.canvas, -glow.ax, -glow.ay);

  ctx.shadowColor = "rgba(0,0,0,0.65)";
  ctx.shadowBlur = 8;
  ctx.drawImage(playerSprite.canvas, -playerSprite.ax, -playerSprite.ay);
  ctx.shadowBlur = 0;
  if (offroad) {
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = "rgba(248,113,113,0.45)";
    ctx.beginPath();
    ctx.ellipse(0, 0, playerSprite.w * 0.22, playerSprite.h * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
};

const tracks = {
  track1: {
    id: "track1",
    name: "赛道1",
    finishDistance: 12400,
    baseSpeed: 260,
    halfWidth: 250,
    narrowSegments: [{ start: 3600, length: 1100, minHalfWidth: 90 }],
    riskZones: [{ start: 2100, end: 2800, bonus: 5 }],
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
    elevation: () => 0,
  },
  trackMid: {
    id: "trackMid",
    name: "赛道（中难）",
    finishDistance: 12800,
    baseSpeed: 265,
    halfWidth: 232,
    narrowSegments: [
      { start: 5200, length: 900, minHalfWidth: 82 },
      { start: 9100, length: 980, minHalfWidth: 78 },
    ],
    riskZones: [{ start: 2500, end: 3200, bonus: 5 }],
    bends: [
      { start: 110, length: 640, amp: -320 },
      { start: 1120, length: 620, amp: 360 },
      { start: 2180, length: 600, amp: -340 },
      { start: 3160, length: 720, amp: 420 },
      { start: 4340, length: 660, amp: -380 },
      { start: 5420, length: 720, amp: 360 },
      { start: 6740, length: 700, amp: -440 },
      { start: 7920, length: 760, amp: 380 },
      { start: 9280, length: 720, amp: -420 },
      { start: 10780, length: 860, amp: 360 },
    ],
    elevation: (y) => 55 * Math.sin(y * 0.00125) + 28 * Math.sin(y * 0.00255 + 0.9),
  },
  track2: {
    id: "track2",
    name: "赛道2（高难）",
    finishDistance: 13200,
    baseSpeed: 270,
    halfWidth: 210,
    bends: [
      { start: 90, length: 520, amp: -360 },
      { start: 860, length: 460, amp: 420 },
      { start: 1500, length: 520, amp: -460 },
      { start: 2280, length: 480, amp: 520 },
      { start: 3000, length: 520, amp: -420 },
      { start: 3720, length: 500, amp: 500 },
      { start: 4520, length: 520, amp: -520 },
      { start: 5340, length: 520, amp: 460 },
      { start: 6120, length: 560, amp: -540 },
      { start: 7000, length: 520, amp: 520 },
      { start: 7820, length: 560, amp: -500 },
      { start: 8660, length: 520, amp: 520 },
      { start: 9520, length: 580, amp: -560 },
      { start: 10440, length: 600, amp: 540 },
      { start: 11420, length: 640, amp: -520 },
    ],
    elevation: (y) =>
      95 * Math.sin(y * 0.00115) +
      70 * Math.sin(y * 0.00235 + 0.9) +
      32 * Math.sin(y * 0.0037 + 2.1),
  },
};

const bendShape = (t) => {
  const u = clamp(t, 0, 1);
  return u * u * (3 - 2 * u);
};

const state = {
  status: "setup",
  inputMode: "sensor",
  trackId: "track1",
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
  bonus: 0,
  score: 0,
  finishMs: null,
  animMs: 0,
  playerName: "你",
  lastResult: null,
  build: (import.meta?.env?.VITE_BUILD_ID ?? BUILD_ID).slice(0, 16),
};

const getTrack = () => tracks[state.trackId] ?? tracks.track1;

const getRiskZone = (trackId) => {
  const t = tracks[trackId] ?? tracks.track1;
  if (Array.isArray(t.riskZones) && t.riskZones.length) {
    const z = t.riskZones[0];
    if (z && typeof z.start === "number" && typeof z.end === "number") {
      return { start: z.start, end: z.end, bonus: z.bonus ?? 5, entered: false, invalid: false, done: false };
    }
  }
  const fd = Math.max(1, t.finishDistance || 1);
  const start = Math.floor(fd * 0.28);
  const len = Math.min(1100, Math.max(520, Math.floor(fd * 0.1)));
  const end = Math.min(fd - 160, start + len);
  if (end <= start + 200) return null;
  return { start, end, bonus: 5, entered: false, invalid: false, done: false };
};

const elevation = (y) => getTrack().elevation(y);

const centerX = (y) => {
  let x = 0;
  for (const b of getTrack().bends) {
    const t = (y - b.start) / b.length;
    x += b.amp * bendShape(t);
  }
  return x;
};

const getNarrowSegment = (y) => {
  const list = getTrack().narrowSegments;
  if (!Array.isArray(list) || typeof y !== "number") return null;
  for (const seg of list) {
    const start = seg?.start ?? 0;
    const len = seg?.length ?? 0;
    const end = start + len;
    if (y >= start && y <= end) return seg;
  }
  return null;
};

const halfWidth = (y = 0) => {
  const base = getTrack().halfWidth;
  const seg = getNarrowSegment(y);
  if (seg) {
    const start = seg.start ?? 0;
    const len = Math.max(1, seg.length ?? 0);
    const t = clamp((y - start) / len, 0, 1);
    const ease = Math.sin(Math.PI * t);
    const minW =
      typeof seg.minHalfWidth === "number"
        ? seg.minHalfWidth
        : typeof seg.halfWidth === "number"
          ? seg.halfWidth
          : base;
    return lerp(base, Math.min(base, minW), ease);
  }
  return base;
};

const roadAngleAt = (y) => {
  const eps = 14;
  const d = (centerX(y + eps) - centerX(y - eps)) / (2 * eps);
  return Math.atan(d);
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
  prevDistance: 0,
  elapsedMs: 0,
  steerSmooth: 0,
  steerAngle: 0,
  gyroFlip: 1,
  nextGyroFlipMs: 0,
  lastPenaltyMs: 0,
  penaltyFlashUntil: 0,
  lastPenaltyDelta: 0,
  risk: null,
  bonusFlashUntil: 0,
  bonusLast: 0,
  toastUntil: 0,
  toastText: "",
  toastKind: "info",
  narrowSeen: new Set(),
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

const lowEnd =
  typeof navigator !== "undefined" &&
  ((typeof navigator.deviceMemory === "number" && navigator.deviceMemory <= 4) ||
    (typeof navigator.hardwareConcurrency === "number" && navigator.hardwareConcurrency <= 4));

const perf = {
  frame: 0,
  renderEvery: lowEnd ? 2 : 1,
  maxDpr: lowEnd ? 1 : 1.25,
};

const dpr = () => {
  const raw = Math.max(1, window.devicePixelRatio || 1);
  return Math.min(raw, perf.maxDpr);
};

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
  state.bonus = 0;
  state.score = SCORE_BASE;
  state.tiltSmooth = 0;
  sim.x = 0;
  sim.heading = 0;
  sim.roadAngle = 0;
  sim.distance = 0;
  sim.prevDistance = 0;
  sim.elapsedMs = 0;
  sim.steerSmooth = 0;
  sim.steerAngle = 0;
  sim.gyroFlip = 1;
  sim.nextGyroFlipMs = randRange(2500, 6500);
  sim.lastPenaltyMs = 0;
  sim.penaltyFlashUntil = 0;
  sim.lastPenaltyDelta = 0;
  sim.risk = getRiskZone(state.trackId);
  sim.bonusFlashUntil = 0;
  sim.bonusLast = 0;
  sim.toastUntil = 0;
  sim.toastText = "";
  sim.toastKind = "info";
  sim.narrowSeen = new Set();
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
    const exitBtn = ui.rects.get("exitfs");
    if (exitBtn && hit(p.x, p.y, exitBtn)) {
      handleButton("exitfs");
      return;
    }
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

  for (const key of ["track1", "trackMid", "track2", "enable", "calibrate", "start", "touch", "fs", "exitfs", "again", "share", "back"]) {
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
  if (key === "track1") {
    state.trackId = "track1";
    resetAll();
  }
  if (key === "trackMid") {
    state.trackId = "trackMid";
    resetAll();
  }
  if (key === "track2") {
    state.trackId = "track2";
    resetAll();
  }
  if (key === "enable") enableSensor();
  if (key === "calibrate") calibrate();
  if (key === "start") startRun();
  if (key === "touch") setInputTouch();
  if (key === "fs") toggleFullscreenLandscape();
  if (key === "exitfs") exitFullscreen();
  if (key === "again") startRun();
  if (key === "share" && state.lastResult) openShare(state.lastResult);
  if (key === "back") {
    state.finishMs = null;
    state.lastResult = null;
    state.status = "setup";
  }
};

const formatMs = (ms) => {
  const s = ms / 1000;
  const m = Math.floor(s / 60);
  const r = s - m * 60;
  return `${m}:${r.toFixed(2).padStart(5, "0")}`;
};

const storage = {
  scores: "betry_scores_v1",
  friends: "betry_friends_v1",
};

const safeParse = (raw, fallback) => {
  try {
    if (typeof raw !== "string" || !raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

const safeGet = (key, fallback) => {
  try {
    return safeParse(localStorage.getItem(key), fallback);
  } catch {
    return fallback;
  }
};

const safeSet = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    return;
  }
};

const hash32 = (s) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

const makeRng = (seed0) => {
  let seed = seed0 >>> 0;
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
};

const friendNames = ["Astra", "Neo", "Kira", "Luna", "Zed", "Momo", "Rin", "Kai"];

const getFriends = (trackId) => {
  const all = safeGet(storage.friends, {});
  if (Array.isArray(all?.[trackId]) && all[trackId].length) return all[trackId];
  const rng = makeRng(hash32(`friends:${trackId}`));
  const list = friendNames.slice(0, 6).map((name) => {
    const penalty = Math.floor(rng() * 26);
    const timeMs = Math.floor(52000 + rng() * 52000);
    const score = calcScore(timeMs, penalty);
    return {
      id: `f_${trackId}_${hash32(name)}`,
      name,
      trackId,
      score,
      timeMs,
      penalty,
      ts: 0,
      kind: "friend",
    };
  });
  all[trackId] = list;
  safeSet(storage.friends, all);
  return list;
};

const recordScore = (entry) => {
  const list = safeGet(storage.scores, []);
  const arr = Array.isArray(list) ? list : [];
  arr.unshift(entry);
  safeSet(storage.scores, arr.slice(0, 50));
};

const getMyScores = (trackId) => {
  const list = safeGet(storage.scores, []);
  if (!Array.isArray(list)) return [];
  return list.filter((x) => x && x.trackId === trackId && x.kind === "me");
};

const getLeaderboard = (trackId, lastEntry) => {
  const friends = getFriends(trackId);
  const mine = getMyScores(trackId);
  const items = [...friends, ...mine];
  if (lastEntry) items.push(lastEntry);
  const uniq = new Map();
  for (const it of items) {
    if (!it || !it.id) continue;
    if (!uniq.has(it.id)) uniq.set(it.id, it);
  }
  const rows = Array.from(uniq.values());
  rows.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if ((a.timeMs ?? 0) !== (b.timeMs ?? 0)) return (a.timeMs ?? 0) - (b.timeMs ?? 0);
    return (b.ts ?? 0) - (a.ts ?? 0);
  });
  return rows.slice(0, 8);
};

const makeShareText = (entry, rank) => {
  const trackLabel = getTrack().name ?? state.trackId;
  const time = entry?.timeMs != null ? formatMs(entry.timeMs) : "";
  const score = entry?.score ?? 0;
  const penalty = entry?.penalty ?? 0;
  const bonus = entry?.bonus ?? 0;
  const rk = typeof rank === "number" ? `第${rank + 1}名` : "";
  const b = bonus > 0 ? `｜净跑奖励 +${bonus}` : "";
  return `零点漂移｜${trackLabel}｜得分 ${score}${b}｜用时 ${time}｜扣分 ${penalty}${rk ? `｜好友榜 ${rk}` : ""}`;
};

const makeShareImage = (entry, rank) => {
  try {
    const c = document.createElement("canvas");
    c.width = 960;
    c.height = 540;
    const g = c.getContext("2d");
    if (!g) return "";
    const rr = (x, y, w, h, r) => {
      const rr0 = Math.min(r, w / 2, h / 2);
      g.beginPath();
      g.moveTo(x + rr0, y);
      g.lineTo(x + w - rr0, y);
      g.quadraticCurveTo(x + w, y, x + w, y + rr0);
      g.lineTo(x + w, y + h - rr0);
      g.quadraticCurveTo(x + w, y + h, x + w - rr0, y + h);
      g.lineTo(x + rr0, y + h);
      g.quadraticCurveTo(x, y + h, x, y + h - rr0);
      g.lineTo(x, y + rr0);
      g.quadraticCurveTo(x, y, x + rr0, y);
      g.closePath();
    };

    const bg = g.createLinearGradient(0, 0, 0, c.height);
    bg.addColorStop(0, "#050510");
    bg.addColorStop(1, "#09091a");
    g.fillStyle = bg;
    g.fillRect(0, 0, c.width, c.height);

    const glow = g.createRadialGradient(c.width * 0.42, c.height * 0.35, 20, c.width * 0.42, c.height * 0.35, c.width * 0.7);
    glow.addColorStop(0, "rgba(34,211,238,0.18)");
    glow.addColorStop(0.55, "rgba(244,114,182,0.08)");
    glow.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = glow;
    g.fillRect(0, 0, c.width, c.height);

    const pad = 42;
    rr(pad, pad, c.width - pad * 2, c.height - pad * 2, 26);
    g.fillStyle = "rgba(10,10,18,0.72)";
    g.fill();
    g.lineWidth = 2;
    g.strokeStyle = "rgba(34,211,238,0.28)";
    g.stroke();

    g.font = "700 44px ui-sans-serif, system-ui";
    g.textAlign = "left";
    g.textBaseline = "alphabetic";
    g.fillStyle = "rgba(240,253,255,0.92)";
    g.fillText("零点漂移", pad + 28, pad + 72);

    const trackLabel = getTrack().name ?? state.trackId;
    g.font = "600 20px ui-sans-serif, system-ui";
    g.fillStyle = "rgba(167,243,208,0.92)";
    g.fillText(String(trackLabel), pad + 28, pad + 106);

    const score = entry?.score ?? 0;
    const time = entry?.timeMs != null ? formatMs(entry.timeMs) : "";
    const penalty = entry?.penalty ?? 0;
    const bonus = entry?.bonus ?? 0;
    g.font = "700 56px ui-sans-serif, system-ui";
    g.fillStyle = "rgba(34,211,238,0.92)";
    g.fillText(`得分 ${score}`, pad + 28, pad + 182);

    g.font = "600 26px ui-sans-serif, system-ui";
    g.fillStyle = "rgba(226,232,240,0.86)";
    g.fillText(`用时 ${time}`, pad + 28, pad + 232);
    g.fillText(`扣分 ${penalty}${bonus > 0 ? ` ｜净跑+${bonus}` : ""}`, pad + 28, pad + 272);

    if (typeof rank === "number") {
      g.font = "700 26px ui-sans-serif, system-ui";
      g.fillStyle = "rgba(244,114,182,0.9)";
      g.fillText(`好友榜 第${rank + 1}名`, pad + 28, pad + 318);
    }

    const boxW = 312;
    const boxH = 312;
    const boxX = c.width - pad - 28 - boxW;
    const boxY = pad + 118;
    g.save();
    rr(boxX, boxY, boxW, boxH, 22);
    g.fillStyle = "rgba(9,9,16,0.55)";
    g.fill();
    g.lineWidth = 2;
    g.strokeStyle = "rgba(34,211,238,0.28)";
    g.stroke();
    g.clip();

    const glow2 = g.createRadialGradient(
      boxX + boxW * 0.5,
      boxY + boxH * 0.45,
      10,
      boxX + boxW * 0.5,
      boxY + boxH * 0.45,
      boxW * 0.78,
    );
    glow2.addColorStop(0, "rgba(34,211,238,0.22)");
    glow2.addColorStop(0.52, "rgba(244,114,182,0.10)");
    glow2.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = glow2;
    g.fillRect(boxX, boxY, boxW, boxH);

    const s = Math.min((boxW * 0.74) / playerSprite.w, (boxH * 0.92) / playerSprite.h);
    g.save();
    g.translate(boxX + boxW / 2, boxY + boxH / 2 + 10);
    g.rotate(-0.18);
    g.scale(s, s);
    const glowSprite = playerGlowNormal;
    if (glowSprite) {
      g.save();
      g.globalCompositeOperation = "screen";
      g.globalAlpha = 0.92;
      g.shadowColor = "rgba(34,211,238,0.55)";
      g.shadowBlur = 18;
      g.drawImage(glowSprite.canvas, -glowSprite.ax, -glowSprite.ay);
      g.restore();
    }
    g.shadowColor = "rgba(0,0,0,0.62)";
    g.shadowBlur = 14;
    g.drawImage(playerSprite.canvas, -playerSprite.ax, -playerSprite.ay);
    g.restore();
    g.restore();

    g.globalAlpha = 0.6;
    g.fillStyle = "rgba(34,211,238,0.22)";
    rr(pad + 28, c.height - pad - 64, c.width - pad * 2 - 56, 36, 18);
    g.fill();
    g.globalAlpha = 1;
    g.font = "600 16px ui-sans-serif, system-ui";
    g.fillStyle = "rgba(226,232,240,0.75)";
    g.fillText("扫码进入，挑战你的好友榜", pad + 44, c.height - pad - 38);

    return c.toDataURL("image/png");
  } catch {
    return "";
  }
};

const openShare = (entry) => {
  const list = getLeaderboard(entry.trackId, entry);
  const idx = list.findIndex((x) => x && x.id === entry.id);
  const text = makeShareText(entry, idx >= 0 ? idx : undefined);
  const image = makeShareImage(entry, idx >= 0 ? idx : undefined);
  window.dispatchEvent(new CustomEvent("betry:share", { detail: { text, image } }));
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
  const t = (state.elapsedMs || 0) * 0.001;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#04040a");
  g.addColorStop(0.55, "#05050f");
  g.addColorStop(1, "#070712");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  const horizonY = h * 0.46;
  ctx.save();
  const glow = ctx.createRadialGradient(w * 0.5, horizonY, 10, w * 0.5, horizonY, Math.max(w, h) * 0.82);
  glow.addColorStop(0, "rgba(34,211,238,0.16)");
  glow.addColorStop(0.42, "rgba(244,114,182,0.08)");
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.55;
  for (let i = 0; i < 64; i += 1) {
    const x = (w * ((i * 53) % 257)) / 257;
    const y = (h * ((i * 97) % 233)) / 233;
    const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 0.8 + i * 1.7));
    const r = 0.8 + ((i * 19) % 4) * 0.55;
    ctx.globalAlpha = 0.08 + tw * 0.16;
    ctx.fillStyle = i % 7 === 0 ? "rgba(34,211,238,0.85)" : "rgba(226,232,240,0.75)";
    ctx.beginPath();
    ctx.arc(x, y * 0.5, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
};

const drawPostFx = (w, h) => {
  ctx.save();
  const v = ctx.createRadialGradient(w * 0.5, h * 0.55, Math.min(w, h) * 0.2, w * 0.5, h * 0.55, Math.max(w, h) * 0.72);
  v.addColorStop(0, "rgba(0,0,0,0)");
  v.addColorStop(1, "rgba(0,0,0,0.4)");
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
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

const drawRoadFlat = (w, h, carX, distance, heading, danger) => {
  const y0 = h * VIEW_Y0_T;
  const y1 = h * VIEW_Y1_T;
  const steps = 34;
  const lookahead = 1100;
  const roadHalfPxBase = Math.min(w * 0.28, 240);
  const baseHw = Math.max(1, getTrack().halfWidth);
  const elevScale = Math.min(0.11, h * 0.00018);

  const left = [];
  const right = [];
  let spanL = Infinity;
  let spanR = -Infinity;

  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const yWorld = distance + t * lookahead;
    const c = centerX(yWorld) - carX;
    const hw = Math.max(1, halfWidth(yWorld));
    const roadHalfPx = roadHalfPxBase * clamp(hw / baseHw, 0.3, 1);
    const scale = roadHalfPx / hw;
    const cx = w / 2 + c * scale;
    const elev = elevation(yWorld);
    const y = clamp(lerp(y1, y0, t) - elev * elevScale * (1 - t * 0.15), y0, y1);
    left.push([cx - roadHalfPx, y]);
    right.push([cx + roadHalfPx, y]);
    spanL = Math.min(spanL, cx - roadHalfPx);
    spanR = Math.max(spanR, cx + roadHalfPx);
  }

  ctx.save();
  ctx.fillStyle = "rgba(6,8,14,1)";
  ctx.fillRect(0, y0, w, y1 - y0);

  const asphalt = ctx.createLinearGradient(0, y0, 0, y1);
  asphalt.addColorStop(0, "rgba(12,14,24,0.92)");
  asphalt.addColorStop(1, "rgba(5,6,12,0.98)");

  ctx.beginPath();
  ctx.moveTo(left[0][0], left[0][1]);
  for (let i = 1; i < left.length; i += 1) ctx.lineTo(left[i][0], left[i][1]);
  for (let i = right.length - 1; i >= 0; i -= 1) ctx.lineTo(right[i][0], right[i][1]);
  ctx.closePath();
  ctx.fillStyle = asphalt;
  ctx.fill();

  ctx.save();
  ctx.clip();
  const highlight = ctx.createLinearGradient(spanL, 0, spanR, 0);
  highlight.addColorStop(0, "rgba(255,255,255,0)");
  highlight.addColorStop(0.46, "rgba(255,255,255,0.14)");
  highlight.addColorStop(0.54, "rgba(255,255,255,0.10)");
  highlight.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = highlight;
  ctx.fillRect(spanL, y0, spanR - spanL, y1 - y0);
  ctx.restore();

  const edgeW = Math.max(3, Math.floor(w * 0.006));
  ctx.lineWidth = edgeW;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const leftEdge = danger ? "rgba(248,113,113,0.95)" : "rgba(34,211,238,0.92)";
  const rightEdge = danger ? "rgba(248,113,113,0.95)" : "rgba(244,114,182,0.90)";

  ctx.beginPath();
  ctx.moveTo(left[0][0], left[0][1]);
  for (let i = 1; i < left.length; i += 1) ctx.lineTo(left[i][0], left[i][1]);
  ctx.strokeStyle = leftEdge;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(right[0][0], right[0][1]);
  for (let i = 1; i < right.length; i += 1) ctx.lineTo(right[i][0], right[i][1]);
  ctx.strokeStyle = rightEdge;
  ctx.stroke();

  const stripeH = 26;
  const stripeW = 6;
  const stripeGap = 26;
  const stripePeriod = stripeH + stripeGap;
  const stripeShift = ((distance * 0.6) % stripePeriod + stripePeriod) % stripePeriod;
  ctx.globalAlpha = danger ? 0.55 : 0.42;
  ctx.fillStyle = danger ? "rgba(248,113,113,0.95)" : "rgba(34,211,238,0.9)";
  for (let y = y1 + stripeShift; y > y0 - stripePeriod; y -= stripePeriod) {
    const yy = y;
    const t = clamp((y1 - yy) / (y1 - y0), 0, 1);
    const yWorld = distance + t * lookahead;
    const c = centerX(yWorld) - carX;
    const hw = Math.max(1, halfWidth(yWorld));
    const roadHalfPx = roadHalfPxBase * clamp(hw / baseHw, 0.3, 1);
    const scale = roadHalfPx / hw;
    const cx = w / 2 + c * scale;
    const elev = elevation(yWorld);
    const yAdj = clamp(yy - elev * elevScale * (1 - t * 0.15), y0, y1);
    drawRoundRect(cx - stripeW / 2, yAdj - stripeH, stripeW, stripeH, 3);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  const finishT = (getTrack().finishDistance - distance) / lookahead;
  if (finishT > 0 && finishT < 1) {
    const yWorld = getTrack().finishDistance;
    const c = centerX(yWorld) - carX;
    const hw = Math.max(1, halfWidth(yWorld));
    const roadHalfPx = roadHalfPxBase * clamp(hw / baseHw, 0.3, 1);
    const scale = roadHalfPx / hw;
    const cx = w / 2 + c * scale;
    const elev = elevation(yWorld);
    const y = clamp(
      lerp(y1, y0, finishT) - elev * elevScale * (1 - finishT * 0.15),
      y0,
      y1,
    );
    drawFinishBand(cx, roadHalfPx, y);
  }

  const carMarkerY = h * CAR_MARKER_Y_T;
  const carMarkerX = w / 2;
  
  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.strokeStyle = "rgba(15,23,42,0.12)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(carMarkerX, carMarkerY - 40);
  ctx.lineTo(carMarkerX, carMarkerY + 12);
  ctx.stroke();
  ctx.globalAlpha = 1;
  const sizePx = clamp(Math.min(w, h) * 0.11, 46, 88);
  drawPlayerSprite(carMarkerX, carMarkerY - 14, heading, sizePx, state.offroad, danger);
  ctx.restore();

  const fog = ctx.createLinearGradient(0, y0, 0, y1);
  fog.addColorStop(0, "rgba(0,0,0,0.62)");
  fog.addColorStop(0.35, "rgba(0,0,0,0.16)");
  fog.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = fog;
  ctx.fillRect(0, y0, w, y1 - y0);
  ctx.restore();
};

const drawMiniMap = (w, h, carX, distance, offroad, heading, danger) => {
  const pad = 14;
  const mapW = Math.min(w * 0.34, 260);
  const mapH = mapW * 0.72;
  const x0 = w - pad - mapW;
  const y0 = pad;
  const y1 = y0 + mapH;
  const inset = 12;
  const fd = getTrack().finishDistance;

  if (!drawMiniMap.cache || drawMiniMap.cache.trackId !== state.trackId) {
    const steps = 96;
    const ptsL = [];
    const ptsR = [];
    let minX = Infinity;
    let maxX = -Infinity;
    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      const yWorld = t * fd;
      const c = centerX(yWorld);
      const hw = halfWidth(yWorld);
      minX = Math.min(minX, c - hw);
      maxX = Math.max(maxX, c + hw);
      ptsL.push([c - hw, t]);
      ptsR.push([c + hw, t]);
    }
    drawMiniMap.cache = { trackId: state.trackId, ptsL, ptsR, minX, maxX };
  }

  const cache = drawMiniMap.cache;
  const ptsL = cache.ptsL;
  const ptsR = cache.ptsR;
  const spanX = Math.max(1, cache.maxX - cache.minX);
  const sx = (mapW - inset * 2) / spanX;
  const sy = mapH - inset * 2;

  const mapX = (x) => x0 + inset + (x - cache.minX) * sx;
  const mapY = (t) => y0 + inset + t * sy;

  ctx.save();
  ctx.fillStyle = "rgba(15,23,42,0.62)";
  drawRoundRect(x0, y0, mapW, mapH, 14);
  ctx.fill();
  ctx.strokeStyle = "rgba(226,232,240,0.20)";
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

  const carT = clamp(distance / fd, 0, 1);
  const carPx = mapX(carX);
  const carPy = mapY(carT);
  const icon = clamp(mapW * 0.11, 14, 22);
  drawPlayerSprite(carPx, carPy, Math.PI + heading, icon, offroad, danger);
  ctx.restore();
};

const drawCockpit = (w, h, offroad) => {
  const cockpitH = h * 0.28;
  const y0 = h - cockpitH;

  ctx.save();
  const rg = ctx.createLinearGradient(0, y0, 0, h);
  rg.addColorStop(0, "rgba(0,0,0,0)");
  rg.addColorStop(0.12, "rgba(10,10,18,0.55)");
  rg.addColorStop(1, "rgba(7,7,16,0.92)");
  ctx.fillStyle = rg;
  ctx.fillRect(0, y0, w, cockpitH);

  const dashY = h - cockpitH * 0.76;
  ctx.fillStyle = "rgba(10,10,18,0.68)";
  drawRoundRect(w * 0.06, dashY, w * 0.88, cockpitH * 0.48, 22);
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = offroad ? "rgba(248,113,113,0.35)" : "rgba(34,211,238,0.22)";
  ctx.stroke();

  const wheelR = Math.min(w, h) * 0.12;
  const wx = w * 0.5;
  const wy = h - cockpitH * 0.08;
  ctx.lineWidth = Math.max(5, Math.floor(wheelR * 0.09));
  ctx.strokeStyle = "rgba(228,228,231,0.18)";
  ctx.beginPath();
  ctx.arc(wx, wy, wheelR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = offroad ? "rgba(248,113,113,0.65)" : "rgba(34,211,238,0.22)";
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

  const light = offroad ? "rgba(248,113,113,0.85)" : "rgba(34,211,238,0.42)";
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
  const boxW = Math.min(w * 0.44, 320);
  const boxH = 114;
  const fd = getTrack().finishDistance;
  const progress = fd > 0 ? clamp(state.distance / fd, 0, 1) : 0;

  ctx.save();
  const bg = ctx.createLinearGradient(pad, pad, pad, pad + boxH);
  bg.addColorStop(0, "rgba(10,10,18,0.76)");
  bg.addColorStop(1, "rgba(10,10,18,0.40)");
  ctx.fillStyle = bg;
  drawRoundRect(pad, pad, boxW, boxH, 18);
  ctx.fill();

  ctx.strokeStyle = "rgba(34,211,238,0.32)";
  ctx.lineWidth = 1.5;
  drawRoundRect(pad + 0.75, pad + 0.75, boxW - 1.5, boxH - 1.5, 17);
  ctx.stroke();

  const titleFs = Math.max(15, Math.floor(w * 0.028));
  const infoFs = Math.max(16, Math.floor(w * 0.03));
  const subFs = Math.max(12, Math.floor(w * 0.022));

  ctx.fillStyle = "rgba(226,232,240,0.90)";
  ctx.font = `${titleFs}px ui-sans-serif, system-ui`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  const titleY = pad + 32;
  ctx.fillText("零点漂移", pad + 14, titleY);

  const timeText =
    state.status === "running" ? formatMs(state.elapsedMs) : state.finishMs != null ? formatMs(state.finishMs) : "";

  ctx.font = `${titleFs}px ui-sans-serif, system-ui`;
  const rightX = pad + boxW - 14;

  if (timeText) {
    ctx.font = `${subFs}px ui-sans-serif, system-ui`;
    ctx.fillStyle = "rgba(226,232,240,0.78)";
    ctx.textAlign = "right";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(timeText, rightX, titleY);
  }

  const ledOn = sim.gyroFlip !== -1;
  const ledFill = ledOn ? "rgba(34,197,94,0.95)" : "rgba(239,68,68,0.95)";
  const ledGlow = ledOn ? "rgba(34,197,94,0.85)" : "rgba(239,68,68,0.85)";
  const ledX = pad + boxW + 16;
  const ledY = titleY - Math.floor(titleFs * 0.35);
  const ledR = Math.max(8, Math.floor(titleFs * 0.48));
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.shadowColor = ledGlow;
  ctx.shadowBlur = Math.max(10, ledR * 1.6);
  ctx.fillStyle = ledFill;
  ctx.beginPath();
  ctx.arc(ledX, ledY, ledR, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = 2;
  ctx.strokeStyle = "rgba(15,23,42,0.35)";
  ctx.stroke();
  ctx.restore();

  ctx.font = `${infoFs}px ui-sans-serif, system-ui`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = "rgba(34,211,238,0.92)";
  ctx.fillText(`速度 ${Math.round(state.speed)}`, pad + 14, pad + 74);

  ctx.fillStyle = "rgba(244,114,182,0.90)";
  ctx.textAlign = "right";
  ctx.fillText(`得分 ${state.score}`, pad + boxW - 14, pad + 74);

  const riskActive = state.status === "running" && sim.risk && !sim.risk.done;
  const risk = riskActive ? sim.risk : null;
  const distToStart = risk ? risk.start - state.distance : 1e9;
  const preRisk = risk && !risk.entered && distToStart > 0 && distToStart < 900;
  const inRisk = risk && risk.entered && !risk.invalid && state.distance >= risk.start && state.distance <= risk.end;
  const riskProgress = inRisk ? clamp((state.distance - risk.start) / Math.max(1, risk.end - risk.start), 0, 1) : 0;

  if (sim.bonusFlashUntil > sim.elapsedMs) {
    ctx.fillStyle = "rgba(52,211,153,0.92)";
    ctx.textAlign = "left";
    ctx.font = `${subFs}px ui-sans-serif, system-ui`;
    ctx.fillText(`净跑奖励 +${sim.bonusLast}`, pad + 14, pad + 102);
  } else if (inRisk) {
    const tx = pad + 14;
    const ty = pad + 100;
    const barX = pad + 14;
    const barY = pad + 104;
    const barW2 = Math.max(90, boxW - 28);
    const barH2 = 7;
    ctx.fillStyle = "rgba(34,211,238,0.92)";
    ctx.textAlign = "left";
    ctx.font = `${subFs}px ui-sans-serif, system-ui`;
    ctx.fillText(`净跑挑战 +${risk.bonus}（${Math.round(riskProgress * 100)}%）`, tx, ty);
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = "rgba(10,10,18,0.60)";
    drawRoundRect(barX, barY, barW2, barH2, 6);
    ctx.fill();
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = "rgba(52,211,153,0.92)";
    drawRoundRect(barX, barY, Math.max(8, barW2 * riskProgress), barH2, 6);
    ctx.fill();
    ctx.globalAlpha = 1;
  } else if (preRisk) {
    ctx.fillStyle = "rgba(34,211,238,0.86)";
    ctx.textAlign = "left";
    ctx.font = `${subFs}px ui-sans-serif, system-ui`;
    ctx.fillText(`前方净跑区 +${risk.bonus}`, pad + 14, pad + 102);
  } else if (state.offroad) {
    ctx.fillStyle = "rgba(248,113,113,0.92)";
    ctx.textAlign = "left";
    ctx.font = `${subFs}px ui-sans-serif, system-ui`;
    ctx.fillText("越界扣分", pad + 14, pad + 102);
  }

  const barW = Math.min(w * 0.42, 320);
  const barH = 10;
  const bx = (w - barW) / 2;
  const by = h - 22;
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = "rgba(10,10,18,0.55)";
  drawRoundRect(bx, by, barW, barH, 8);
  ctx.fill();
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = "rgba(34,211,238,0.90)";
  drawRoundRect(bx, by, Math.max(10, barW * progress), barH, 8);
  ctx.fill();

  ctx.restore();
};

const drawToast = (w, h) => {
  if (state.status !== "running") return;
  if (!sim.toastText || sim.toastUntil <= sim.elapsedMs) return;
  const remain = sim.toastUntil - sim.elapsedMs;
  const a = clamp(remain / 350, 0, 1);
  const pad = 14;
  const y = Math.max(120, Math.floor(h * 0.16));
  const fs = Math.max(14, Math.floor(Math.min(w, h) * 0.03));
  const text = String(sim.toastText);
  const tone =
    sim.toastKind === "success"
      ? { fill: "rgba(52,211,153,0.92)", glow: "rgba(52,211,153,0.75)" }
      : sim.toastKind === "fail"
        ? { fill: "rgba(248,113,113,0.92)", glow: "rgba(248,113,113,0.75)" }
        : { fill: "rgba(34,211,238,0.92)", glow: "rgba(34,211,238,0.75)" };

  ctx.save();
  ctx.globalAlpha = a;
  ctx.font = `700 ${fs}px ui-sans-serif, system-ui`;
  const tw = ctx.measureText(text).width;
  const bw = Math.min(w - pad * 2, tw + 42);
  const bh = Math.max(40, Math.floor(fs * 2.2));
  const x = (w - bw) / 2;
  const yy = y;
  ctx.fillStyle = "rgba(10,10,18,0.72)";
  drawRoundRect(x, yy, bw, bh, 18);
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "rgba(244,244,245,0.14)";
  ctx.stroke();
  ctx.shadowColor = tone.glow;
  ctx.shadowBlur = 18;
  ctx.fillStyle = tone.fill;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + bw / 2, yy + bh / 2 + 1);
  ctx.restore();
};

const drawFullscreenExitOverlay = (w, h) => {
  if (!document.fullscreenElement) return;
  const pad = 14;
  const btnW = Math.min(170, Math.floor(w * 0.22));
  const btnH = 40;
  const x = Math.max(pad, w - pad - btnW);
  const y = pad;
  drawButton("exitfs", "退出全屏", { x, y, w: btnW, h: btnH }, "primary");
};

const drawSetupUi = (w, h) => {
  ui.rects.clear();
  const portrait = h >= w * 1.05;
  const pad = Math.max(14, Math.floor(w * 0.03));
  const panelW = Math.min(w - pad * 2, 540);
  const x0 = (w - panelW) / 2;
  const y0 = portrait ? Math.floor(h * (state.finishMs != null ? 0.34 : 0.18)) : Math.floor(h * 0.62);
  const panelH = portrait ? Math.min(h - y0 - pad, 560) : h - y0 - pad;

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

  const t = state.animMs * 0.001;
  const pulse = 0.72 + 0.28 * Math.sin(t * 1.6);
  const signX = x0 + 12;
  const signY = y0 + 12;
  const signW = panelW - 24;
  const signH = Math.floor(titleFs * 2.2);
  const signG = ctx.createLinearGradient(0, signY, 0, signY + signH);
  signG.addColorStop(0, "rgba(8,10,18,0.82)");
  signG.addColorStop(1, "rgba(8,10,18,0.48)");
  ctx.fillStyle = signG;
  drawRoundRect(signX, signY, signW, signH, 18);
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = `rgba(34,211,238,${0.18 + pulse * 0.22})`;
  ctx.stroke();

  ctx.save();
  ctx.beginPath();
  drawRoundRect(signX, signY, signW, signH, 18);
  ctx.clip();
  const hi = ctx.createLinearGradient(signX, signY, signX + signW, signY + signH);
  hi.addColorStop(0, "rgba(255,255,255,0)");
  hi.addColorStop(0.45, "rgba(255,255,255,0.08)");
  hi.addColorStop(0.55, "rgba(34,211,238,0.06)");
  hi.addColorStop(1, "rgba(255,255,255,0)");
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = hi;
  ctx.fillRect(signX, signY, signW, signH);
  ctx.restore();

  const titleText = "零点漂移";
  const titleX = signX + signW / 2;
  const titleY = signY + Math.floor(signH * 0.68);
  const neonFs = Math.floor(titleFs * 1.35);
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.font = `700 ${neonFs}px ui-sans-serif, system-ui`;
  ctx.lineWidth = Math.max(6, Math.floor(neonFs * 0.18));
  ctx.strokeStyle = `rgba(34,211,238,${0.10 + pulse * 0.12})`;
  ctx.strokeText(titleText, titleX, titleY);
  ctx.lineWidth = Math.max(3, Math.floor(neonFs * 0.1));
  ctx.strokeStyle = `rgba(34,211,238,${0.28 + pulse * 0.26})`;
  ctx.strokeText(titleText, titleX, titleY);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = `rgba(167,243,208,${0.62 + pulse * 0.2})`;
  ctx.strokeText(titleText, titleX, titleY);
  ctx.fillStyle = "rgba(244,253,255,0.92)";
  ctx.fillText(titleText, titleX, titleY);

  ctx.globalAlpha = 0.22 + pulse * 0.14;
  ctx.fillStyle = "rgba(244,114,182,0.55)";
  const accentY = signY + signH - 12;
  drawRoundRect(signX + 16, accentY, signW - 32, 6, 4);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.fillStyle = "rgba(161,161,170,0.95)";
  ctx.font = `${subFs}px ui-sans-serif, system-ui`;
  ctx.textAlign = "left";
  const subY = signY + signH + 24;
  ctx.fillText("启用传感器 → 校准中位 → 开始", x0 + 18, subY);

  const btnH = portrait ? Math.max(52, Math.floor(h * 0.062)) : Math.max(44, Math.floor(h * 0.065));
  const gap = portrait ? 12 : 10;
  const innerPad = 18;
  const colW = (panelW - innerPad * 2 - gap * 2) / 3;
  const rowY = subY + 18;

  drawButton(
    "track1",
    "赛道1",
    { x: x0 + innerPad, y: rowY, w: colW, h: btnH },
    state.trackId === "track1" ? "primary" : "ghost",
  );
  drawButton(
    "trackMid",
    "中难",
    { x: x0 + innerPad + colW + gap, y: rowY, w: colW, h: btnH },
    state.trackId === "trackMid" ? "primary" : "ghost",
  );
  drawButton(
    "track2",
    "高难",
    { x: x0 + innerPad + (colW + gap) * 2, y: rowY, w: colW, h: btnH },
    state.trackId === "track2" ? "primary" : "ghost",
  );

  const topRowY = rowY + btnH + gap;
  const enableLabel = isPermissionPromptRequired() ? "启用传感器（点我）" : "启用传感器";
  drawButton(
    "enable",
    enableLabel,
    { x: x0 + innerPad, y: topRowY, w: panelW - innerPad * 2, h: btnH },
    "primary",
  );
  drawButton(
    "calibrate",
    "校准中位",
    { x: x0 + innerPad, y: topRowY + btnH + gap, w: colW, h: btnH },
    "ghost",
  );
  drawButton(
    "touch",
    "触控模式",
    { x: x0 + innerPad + colW + gap, y: topRowY + btnH + gap, w: colW, h: btnH },
    "ghost",
  );

  drawButton(
    "start",
    "开始",
    { x: x0 + innerPad, y: topRowY + (btnH + gap) * 2, w: panelW - innerPad * 2, h: btnH },
    "primary",
  );

  drawButton(
    "fs",
    "横屏全屏",
    { x: x0 + innerPad, y: topRowY + (btnH + gap) * 3, w: colW, h: btnH },
    "ghost",
  );
  drawButton(
    "exitfs",
    "退出全屏",
    { x: x0 + innerPad + colW + gap, y: topRowY + (btnH + gap) * 3, w: colW, h: btnH },
    "ghost",
  );

  const sliderY = topRowY + (btnH + gap) * 4 + 8;
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

const drawResultUi = (w, h) => {
  ui.rects.clear();
  const entry = state.lastResult;
  if (!entry) return;

  const pad = Math.max(14, Math.floor(w * 0.03));
  const panelW = Math.min(w - pad * 2, 560);
  const panelH = Math.min(h - pad * 2, 620);
  const x0 = (w - panelW) / 2;
  const y0 = (h - panelH) / 2;

  ctx.save();
  ctx.globalAlpha = 1;
  ctx.fillStyle = "rgba(10,10,18,0.76)";
  drawRoundRect(x0, y0, panelW, panelH, 22);
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "rgba(34,211,238,0.24)";
  ctx.stroke();

  const titleFs = Math.max(18, Math.floor(Math.min(w, h) * 0.05));
  const subFs = Math.max(12, Math.floor(Math.min(w, h) * 0.025));
  const metricFs = Math.max(13, Math.floor(Math.min(w, h) * 0.03));
  const innerPad = 18;

  ctx.fillStyle = "rgba(244,253,255,0.92)";
  ctx.font = `700 ${titleFs}px ui-sans-serif, system-ui`;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("完成", x0 + innerPad, y0 + 42);

  ctx.fillStyle = "rgba(167,243,208,0.92)";
  ctx.font = `600 ${subFs}px ui-sans-serif, system-ui`;
  ctx.fillText(`${getTrack().name ?? state.trackId}`, x0 + innerPad, y0 + 68);

  ctx.fillStyle = "rgba(34,211,238,0.92)";
  ctx.font = `700 ${Math.floor(titleFs * 0.92)}px ui-sans-serif, system-ui`;
  ctx.fillText(
    `得分 ${entry.score}${entry.bonus > 0 ? `（净跑+${entry.bonus}）` : ""}`,
    x0 + innerPad,
    y0 + 110,
  );

  ctx.fillStyle = "rgba(226,232,240,0.86)";
  ctx.font = `600 ${metricFs}px ui-sans-serif, system-ui`;
  ctx.fillText(`用时 ${formatMs(entry.timeMs)}`, x0 + innerPad, y0 + 148);
  ctx.fillText(`扣分 ${entry.penalty}`, x0 + innerPad, y0 + 182);

  const list = getLeaderboard(entry.trackId, entry);
  const myIndex = list.findIndex((x) => x && x.id === entry.id);
  const rankText = myIndex >= 0 ? `好友榜 第${myIndex + 1}名` : "";
  if (rankText) {
    ctx.fillStyle = "rgba(244,114,182,0.9)";
    ctx.font = `700 ${metricFs}px ui-sans-serif, system-ui`;
    ctx.fillText(rankText, x0 + innerPad, y0 + 220);
  }

  const tableY = y0 + 244;
  const rowH = 34;
  const btnW = panelW - innerPad * 2;
  const btnH = 44;
  const btnGap = 10;
  const btnBlockH = btnH * 3 + btnGap * 2;
  const btnY = y0 + panelH - innerPad - btnBlockH;
  const maxRows = Math.min(6, list.length, Math.max(0, Math.floor((btnY - 12 - tableY) / rowH)));
  ctx.font = `600 ${subFs}px ui-sans-serif, system-ui`;
  for (let i = 0; i < maxRows; i += 1) {
    const r = list[i];
    const yy = tableY + i * rowH;
    const isMe = r.kind === "me" && r.id === entry.id;
    ctx.globalAlpha = 1;
    ctx.fillStyle = isMe ? "rgba(34,211,238,0.14)" : "rgba(24,24,27,0.55)";
    drawRoundRect(x0 + innerPad, yy, panelW - innerPad * 2, rowH - 6, 14);
    ctx.fill();
    ctx.fillStyle = isMe ? "rgba(34,211,238,0.92)" : "rgba(226,232,240,0.85)";
    ctx.textAlign = "left";
    ctx.fillText(`#${i + 1} ${r.name}`, x0 + innerPad + 12, yy + 22);
    ctx.textAlign = "right";
    ctx.fillStyle = isMe ? "rgba(244,253,255,0.92)" : "rgba(167,243,208,0.9)";
    ctx.fillText(`${r.score}`, x0 + panelW - innerPad - 12, yy + 22);
  }

  drawButton("share", "分享成绩", { x: x0 + innerPad, y: btnY, w: btnW, h: btnH }, "ghost");
  drawButton("again", "再来一局", { x: x0 + innerPad, y: btnY + btnH + btnGap, w: btnW, h: btnH }, "primary");
  drawButton("back", "返回设置", { x: x0 + innerPad, y: btnY + (btnH + btnGap) * 2, w: btnW, h: btnH }, "ghost");

  ctx.restore();
};

const drawRunUi = (w, h) => {
  ui.rects.clear();
  const pad = 14;

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
  state.animMs = (state.animMs + dtMs) % 600000;

  const w = canvas.width;
  const h = canvas.height;

  const mapped = state.inputMode === "sensor" && state.sensorEnabled && sensor.hasData ? sensor.mapped : 0;
  const tiltBase = clamp(mapped - state.calibration, -1, 1);
  state.tilt = tiltBase;
  state.tiltRaw = sensor.raw;

  const baseSteer = state.inputMode === "touch" || !state.sensorEnabled ? touch.steer : tiltBase;
  const steerTarget = baseSteer * (state.status === "running" ? sim.gyroFlip : 1);

  const follow = 1 - Math.pow(0.001, dt);
  sim.steerSmooth = lerp(sim.steerSmooth, steerTarget, follow * 0.18);
  state.tiltSmooth = sim.steerSmooth;

  const maxHeadingRad = 0.85;
  const targetHeading = steerTarget * maxHeadingRad;
  sim.heading = lerp(sim.heading, targetHeading, 55 * dt);
  sim.steerAngle = sim.heading;

  if (state.status === "running") {
    sim.elapsedMs += dtMs;
    if (sim.elapsedMs >= sim.nextGyroFlipMs) {
      sim.gyroFlip *= -1;
      sim.nextGyroFlipMs = sim.elapsedMs + randRange(2500, 6500);
    }

    const baseSpeed = getTrack().baseSpeed;
    const fd = getTrack().finishDistance;
    const y0 = h * VIEW_Y0_T;
    const y1 = h * VIEW_Y1_T;
    const carMarkerY = h * CAR_MARKER_Y_T;
    const lookahead = 1100;
    const carT = clamp((y1 - carMarkerY) / (y1 - y0), 0, 1);
    const yCarWorld = sim.distance + carT * lookahead;
    const c = centerX(yCarWorld);
    const baseHw = Math.max(1, getTrack().halfWidth);
    const hw = Math.max(1, halfWidth(yCarWorld));
    const roadHalfPxBase = Math.min(w * 0.28, 240);
    const roadHalfPx = roadHalfPxBase * clamp(hw / baseHw, 0.3, 1);
    const scale = roadHalfPx / hw;
    const carHalfPx = CAR_HALF_PX;
    const carHalf = carHalfPx / Math.max(0.001, scale);
    const offroadNow = Math.abs(sim.x - c) > Math.max(0, hw - carHalf);
    const slope = (elevation(yCarWorld + 10) - elevation(yCarWorld)) / 10;
    const slopeFactor = clamp(1 - slope * 1.2, 0.72, 1.32);
    const speed = baseSpeed * (offroadNow ? 0.55 : 1) * slopeFactor;

    sim.prevDistance = sim.distance;
    sim.distance += speed * dt;

    const narrowNow = getNarrowSegment(yCarWorld);
    if (narrowNow) {
      const key = `${narrowNow.start ?? 0}_${narrowNow.length ?? 0}_${narrowNow.minHalfWidth ?? narrowNow.halfWidth ?? ""}`;
      if (!sim.narrowSeen.has(key)) {
        sim.narrowSeen.add(key);
        sim.toastText = "前方窄路！";
        sim.toastKind = "info";
        sim.toastUntil = sim.elapsedMs + 1100;
      }
    }

    const steer = sim.steerSmooth * state.sensitivity * state.steerStrength;
    sim.x += steer * speed * dt * 0.85;

    const yCarWorldNew = sim.distance + carT * lookahead;
    const nc = centerX(yCarWorldNew);
    const nhw = Math.max(1, halfWidth(yCarWorldNew));
    const roadHalfPxNew = roadHalfPxBase * clamp(nhw / baseHw, 0.3, 1);
    const nscale = roadHalfPxNew / nhw;
    const carHalfNew = carHalfPx / Math.max(0.001, nscale);
    const maxDelta = Math.max(0, nhw - carHalfNew);
    const rawDelta = sim.x - nc;
    const clampedDelta = clamp(rawDelta, -maxDelta, maxDelta);
    const hitWall = Math.abs(rawDelta - clampedDelta) >= WALL_HIT_EPS_PX / Math.max(0.001, nscale);
    if (hitWall && sim.elapsedMs - sim.lastPenaltyMs > 250) {
      sim.lastPenaltyMs = sim.elapsedMs;
      const delta = 1;
      state.penalty += delta;
      sim.lastPenaltyDelta = delta;
      sim.penaltyFlashUntil = sim.elapsedMs + 520;
    }
    sim.x = nc + clampedDelta;

    if (sim.risk && !sim.risk.done) {
      const enteredNow = sim.prevDistance < sim.risk.start && sim.distance >= sim.risk.start;
      const inZone = sim.distance >= sim.risk.start && sim.distance <= sim.risk.end;
      if (enteredNow) {
        sim.risk.entered = true;
        sim.toastText = `进入净跑区：不碰墙/不越界 +${sim.risk.bonus}`;
        sim.toastKind = "info";
        sim.toastUntil = sim.elapsedMs + 1400;
      }
      if (sim.risk.entered && inZone && (offroadNow || hitWall)) {
        if (!sim.risk.invalid) {
          sim.toastText = "净跑失败";
          sim.toastKind = "fail";
          sim.toastUntil = sim.elapsedMs + 1200;
        }
        sim.risk.invalid = true;
      }
      if (sim.risk.entered && sim.distance >= sim.risk.end) {
        if (!sim.risk.invalid) {
          state.bonus += sim.risk.bonus;
          sim.bonusLast = sim.risk.bonus;
          sim.bonusFlashUntil = sim.elapsedMs + 900;
          sim.toastText = `净跑成功 +${sim.risk.bonus}`;
          sim.toastKind = "success";
          sim.toastUntil = sim.elapsedMs + 1400;
        }
        sim.risk.done = true;
      }
    }

    if (sim.distance >= fd) {
      sim.distance = fd;
      if (state.finishMs == null) state.finishMs = Math.max(0, Math.floor(sim.elapsedMs));
      state.score = calcScore(state.finishMs, state.penalty) + state.bonus;
      const ts = Date.now();
      const entry = {
        id: `me_${ts}`,
        name: state.playerName,
        trackId: state.trackId,
        score: state.score,
        bonus: state.bonus,
        timeMs: state.finishMs,
        penalty: state.penalty,
        ts,
        kind: "me",
      };
      state.lastResult = entry;
      recordScore(entry);
      state.status = "result";
    }
  }

  const y0 = h * VIEW_Y0_T;
  const y1 = h * VIEW_Y1_T;
  const carMarkerY = h * CAR_MARKER_Y_T;
  const lookahead = 1100;
  const carT = clamp((y1 - carMarkerY) / (y1 - y0), 0, 1);
  const yCarWorldNow = sim.distance + carT * lookahead;
  const cNow = centerX(yCarWorldNow);
  const baseHwNow = Math.max(1, getTrack().halfWidth);
  const hwNow = Math.max(1, halfWidth(yCarWorldNow));
  const roadHalfPxNow = Math.min(w * 0.28, 240) * clamp(hwNow / baseHwNow, 0.3, 1);
  const scaleNow = roadHalfPxNow / hwNow;
  const carHalfPxNow = CAR_HALF_PX;
  const carHalfNow = carHalfPxNow / Math.max(0.001, scaleNow);
  const offroadNow = state.status === "running" && Math.abs(sim.x - cNow) > Math.max(0, hwNow - carHalfNow);
  const dangerNow = state.status === "running" && sim.penaltyFlashUntil > sim.elapsedMs;
  const slopeNow = (elevation(yCarWorldNow + 10) - elevation(yCarWorldNow)) / 10;
  const slopeFactorNow = clamp(1 - slopeNow * 1.2, 0.72, 1.32);
  const speedNow =
    state.status === "running" ? getTrack().baseSpeed * (offroadNow ? 0.55 : 1) * slopeFactorNow : 0;
  sim.roadAngle = roadAngleAt(yCarWorldNow);

  state.elapsedMs = Math.max(0, Math.floor(sim.elapsedMs));
  state.distance = sim.distance;
  state.speed = speedNow;
  state.offroad = offroadNow || dangerNow;
  state.penalty = Math.max(0, Math.floor(state.penalty));
  state.score = calcScore(state.finishMs ?? state.elapsedMs, state.penalty) + state.bonus;

  perf.frame += 1;
  if (perf.frame % perf.renderEvery === 0) drawFrame(w, h);
};

const drawFrame = (w, h) => {
  ctx.clearRect(0, 0, w, h);
  drawSky(w, h);
  const danger = state.status === "running" && sim.penaltyFlashUntil > sim.elapsedMs;
  const heading = sim.roadAngle + sim.heading;
  drawRoadFlat(w, h, sim.x, sim.distance, heading, danger);
  drawCockpit(w, h, state.offroad);
  drawTopHud(w, h);
  if (state.status === "running") drawRunUi(w, h);
  else if (state.status === "result") drawResultUi(w, h);
  else drawSetupUi(w, h);
  drawPostFx(w, h);
  drawToast(w, h);
  drawFullscreenExitOverlay(w, h);
};

const loop = (t) => {
  updateSim(t);
  requestAnimationFrame(loop);
};

requestAnimationFrame(loop);
