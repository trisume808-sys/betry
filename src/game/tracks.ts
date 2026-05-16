export type TrackId = "track1" | "track2";

export type TrackDef = {
  id: TrackId;
  name: string;
  finishDistance: number;
  baseSpeed: number;
  centerX: (y: number) => number;
  halfWidth: (y: number) => number;
  elevation: (y: number) => number;
};

const track1: TrackDef = {
  id: "track1",
  name: "赛道1",
  finishDistance: 1800,
  baseSpeed: 260,
  centerX: (y) => 110 * Math.sin(y * 0.0022) + 70 * Math.sin(y * 0.0011 + 1.7),
  halfWidth: (y) => 135 + 18 * Math.sin(y * 0.0007 + 0.5),
  elevation: () => 0,
};

const track2: TrackDef = {
  id: "track2",
  name: "赛道2（高难）",
  finishDistance: 2200,
  baseSpeed: 270,
  centerX: (y) =>
    160 * Math.sin(y * 0.0034) +
    110 * Math.sin(y * 0.0017 + 1.2) +
    60 * Math.sin(y * 0.007 + 0.4),
  halfWidth: (y) =>
    112 +
    22 * Math.sin(y * 0.0011 + 0.6) +
    10 * Math.sin(y * 0.0024 + 2.1) -
    10 * Math.sin(y * 0.00042 + 0.2),
  elevation: (y) =>
    80 * Math.sin(y * 0.0013) +
    55 * Math.sin(y * 0.0027 + 0.8) +
    25 * Math.sin(y * 0.0041 + 2.2),
};

export const tracks: Record<TrackId, TrackDef> = {
  track1,
  track2,
};

export function getTrack(id: TrackId) {
  return tracks[id];
}

