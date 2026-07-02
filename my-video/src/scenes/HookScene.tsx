import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { SAFE, theme } from "../theme";

export const HookScene = () => {
  const frame = useCurrentFrame();

  const scale = interpolate(frame, [0, 20], [0.7, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const rotate = interpolate(frame, [0, 6, 12, 18], [-4, 4, -3, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = interpolate(frame, [0, 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.bg,
        justifyContent: "center",
        alignItems: "center",
        paddingLeft: SAFE.left,
        paddingRight: SAFE.right,
        paddingTop: SAFE.top,
        paddingBottom: SAFE.bottom,
        fontFamily: theme.fontFamily,
        color: theme.text,
      }}
    >
      <div
        style={{
          opacity,
          scale: `${scale}`,
          rotate: `${rotate}deg`,
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 30,
        }}
      >
        <div style={{ fontSize: 260, lineHeight: 1 }}>⚠️</div>
        <div
          style={{
            fontSize: 240,
            fontWeight: 900,
            color: theme.hook,
            letterSpacing: -6,
            lineHeight: 0.9,
          }}
        >
          STOP
        </div>
      </div>
    </AbsoluteFill>
  );
};
