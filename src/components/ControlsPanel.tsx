import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { canUseDeviceMotion, canUseDeviceOrientation, isPermissionPromptRequired, requestMotionPermission } from "@/input/sensorInput";
import { useGameStore } from "@/store/gameStore";
import { cn } from "@/lib/utils";

function Button(props: {
  onClick?: () => void;
  disabled?: boolean;
  children: ReactNode;
  variant?: "primary" | "ghost";
}) {
  const variant = props.variant ?? "ghost";
  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={props.disabled}
      className={cn(
        "inline-flex h-9 items-center justify-center rounded-lg px-3 text-xs font-medium transition active:scale-[0.99] disabled:opacity-50",
        variant === "primary"
          ? "bg-emerald-400 text-zinc-950 hover:bg-emerald-300"
          : "bg-zinc-900 text-zinc-100 hover:bg-zinc-800",
      )}
    >
      {props.children}
    </button>
  );
}

function Slider(props: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <input
      type="range"
      min={props.min}
      max={props.max}
      step={props.step}
      value={props.value}
      onChange={(e) => props.onChange(Number(e.target.value))}
      className="h-1.5 w-full cursor-pointer accent-emerald-400"
    />
  );
}

export default function ControlsPanel() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const status = useGameStore((s) => s.status);
  const setStatus = useGameStore((s) => s.setStatus);
  const setFinishMs = useGameStore((s) => s.setFinishMs);
  const setTelemetry = useGameStore((s) => s.setTelemetry);

  const inputMode = useGameStore((s) => s.inputMode);
  const setInputMode = useGameStore((s) => s.setInputMode);

  const trackId = useGameStore((s) => s.trackId);
  const setTrackId = useGameStore((s) => s.setTrackId);

  const sensorSupported = useGameStore((s) => s.sensorSupported);
  const setSensorSupported = useGameStore((s) => s.setSensorSupported);
  const sensorPermission = useGameStore((s) => s.sensorPermission);
  const setSensorPermission = useGameStore((s) => s.setSensorPermission);
  const sensorEnabled = useGameStore((s) => s.sensorEnabled);
  const setSensorEnabled = useGameStore((s) => s.setSensorEnabled);

  const sensitivity = useGameStore((s) => s.sensitivity);
  const setSensitivity = useGameStore((s) => s.setSensitivity);

  const telemetry = useGameStore((s) => s.telemetry);
  const calibration = useGameStore((s) => s.calibration);
  const setCalibration = useGameStore((s) => s.setCalibration);

  const promptRequired = isPermissionPromptRequired();

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    onChange();
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  async function enableSensor() {
    const supported = canUseDeviceMotion() || canUseDeviceOrientation();
    setSensorSupported(supported);
    if (!supported) {
      setSensorPermission("denied");
      setSensorEnabled(false);
      setInputMode("touch");
      return;
    }

    try {
      const res = await requestMotionPermission();
      if (res === "granted") {
        setSensorPermission("granted");
        setSensorEnabled(true);
        setInputMode("sensor");
      } else {
        setSensorPermission("denied");
        setSensorEnabled(false);
        setInputMode("touch");
      }
    } catch {
      setSensorPermission("denied");
      setSensorEnabled(false);
      setInputMode("touch");
    }
  }

  async function requestLandscapeFullscreen() {
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      return;
    }

    try {
      const so = (screen as unknown as { orientation?: { lock?: (v: string) => Promise<void> } })
        .orientation;
      await so?.lock?.("landscape");
    } catch {
      return;
    }
  }

  async function exitFullscreen() {
    try {
      await document.exitFullscreen();
    } catch {
      return;
    }
  }

  function calibrate() {
    setCalibration(telemetry.tilt + calibration);
  }

  function reset() {
    setFinishMs(null);
    setTelemetry({
      elapsedMs: 0,
      distance: 0,
      speed: 0,
      offroad: false,
      tiltSmooth: 0,
    });
    setStatus("idle");
  }

  function start() {
    setFinishMs(null);
    setTelemetry({
      elapsedMs: 0,
      distance: 0,
      speed: 0,
      offroad: false,
      tiltSmooth: 0,
    });
    setStatus("running");
  }

  const showEnable =
    inputMode === "sensor" &&
    (!sensorEnabled || sensorPermission !== "granted" || !sensorSupported);

  if (status === "running") {
    return (
      <div className="fixed inset-x-0 bottom-3 z-20 flex justify-center px-4 pb-[env(safe-area-inset-bottom)]">
        <div className="w-full max-w-[520px]">
          <div className="rounded-xl bg-zinc-950/65 p-2 backdrop-blur">
            <div className="grid grid-cols-1 gap-2">
              <Button onClick={reset} variant="primary">
                重开
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-zinc-900/60 p-2.5 backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-medium">控制</div>
          <div className="text-[11px] leading-tight text-zinc-400">
            倾斜像方向盘一样转向，或用触控左右拖动兜底
          </div>
        </div>
        <div className="shrink-0 rounded-lg bg-zinc-950/60 px-2.5 py-1.5 text-[11px] text-zinc-200">
          校准 {calibration.toFixed(2)}
        </div>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <Button
          onClick={() => {
            setTrackId("track1");
            reset();
          }}
          variant={trackId === "track1" ? "primary" : "ghost"}
        >
          赛道1
        </Button>
        <Button
          onClick={() => {
            setTrackId("track2");
            reset();
          }}
          variant={trackId === "track2" ? "primary" : "ghost"}
        >
          赛道2（高难）
        </Button>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        {showEnable ? (
          <Button onClick={enableSensor} variant="primary">
            {promptRequired ? "启用传感器（点我）" : "启用传感器"}
          </Button>
        ) : (
          <Button
            onClick={() => {
              setInputMode("touch");
              setSensorEnabled(false);
            }}
          >
            使用触控模式
          </Button>
        )}
        <Button onClick={calibrate}>
          校准中位
        </Button>
        <Button onClick={start} variant="primary">
          开始
        </Button>
        <Button onClick={reset}>重开</Button>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <Button
          onClick={requestLandscapeFullscreen}
          disabled={isFullscreen}
        >
          横屏全屏
        </Button>
        <Button onClick={exitFullscreen} disabled={!isFullscreen}>
          退出全屏
        </Button>
      </div>

      <div className="mt-2.5">
        <div className="mb-2 flex items-center justify-between text-xs text-zinc-400">
          <div>灵敏度</div>
          <div className="tabular-nums">{sensitivity.toFixed(2)}</div>
        </div>
        <Slider
          value={sensitivity}
          min={0.6}
          max={8}
          step={0.05}
          onChange={setSensitivity}
        />
      </div>

      <div className="mt-2.5 text-[11px] text-zinc-400">
        <div className="flex items-center justify-between">
          <div className="tabular-nums">
            倾斜 {telemetry.tilt.toFixed(2)} / 平滑 {telemetry.tiltSmooth.toFixed(2)}
          </div>
          <div className="tabular-nums">{Math.floor(telemetry.distance)} m</div>
        </div>
        {inputMode === "sensor" ? (
          <div>
            {sensorPermission === "denied"
              ? "传感器不可用/被拒绝，已切换为触控模式"
              : sensorEnabled
                ? Math.abs(telemetry.tiltRaw) < 0.0001
                  ? "传感器已启用但未收到数据：请用Chrome打开，并在站点设置里允许“运动与传感器”"
                  : "传感器已启用，建议先校准再开始"
                : "未启用传感器"}
          </div>
        ) : (
          <div>触控：按住画面左右拖动</div>
        )}
      </div>
    </div>
  );
}
