import { create } from "zustand";
import type { TrackId } from "@/game/tracks";

export type GameStatus = "idle" | "running" | "finished";
export type InputMode = "sensor" | "touch";
export type SensorPermission = "unknown" | "granted" | "denied";

type Telemetry = {
  tiltRaw: number;
  tilt: number;
  tiltSmooth: number;
  elapsedMs: number;
  distance: number;
  speed: number;
  offroad: boolean;
};

type GameState = {
  status: GameStatus;
  inputMode: InputMode;

  trackId: TrackId;

  sensorSupported: boolean;
  sensorPermission: SensorPermission;
  sensorEnabled: boolean;

  sensitivity: number;
  calibration: number;

  telemetry: Telemetry;
  finishMs: number | null;

  setInputMode: (mode: InputMode) => void;
  setTrackId: (trackId: TrackId) => void;
  setSensorSupported: (supported: boolean) => void;
  setSensorPermission: (permission: SensorPermission) => void;
  setSensorEnabled: (enabled: boolean) => void;
  setSensitivity: (value: number) => void;
  setCalibration: (value: number) => void;

  setStatus: (status: GameStatus) => void;
  setTelemetry: (partial: Partial<Telemetry>) => void;
  setFinishMs: (ms: number | null) => void;
};

const defaultTelemetry: Telemetry = {
  tiltRaw: 0,
  tilt: 0,
  tiltSmooth: 0,
  elapsedMs: 0,
  distance: 0,
  speed: 0,
  offroad: false,
};

export const useGameStore = create<GameState>((set) => ({
  status: "idle",
  inputMode: "sensor",
  trackId: "track1",
  sensorSupported: true,
  sensorPermission: "unknown",
  sensorEnabled: false,
  sensitivity: 3.2,
  calibration: 0,
  telemetry: defaultTelemetry,
  finishMs: null,

  setInputMode: (mode) => set({ inputMode: mode }),
  setTrackId: (trackId) => set({ trackId }),
  setSensorSupported: (supported) => set({ sensorSupported: supported }),
  setSensorPermission: (permission) => set({ sensorPermission: permission }),
  setSensorEnabled: (enabled) => set({ sensorEnabled: enabled }),
  setSensitivity: (value) =>
    set({ sensitivity: Math.min(8, Math.max(0.6, value)) }),
  setCalibration: (value) => set({ calibration: value }),

  setStatus: (status) => set({ status }),
  setTelemetry: (partial) =>
    set((s) => ({ telemetry: { ...s.telemetry, ...partial } })),
  setFinishMs: (ms) => set({ finishMs: ms }),
}));
