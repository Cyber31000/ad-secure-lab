import { interpolate } from "remotion";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const fadeIn = (frame: number, start = 0, duration = 20) =>
  interpolate(frame, [start, start + duration], [0, 1], clamp);

export const fadeOut = (frame: number, start: number, duration = 20) =>
  interpolate(frame, [start, start + duration], [1, 0], clamp);

export const slideUp = (
  frame: number,
  start = 0,
  duration = 30,
  distance = 40,
) => interpolate(frame, [start, start + duration], [distance, 0], clamp);

export const slideInX = (
  frame: number,
  start = 0,
  duration = 20,
  distance = -40,
) => interpolate(frame, [start, start + duration], [distance, 0], clamp);
