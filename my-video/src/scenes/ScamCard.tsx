import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { SAFE, theme } from "../theme";

type Props = {
  index: number;
  emoji: string;
  label: string;
};

export const ScamCard: React.FC<Props> = ({ index, emoji, label }) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const y = interpolate(frame, [0, 18], [40, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const emojiScale = interpolate(frame, [0, 20], [0.85, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
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
          translate: `0px ${y}px`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 40,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 88,
            fontWeight: 900,
            color: theme.brand,
            letterSpacing: 12,
          }}
        >
          #{index}
        </div>
        <div
          style={{
            fontSize: 340,
            lineHeight: 1,
            scale: `${emojiScale}`,
          }}
        >
          {emoji}
        </div>
        <div
          style={{
            fontSize: 130,
            fontWeight: 900,
            color: theme.warning,
            letterSpacing: -3,
            lineHeight: 1,
            maxWidth: 880,
          }}
        >
          {label}
        </div>
      </div>
    </AbsoluteFill>
  );
};
