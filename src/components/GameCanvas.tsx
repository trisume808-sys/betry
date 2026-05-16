import { useEffect, useMemo, useRef } from "react";
import { startTiltStream } from "@/input/sensorInput";
import { useGameStore } from "@/store/gameStore";

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function centerX(y: number) {
  return 110 * Math.sin(y * 0.0022) + 70 * Math.sin(y * 0.0011 + 1.7);
}

function halfWidth(y: number) {
  return 135 + 18 * Math.sin(y * 0.0007 + 0.5);
}

function dpr() {
  return typeof window !== "undefined" ? Math.max(1, window.devicePixelRatio || 1) : 1;
}

export default function GameCanvas() {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const status = useGameStore((s) => s.status);
  const inputMode = useGameStore((s) => s.inputMode);
  const sensorEnabled = useGameStore((s) => s.sensorEnabled);
  const calibration = useGameStore((s) => s.calibration);
  const sensitivity = useGameStore((s) => s.sensitivity);

  const finishDistance = useMemo(() => 1800, []);

  const sensorRef = useRef({ raw: 0, mapped: 0, hasData: false });
  const touchRef = useRef({ active: false, startX: 0, steer: 0 });

  const simRef = useRef({
    x: 0,
    distance: 0,
    elapsedMs: 0,
    steerSmooth: 0,
    lastT: 0,
    lastTelemetryT: 0,
  });

  useEffect(() => {
    if (!wrapRef.current || !canvasRef.current) return;

    const el = wrapRef.current;
    const canvas = canvasRef.current;

    const ro = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      const ratio = dpr();
      const w = Math.max(1, Math.floor(rect.width * ratio));
      const h = Math.max(1, Math.floor(rect.height * ratio));
      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (status === "finished") return;

    const state = useGameStore.getState();
    state.setTelemetry({
      elapsedMs: 0,
      distance: 0,
      speed: 0,
      offroad: false,
      tiltSmooth: 0,
    });
    simRef.current.x = 0;
    simRef.current.distance = 0;
    simRef.current.elapsedMs = 0;
    simRef.current.steerSmooth = 0;
  }, [status]);

  useEffect(() => {
    if (inputMode !== "sensor" || !sensorEnabled) return;

    const stop = startTiltStream((s) => {
      sensorRef.current = { raw: s.raw, mapped: s.mapped, hasData: true };
    });

    return () => {
      stop();
    };
  }, [inputMode, sensorEnabled]);

  useEffect(() => {
    let raf = 0;

    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const sim = simRef.current;
      const dtMs = sim.lastT ? t - sim.lastT : 16.7;
      sim.lastT = t;
      const dt = clamp(dtMs / 1000, 0, 0.05);

      const w = canvas.width;
      const h = canvas.height;
      const carScreenY = h * 0.74;

      const rawMapped =
        inputMode === "sensor" && sensorEnabled && sensorRef.current.hasData
          ? sensorRef.current.mapped
          : 0;

      const tilt = clamp(rawMapped - calibration, -1, 1);

      const touchSteer = touchRef.current.steer;
      const steerTarget =
        inputMode === "touch" || !sensorEnabled ? touchSteer : tilt;

      const follow = 1 - Math.pow(0.001, dt);
      sim.steerSmooth = lerp(sim.steerSmooth, steerTarget, follow * 0.18);

      const baseSpeed = 260;
      const y = sim.distance;
      const c = centerX(y);
      const hw = halfWidth(y);
      const carHalf = 12;
      const offroad = Math.abs(sim.x - c) > hw - carHalf;
      const speed = baseSpeed * (offroad ? 0.55 : 1);

      if (status === "running") {
        sim.elapsedMs += dtMs;
        sim.distance += speed * dt;

        const steer = sim.steerSmooth * sensitivity;
        sim.x += steer * speed * dt * 0.85;

        if (!touchRef.current.active && Math.abs(steerTarget) < 0.02) {
          sim.x *= Math.pow(0.92, dtMs / 16.7);
        }

        const ny = sim.distance;
        const nc = centerX(ny);
        const nhw = halfWidth(ny);
        if (Math.abs(sim.x - nc) > nhw - carHalf) {
          sim.x = nc + clamp(sim.x - nc, -(nhw - carHalf), nhw - carHalf);
        }

        if (sim.distance >= finishDistance) {
          const st = useGameStore.getState();
          st.setStatus("finished");
          st.setFinishMs(Math.max(0, Math.floor(sim.elapsedMs)));
        }
      }

      drawScene(ctx, {
        w,
        h,
        carScreenY,
        carX: sim.x,
        distance: sim.distance,
        finishDistance,
        offroad,
      });

      if (t - sim.lastTelemetryT > 90) {
        sim.lastTelemetryT = t;
        const st = useGameStore.getState();
        st.setTelemetry({
          tiltRaw: sensorRef.current.raw,
          tilt,
          tiltSmooth: sim.steerSmooth,
          elapsedMs: Math.max(0, Math.floor(sim.elapsedMs)),
          distance: sim.distance,
          speed,
          offroad,
        });
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [calibration, finishDistance, inputMode, sensorEnabled, sensitivity, status]);

  return (
    <div
      ref={wrapRef}
      className="relative h-[52dvh] w-full overflow-hidden rounded-2xl bg-zinc-950 [@media(orientation:landscape)]:h-[86dvh]"
    >
      <canvas
        ref={canvasRef}
        className="h-full w-full touch-none"
        onPointerDown={(e) => {
          const rect = (e.currentTarget as HTMLCanvasElement).getBoundingClientRect();
          touchRef.current.active = true;
          touchRef.current.startX = e.clientX - rect.left;
        }}
        onPointerMove={(e) => {
          if (!touchRef.current.active) return;
          const rect = (e.currentTarget as HTMLCanvasElement).getBoundingClientRect();
          const x = e.clientX - rect.left;
          const dx = x - touchRef.current.startX;
          touchRef.current.steer = clamp(dx / (rect.width * 0.28), -1, 1);
          if (useGameStore.getState().inputMode !== "touch") {
            useGameStore.getState().setInputMode("touch");
          }
        }}
        onPointerUp={() => {
          touchRef.current.active = false;
          touchRef.current.steer = 0;
        }}
        onPointerCancel={() => {
          touchRef.current.active = false;
          touchRef.current.steer = 0;
        }}
      />
      <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
        <div className="rounded-full bg-zinc-950/60 px-3 py-1 text-xs text-zinc-200 backdrop-blur">
          按住画面左右拖动可临时接管
        </div>
      </div>
    </div>
  );
}

function drawScene(
  ctx: CanvasRenderingContext2D,
  params: {
    w: number;
    h: number;
    carScreenY: number;
    carX: number;
    distance: number;
    finishDistance: number;
    offroad: boolean;
  },
) {
  const { w, h, carX, distance, finishDistance, offroad } = params;

  ctx.clearRect(0, 0, w, h);

  drawSky(ctx, w, h);
  drawRoadFlat(ctx, { w, h, carX, distance, finishDistance });
  drawMiniMap(ctx, { w, h, carX, distance, finishDistance, offroad });
  drawCockpit(ctx, { w, h, offroad });
  drawViewLabel(ctx, { w, h });
}

function drawSky(ctx: CanvasRenderingContext2D, w: number, h: number) {
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
}

function drawViewLabel(ctx: CanvasRenderingContext2D, params: { w: number; h: number }) {
  const { w } = params;
  const pad = 14;
  const x = pad;
  const y = pad;

  ctx.save();
  ctx.globalAlpha = 1;
  ctx.fillStyle = "rgba(10,10,18,0.62)";
  roundRect(ctx, x, y, Math.min(w * 0.44, 260), 30, 14);
  ctx.fill();
  ctx.fillStyle = "rgba(244,244,245,0.9)";
  ctx.font = `${Math.max(12, Math.floor(w * 0.02))}px ui-sans-serif, system-ui`;
  ctx.fillText("主视角：平面边界（小地图在右上）", x + 12, y + 20);
  ctx.restore();
}

function drawRoadFlat(
  ctx: CanvasRenderingContext2D,
  params: {
    w: number;
    h: number;
    carX: number;
    distance: number;
    finishDistance: number;
  },
) {
  const { w, h, carX, distance, finishDistance } = params;
  const y0 = h * 0.16;
  const y1 = h * 0.9;
  const steps = 56;
  const lookahead = 1100;

  const roadHalfPx = Math.min(w * 0.28, 240);
  const curveScale = 0.22;

  const left: Array<[number, number]> = [];
  const right: Array<[number, number]> = [];

  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const yWorld = distance + t * lookahead;
    const c = centerX(yWorld) - carX;
    const cx = w / 2 + c * curveScale;
    const y = lerp(y1, y0, t);
    left.push([cx - roadHalfPx, y]);
    right.push([cx + roadHalfPx, y]);
  }

  ctx.save();

  ctx.fillStyle = "rgba(10,10,16,0.85)";
  ctx.beginPath();
  ctx.moveTo(0, y0);
  ctx.lineTo(w, y0);
  ctx.lineTo(w, y1);
  ctx.lineTo(0, y1);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(left[0][0], left[0][1]);
  for (let i = 1; i < left.length; i += 1) ctx.lineTo(left[i][0], left[i][1]);
  for (let i = right.length - 1; i >= 0; i -= 1)
    ctx.lineTo(right[i][0], right[i][1]);
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
    const c = centerX(yWorld) - carX;
    const cx = w / 2 + c * curveScale;
    roundRect(ctx, cx - stripeW / 2, yy - stripeH, stripeW, stripeH, 3);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  const finishT = (finishDistance - distance) / lookahead;
  if (finishT > 0 && finishT < 1) {
    const y = lerp(y1, y0, finishT);
    const yWorld = finishDistance;
    const c = centerX(yWorld) - carX;
    const cx = w / 2 + c * curveScale;
    drawFinishBand(ctx, { cx, roadHalf: roadHalfPx, y, w });
  }

  const fog = ctx.createLinearGradient(0, y0, 0, y1);
  fog.addColorStop(0, "rgba(0,0,0,0.58)");
  fog.addColorStop(0.35, "rgba(0,0,0,0.12)");
  fog.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = fog;
  ctx.fillRect(0, y0, w, y1 - y0);

  ctx.restore();
}

function drawFinishBand(
  ctx: CanvasRenderingContext2D,
  params: { cx: number; roadHalf: number; y: number; w: number },
) {
  const { cx, roadHalf, y } = params;
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
}

function drawMiniMap(
  ctx: CanvasRenderingContext2D,
  params: {
    w: number;
    h: number;
    carX: number;
    distance: number;
    finishDistance: number;
    offroad: boolean;
  },
) {
  const { w, carX, distance, finishDistance, offroad } = params;
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

  const ptsL: Array<[number, number, number]> = [];
  const ptsR: Array<[number, number, number]> = [];
  let maxAbs = 1;

  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const yWorld = lerp(start, end, t);
    const c = centerX(yWorld) - carX;
    const hw = halfWidth(yWorld);
    maxAbs = Math.max(maxAbs, Math.abs(c) + hw);
    ptsL.push([c - hw, yWorld, t]);
    ptsR.push([c + hw, yWorld, t]);
  }

  const sx = (mapW * 0.46) / maxAbs;
  const cx = x0 + mapW / 2;

  ctx.save();
  ctx.globalAlpha = 1;

  ctx.fillStyle = "rgba(10,10,18,0.65)";
  roundRect(ctx, x0, y0, mapW, mapH, 14);
  ctx.fill();
  ctx.strokeStyle = "rgba(52,211,153,0.35)";
  ctx.lineWidth = 1.5;
  roundRect(ctx, x0 + 0.75, y0 + 0.75, mapW - 1.5, mapH - 1.5, 13);
  ctx.stroke();

  ctx.beginPath();
  const firstL = ptsL[0];
  ctx.moveTo(cx + firstL[0] * sx, y1 - firstL[2] * mapH);
  for (let i = 1; i < ptsL.length; i += 1) {
    const p = ptsL[i];
    ctx.lineTo(cx + p[0] * sx, y1 - p[2] * mapH);
  }
  for (let i = ptsR.length - 1; i >= 0; i -= 1) {
    const p = ptsR[i];
    ctx.lineTo(cx + p[0] * sx, y1 - p[2] * mapH);
  }
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
  ctx.fillStyle = offroad ? "rgba(248,113,113,0.9)" : "rgba(52,211,153,0.9)";
  ctx.beginPath();
  ctx.arc(cx, carY, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawCockpit(
  ctx: CanvasRenderingContext2D,
  params: { w: number; h: number; offroad: boolean },
) {
  const { w, h, offroad } = params;
  const cockpitH = h * 0.34;
  const y0 = h - cockpitH;

  ctx.save();
  ctx.globalAlpha = 1;

  const rg = ctx.createLinearGradient(0, y0, 0, h);
  rg.addColorStop(0, "rgba(0,0,0,0)");
  rg.addColorStop(0.15, "rgba(0,0,0,0.65)");
  rg.addColorStop(1, "rgba(0,0,0,0.92)");
  ctx.fillStyle = rg;
  ctx.fillRect(0, y0, w, cockpitH);

  const dashY = h - cockpitH * 0.72;
  ctx.fillStyle = "rgba(17,24,39,0.68)";
  roundRect(ctx, w * 0.06, dashY, w * 0.88, cockpitH * 0.48, 22);
  ctx.fill();

  const wheelR = Math.min(w, h) * 0.14;
  const wx = w * 0.5;
  const wy = h - cockpitH * 0.16;
  ctx.lineWidth = Math.max(5, Math.floor(wheelR * 0.09));
  ctx.strokeStyle = "rgba(228,228,231,0.18)";
  ctx.beginPath();
  ctx.arc(wx, wy, wheelR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = offroad ? "rgba(248,113,113,0.65)" : "rgba(52,211,153,0.55)";
  ctx.beginPath();
  ctx.arc(wx, wy, wheelR * 0.66, -Math.PI * 0.15, Math.PI * 1.15);
  ctx.stroke();

  const light = offroad ? "rgba(248,113,113,0.85)" : "rgba(52,211,153,0.85)";
  ctx.fillStyle = light;
  roundRect(ctx, w * 0.08, dashY + 14, w * 0.18, 10, 6);
  ctx.fill();
  ctx.globalAlpha = 0.75;
  ctx.fillStyle = "rgba(244,244,245,0.9)";
  ctx.font = `${Math.max(12, Math.floor(w * 0.025))}px ui-sans-serif, system-ui`;
  ctx.fillText(offroad ? "OFFROAD" : "ON TRACK", w * 0.29, dashY + 24);

  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
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
}
