export type TiltSample = {
  raw: number;
  mapped: number;
};

export function canUseDeviceMotion() {
  return typeof window !== "undefined" && "DeviceMotionEvent" in window;
}

export function canUseDeviceOrientation() {
  return typeof window !== "undefined" && "DeviceOrientationEvent" in window;
}

export function isPermissionPromptRequired() {
  const anyDeviceMotion = DeviceMotionEvent as unknown as {
    requestPermission?: () => Promise<"granted" | "denied">;
  };
  const anyDeviceOrientation = (DeviceOrientationEvent as unknown as {
    requestPermission?: () => Promise<"granted" | "denied">;
  }) ?? null;
  return (
    typeof anyDeviceMotion?.requestPermission === "function" ||
    typeof anyDeviceOrientation?.requestPermission === "function"
  );
}

export async function requestMotionPermission() {
  const anyDeviceMotion = DeviceMotionEvent as unknown as {
    requestPermission?: () => Promise<"granted" | "denied">;
  };
  const anyDeviceOrientation = (DeviceOrientationEvent as unknown as {
    requestPermission?: () => Promise<"granted" | "denied">;
  }) ?? null;
  const req =
    anyDeviceMotion?.requestPermission ?? anyDeviceOrientation?.requestPermission;
  if (!req) return "granted" as const;
  return req();
}

function getScreenAngle() {
  const angle = (screen as unknown as { orientation?: { angle?: number } })
    ?.orientation?.angle;
  const legacy = (window as unknown as { orientation?: number }).orientation;
  return typeof angle === "number" ? angle : typeof legacy === "number" ? legacy : 0;
}

function pickAxis(
  x: number | null | undefined,
  y: number | null | undefined,
  angle: number,
) {
  if (typeof x !== "number" || typeof y !== "number") return null;
  const a = ((angle % 360) + 360) % 360;
  if (a === 0 || a === 180) return x;
  if (a === 90) return -y;
  if (a === 270) return y;
  return x;
}

function pickOrientationAxis(
  gamma: number | null | undefined,
  beta: number | null | undefined,
  angle: number,
) {
  if (typeof gamma !== "number" || typeof beta !== "number") return null;
  const a = ((angle % 360) + 360) % 360;
  if (a === 0) return gamma;
  if (a === 180) return -gamma;
  if (a === 90) return beta;
  if (a === 270) return -beta;
  return gamma;
}

export function startTiltStream(
  onSample: (sample: TiltSample) => void,
  opts?: { clampG?: number },
) {
  const clampG = opts?.clampG ?? 4.5;
  let motionHasData = false;
  let stopped = false;

  const motionHandler = (e: DeviceMotionEvent) => {
    const ag = e.accelerationIncludingGravity;
    const angle = getScreenAngle();
    const raw = pickAxis(ag?.x, ag?.y, angle);
    if (raw == null) return;
    const mapped = Math.max(-1, Math.min(1, raw / clampG));
    motionHasData = true;
    onSample({ raw, mapped });
  };

  const orientationHandler = (e: DeviceOrientationEvent) => {
    if (motionHasData) return;
    const angle = getScreenAngle();
    const rawDeg = pickOrientationAxis(e.gamma, e.beta, angle);
    if (rawDeg == null) return;
    const mapped = Math.max(-1, Math.min(1, rawDeg / 45));
    onSample({ raw: rawDeg, mapped });
  };

  window.addEventListener("devicemotion", motionHandler, { passive: true });

  const enableOrientationFallback = () => {
    if (stopped) return;
    if (!canUseDeviceOrientation()) return;
    if (motionHasData) return;
    window.addEventListener("deviceorientation", orientationHandler, {
      passive: true,
    });
  };

  const fallbackTimer = window.setTimeout(enableOrientationFallback, 900);

  return () => {
    stopped = true;
    window.clearTimeout(fallbackTimer);
    window.removeEventListener("devicemotion", motionHandler);
    window.removeEventListener("deviceorientation", orientationHandler);
  };
}
