import { useEffect } from "react";
import { cn } from "@/lib/utils";

export default function TutorialModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="关闭教程"
        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative w-full max-w-[560px] overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl",
          "pb-[env(safe-area-inset-bottom)]",
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-900 px-4 py-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold tracking-tight">游戏教程</div>
            <div className="mt-0.5 text-[11px] leading-tight text-zinc-400">
              目标、界面含义，以及控制/驱动逻辑切换说明
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 shrink-0 items-center justify-center rounded-lg bg-zinc-900 px-3 text-xs font-medium text-zinc-100 hover:bg-zinc-800"
          >
            关闭
          </button>
        </div>

        <div className="max-h-[78dvh] space-y-4 overflow-auto px-4 py-4 text-[12px] leading-relaxed text-zinc-200">
          <section className="space-y-2">
            <div className="text-xs font-semibold text-zinc-100">目标</div>
            <ul className="list-disc space-y-1 pl-5 text-zinc-300">
              <li>从起点跑到终点线，尽量用更短时间完成。</li>
              <li>偏离道路会降速，尽量把车保持在赛道内。</li>
            </ul>
          </section>

          <section className="space-y-2">
            <div className="text-xs font-semibold text-zinc-100">界面说明</div>
            <ul className="list-disc space-y-1 pl-5 text-zinc-300">
              <li>右上角模式：显示当前驱动输入（传感器/触控）。</li>
              <li>计时：比赛中显示当前计时；完成后显示用时。</li>
              <li>控制面板：选赛道、启用传感器、校准、开始/重开、灵敏度。</li>
            </ul>
          </section>

          <section className="space-y-2">
            <div className="text-xs font-semibold text-zinc-100">控制与驱动逻辑（重点）</div>
            <div className="space-y-2 text-zinc-300">
              <div className="font-medium text-zinc-200">1) 传感器驱动（倾斜转向）</div>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  先在控制面板点“启用传感器”，浏览器允许“运动与传感器”后右上角会显示“传感器”。
                </li>
                <li>建议点一次“校准中位”，把当前握持姿势作为“方向盘中位”。</li>
                <li>倾斜手机 = 转向，灵敏度会放大/缩小转向幅度。</li>
              </ul>

              <div className="font-medium text-zinc-200">2) 触控接管（左右拖动）</div>
              <ul className="list-disc space-y-1 pl-5">
                <li>按住画面左右拖动可以临时接管转向。</li>
                <li>一旦你开始拖动，系统会自动切到“触控”模式，优先使用触控输入。</li>
              </ul>

              <div className="font-medium text-zinc-200">3) 在两种驱动之间切换</div>
              <ul className="list-disc space-y-1 pl-5">
                <li>想用触控：直接拖动即可，或在控制面板切到“触控”。</li>
                <li>想回到传感器：在控制面板点“使用传感器/启用传感器”，再校准后开始。</li>
              </ul>
            </div>
          </section>

          <section className="space-y-2">
            <div className="text-xs font-semibold text-zinc-100">小技巧</div>
            <ul className="list-disc space-y-1 pl-5 text-zinc-300">
              <li>iOS 上用 Safari/Chrome 时，可能需要点一次“启用传感器（点我）”触发授权弹窗。</li>
              <li>感觉车太敏/太钝：调“灵敏度”，再校准一次中位。</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

