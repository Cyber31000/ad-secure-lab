import { AbsoluteFill, interpolate, useCurrentFrame, Easing } from "remotion";
import { SAFE, theme } from "./theme";
import { SUBTITLES } from "./captions";

const FADE = 6;

export const Subtitles = () => {
  const frame = useCurrentFrame();
  const active = SUBTITLES.find(
    (line) => frame >= line.fromFrame && frame < line.toFrame,
  );

  if (!active) {
    return null;
  }

  const local = frame - active.fromFrame;
  const remaining = active.toFrame - frame;
  const opacity = interpolate(
    Math.min(local, remaining),
    [0, FADE],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    },
  );

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: SAFE.bottom,
        paddingLeft: 80,
        paddingRight: 80,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          opacity,
          fontFamily: theme.fontFamily,
          color: theme.text,
          fontSize: 66,
          fontWeight: 900,
          lineHeight: 1.15,
          textAlign: "center",
          maxWidth: 900,
          letterSpacing: -0.5,
          WebkitTextStroke: "8px #000",
          paintOrder: "stroke fill",
          textShadow: "0 6px 16px rgba(0,0,0,0.55)",
        }}
      >
        {active.text}
      </div>
    </AbsoluteFill>
  );
};
