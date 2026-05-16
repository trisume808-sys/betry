import type { ReactNode } from "react";
import { canUseDeviceMotion, isPermissionPromptRequired, requestMotionPermission } from "@/input/sensorInput";
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
        "inline-flex h-11 items-center justify-center rounded-xl px-4 text-sm font-medium transition active:scale-[0.99] disabled:opacity-50",
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
      className="h-2 w-full cursor-pointer accent-emerald-400"
    />
  );
}

export default function ControlsPanel() {
  const status = useGameStore((s) => s.status);
  const setStatus = useGameStore((s) => s.setStatus);
  const setFinishMs = useGameStore((s) => s.setFinishMs);
  const setTelemetry = useGameStore((s) => s.setTelemetry);

  const inputMode = useGameStore((s) => s.inputMode);
  const setInputMode = useGameStore((s) => s.setInputMode);

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

  async function enableSensor() {
    const supported = canUseDeviceMotion();
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

  function calibrate() {
    setCalibration(telemetry.tilt);
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

  return (
    <div className="rounded-2xl bg-zinc-900/60 p-3 backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium">控制</div>
          <div className="text-xs text-zinc-400">
            倾斜像方向盘一样转向，或用触控左右拖动兜底
          </div>
        </div>
        <div className="shrink-0 rounded-xl bg-zinc-950/60 px-3 py-2 text-xs text-zinc-200">
          校准 {calibration.toFixed(2)}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
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
        <Button onClick={calibrate} disabled={status === "running"}>
          校准中位
        </Button>
        {status === "running" ? (
          <Button onClick={reset}>结束/重置</Button>
        ) : (
          <Button onClick={start} variant="primary">
            开始
          </Button>
        )}
        <Button onClick={reset}>重开</Button>
      </div>

      <div className="mt-3">
        <div className="mb-2 flex items-center justify-between text-xs text-zinc-400">
          <div>灵敏度</div>
          <div className="tabular-nums">{sensitivity.toFixed(2)}</div>
        </div>
        <Slider
          value={sensitivity}
          min={0.6}
          max={4}
          step={0.05}
          onChange={setSensitivity}
        />
      </div>

      <div className="mt-3 text-xs text-zinc-400">
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
                ? "传感器已启用，建议先校准再开始"
                : "未启用传感器"}
          </div>
        ) : (
          <div>触控：按住画面左右拖动</div>
        )}
      </div>
    </div>
  );
}
