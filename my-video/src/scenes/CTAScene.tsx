import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { SAFE, theme } from "../theme";

export const CTAScene = () => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const scale = interpolate(frame, [0, 18], [0.85, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const bounceY = interpolate(
    frame % 30,
    [0, 10, 20, 30],
    [0, -30, 0, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

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
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 60,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 150,
            fontWeight: 900,
            color: theme.hook,
            lineHeight: 1,
            letterSpacing: -3,
          }}
        >
          Ta pire arnaque ?
        </div>
        <div
          style={{
            fontSize: 220,
            translate: `0px ${bounceY}px`,
            lineHeight: 1,
          }}
        >
          👇
        </div>
        <div
          style={{
            fontSize: 88,
            fontWeight: 800,
            color: theme.text,
            display: "flex",
            gap: 40,
            alignItems: "center",
          }}
        >
          <span>❤️</span>
          <span style={{ color: theme.muted }}>+</span>
          <span>💬</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
