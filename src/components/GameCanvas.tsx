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
      sim.steerSmooth = lerp(sim.steerSmooth, steerTarget, follow * 0.12);

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
        sim.x += steer * speed * dt * 0.62;

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
      className="relative h-[52vh] w-full overflow-hidden rounded-2xl bg-zinc-950"
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
  const { w, h, carScreenY, carX, distance, finishDistance, offroad } = params;

  ctx.clearRect(0, 0, w, h);

  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#050508");
  g.addColorStop(1, "#0a0a12");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  const left: Array<[number, number]> = [];
  const right: Array<[number, number]> = [];

  for (let ys = -180; ys <= h + 220; ys += 30) {
    const yWorld = distance + (carScreenY - ys);
    const c = centerX(yWorld);
    const hw = halfWidth(yWorld);
    const lx = w / 2 + (c - hw);
    const rx = w / 2 + (c + hw);
    left.push([lx, ys]);
    right.push([rx, ys]);
  }

  ctx.beginPath();
  ctx.moveTo(left[0][0], left[0][1]);
  for (let i = 1; i < left.length; i += 1) ctx.lineTo(left[i][0], left[i][1]);
  for (let i = right.length - 1; i >= 0; i -= 1)
    ctx.lineTo(right[i][0], right[i][1]);
  ctx.closePath();
  ctx.fillStyle = "#14141b";
  ctx.fill();

  ctx.lineWidth = Math.max(2, Math.floor(w * 0.004));
  ctx.strokeStyle = "#22c55e";
  ctx.globalAlpha = 0.35;
  ctx.beginPath();
  ctx.moveTo(left[0][0], left[0][1]);
  for (let i = 1; i < left.length; i += 1) ctx.lineTo(left[i][0], left[i][1]);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(right[0][0], right[0][1]);
  for (let i = 1; i < right.length; i += 1) ctx.lineTo(right[i][0], right[i][1]);
  ctx.stroke();
  ctx.globalAlpha = 1;

  const finishY = carScreenY - (finishDistance - distance);
  if (finishY > -60 && finishY < h + 60) {
    const yWorld = finishDistance;
    const c = centerX(yWorld);
    const hw = halfWidth(yWorld);
    const lx = w / 2 + (c - hw);
    const rx = w / 2 + (c + hw);
    const bandH = 20;

    ctx.save();
    ctx.beginPath();
    ctx.rect(lx, finishY - bandH / 2, rx - lx, bandH);
    ctx.clip();
    ctx.fillStyle = "#0b0b10";
    ctx.fillRect(lx, finishY - bandH / 2, rx - lx, bandH);

    const cell = 18;
    for (let x = Math.floor(lx / cell) * cell; x < rx + cell; x += cell) {
      for (let y = Math.floor((finishY - bandH / 2) / cell) * cell; y < finishY + bandH; y += cell) {
        const on = ((x / cell) | 0) + ((y / cell) | 0);
        ctx.fillStyle = on % 2 === 0 ? "#f4f4f5" : "#111827";
        ctx.fillRect(x, y, cell, cell);
      }
    }
    ctx.restore();
  }

  const carScreenX = w / 2 + carX;
  const carW = 26;
  const carH = 46;

  ctx.save();
  ctx.translate(carScreenX, carScreenY);
  ctx.fillStyle = "#0b1220";
  roundRect(ctx, -carW / 2, -carH / 2, carW, carH, 10);
  ctx.fill();
  ctx.fillStyle = "#34d399";
  roundRect(ctx, -carW / 2 + 4, -carH / 2 + 6, carW - 8, 12, 7);
  ctx.fill();
  ctx.fillStyle = "#111827";
  roundRect(ctx, -carW / 2 + 6, -carH / 2 + 24, carW - 12, 16, 8);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = offroad ? 0.55 : 0.12;
  const rg = ctx.createRadialGradient(carScreenX, carScreenY, 10, carScreenX, carScreenY, Math.max(w, h) * 0.9);
  rg.addColorStop(0, offroad ? "rgba(239,68,68,0.18)" : "rgba(16,185,129,0.08)");
  rg.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = rg;
  ctx.fillRect(0, 0, w, h);
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
