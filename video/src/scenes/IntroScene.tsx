import { AbsoluteFill, useCurrentFrame } from "remotion";
import { theme } from "../theme";
import { fadeIn, slideUp } from "../animations";

export const IntroScene = () => {
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
        <div
          style={{
            fontSize: 32,
            color: theme.accent,
            letterSpacing: 8,
            marginBottom: 24,
          }}
        >
          STAY SAFE ONLINE
        </div>
        <h1 style={{ fontSize: 128, margin: 0, fontWeight: 800 }}>
          Online Scams
        </h1>
        <div style={{ fontSize: 40, color: theme.muted, marginTop: 24 }}>
          What to watch for
        </div>
      </div>
    </AbsoluteFill>
  );
};
