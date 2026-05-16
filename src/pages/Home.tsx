import ControlsPanel from "@/components/ControlsPanel";
import GameCanvas from "@/components/GameCanvas";
import Hud from "@/components/Hud";

export default function Home() {
  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100">
      <div className="mx-auto flex min-h-dvh w-full max-w-[520px] flex-col">
        <div className="px-4 pt-4">
          <Hud />
        </div>
        <div className="flex-1 px-4 py-3">
          <GameCanvas />
        </div>
        <div className="px-4 pb-4">
          <ControlsPanel />
        </div>
      </div>
    </div>
  );
}
