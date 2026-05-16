export type TiltSample = {
  raw: number;
  mapped: number;
};

export function canUseDeviceMotion() {
  return typeof window !== "undefined" && "DeviceMotionEvent" in window;
}

export function isPermissionPromptRequired() {
  const anyDeviceMotion = DeviceMotionEvent as unknown as {
    requestPermission?: () => Promise<"granted" | "denied">;
  };
  return typeof anyDeviceMotion?.requestPermission === "function";
}

export async function requestMotionPermission() {
  const anyDeviceMotion = DeviceMotionEvent as unknown as {
    requestPermission?: () => Promise<"granted" | "denied">;
  };
  if (!anyDeviceMotion?.requestPermission) return "granted" as const;
  return anyDeviceMotion.requestPermission();
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

export function startTiltStream(
  onSample: (sample: TiltSample) => void,
  opts?: { clampG?: number },
) {
  const clampG = opts?.clampG ?? 4.5;

  const handler = (e: DeviceMotionEvent) => {
    const ag = e.accelerationIncludingGravity;
    const angle = getScreenAngle();
    const raw = pickAxis(ag?.x, ag?.y, angle);
    if (raw == null) return;
    const mapped = Math.max(-1, Math.min(1, raw / clampG));
    onSample({ raw, mapped });
  };

  window.addEventListener("devicemotion", handler, { passive: true });

  return () => {
    window.removeEventListener("devicemotion", handler);
  };
}

