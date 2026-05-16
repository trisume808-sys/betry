import { useGameStore } from "@/store/gameStore";

function formatMs(ms: number) {
  const s = ms / 1000;
  const m = Math.floor(s / 60);
  const r = s - m * 60;
  return `${m}:${r.toFixed(2).padStart(5, "0")}`;
}

export default function Hud(props: { onOpenTutorial?: () => void }) {
  const status = useGameStore((s) => s.status);
  const inputMode = useGameStore((s) => s.inputMode);
  const sensorEnabled = useGameStore((s) => s.sensorEnabled);
  const sensorPermission = useGameStore((s) => s.sensorPermission);
  const telemetry = useGameStore((s) => s.telemetry);
  const finishMs = useGameStore((s) => s.finishMs);
  const buildId =
    (import.meta as unknown as { env?: Record<string, string | undefined> })?.env
      ?.VITE_BUILD_ID ?? "dev";

  const title =
    status === "running"
      ? "比赛中"
      : status === "finished"
        ? "完成"
        : "待开始";

  const modeLabel =
    inputMode === "sensor" && sensorEnabled
      ? "传感器"
      : inputMode === "touch"
        ? "触控"
        : sensorPermission === "denied"
          ? "传感器被拒绝"
          : "未启用";

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="text-sm text-zinc-400">陀螺仪赛车 MVP</div>
        <div className="truncate text-lg font-semibold tracking-tight">
          {title}
        </div>
        <div className="mt-1 text-[11px] text-zinc-500">
          build {buildId.slice(0, 7)}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-zinc-900 px-2 py-1 text-xs text-zinc-200">
            {modeLabel}
          </div>
          {props.onOpenTutorial ? (
            <button
              type="button"
              onClick={props.onOpenTutorial}
              className="rounded-full bg-zinc-900 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-800"
            >
              教程
            </button>
          ) : null}
        </div>
        <div className="text-right text-xs text-zinc-400">
          {status === "finished" && finishMs != null
            ? `用时 ${formatMs(finishMs)}`
            : `计时 ${formatMs(telemetry.elapsedMs)}`}
        </div>
      </div>
    </div>
  );
}
