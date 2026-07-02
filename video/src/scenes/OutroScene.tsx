import { AbsoluteFill, useCurrentFrame } from "remotion";
import { theme } from "../theme";
import { fadeIn, slideUp } from "../animations";

export const OutroScene = () => {
  const frame = useCurrentFrame();
  const opacity = fadeIn(frame, 0, 20);
  const translateY = slideUp(frame, 0, 25, 30);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.bg,
        justifyContent: "center",
        alignItems: "center",
        fontFamily: theme.fontFamily,
        color: theme.text,
      }}
    >
      <div
        style={{
          opacity,
          transform: `translateY(${translateY}px)`,
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontSize: 128,
            margin: 0,
            fontWeight: 800,
            color: theme.accent,
          }}
        >
          Stay vigilant.
        </h1>
        <div style={{ fontSize: 44, color: theme.muted, marginTop: 32 }}>
          When in doubt, don't click. Ask someone you trust.
        </div>
      </div>
    </AbsoluteFill>
  );
};
