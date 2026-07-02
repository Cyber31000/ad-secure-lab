import { AbsoluteFill, useCurrentFrame } from "remotion";
import { theme } from "../theme";
import { fadeIn, slideUp } from "../animations";

type Props = {
  emoji: string;
  title: string;
  description: string;
};

export const ScamCard: React.FC<Props> = ({ emoji, title, description }) => {
  const frame = useCurrentFrame();
  const opacity = fadeIn(frame, 0, 15);
  const translateY = slideUp(frame, 0, 22, 30);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.bg,
        justifyContent: "center",
        alignItems: "center",
        fontFamily: theme.fontFamily,
        color: theme.text,
        padding: 100,
      }}
    >
      <div
        style={{
          opacity,
          transform: `translateY(${translateY}px)`,
          textAlign: "center",
          maxWidth: 1200,
        }}
      >
        <div style={{ fontSize: 200, lineHeight: 1, marginBottom: 32 }}>
          {emoji}
        </div>
        <h2
          style={{
            fontSize: 88,
            margin: 0,
            color: theme.warning,
            fontWeight: 800,
          }}
        >
          {title}
        </h2>
        <p
          style={{
            fontSize: 42,
            color: theme.muted,
            marginTop: 28,
            lineHeight: 1.4,
          }}
        >
          {description}
        </p>
      </div>
    </AbsoluteFill>
  );
};
