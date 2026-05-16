import ControlsPanel from "@/components/ControlsPanel";
import GameCanvas from "@/components/GameCanvas";
import Hud from "@/components/Hud";

export default function Home() {
  return (
    <div className="min-h-dvh bg-zinc-950 text-zinc-100">
      <div className="mx-auto flex min-h-dvh w-full max-w-[520px] flex-col [@media(orientation:landscape)]:max-w-[980px] [@media(orientation:landscape)]:flex-row">
        <div className="px-4 pt-4 [@media(orientation:landscape)]:w-[360px] [@media(orientation:landscape)]:shrink-0 [@media(orientation:landscape)]:pb-4">
          <Hud />
          <div className="mt-3 [@media(orientation:landscape)]:mt-4">
            <ControlsPanel />
          </div>
        </div>
        <div className="flex-1 px-4 py-3 [@media(orientation:landscape)]:py-4">
          <GameCanvas />
        </div>
      </div>
    </div>
  );
}
