import { AbsoluteFill, useCurrentFrame } from "remotion";
import { theme } from "../theme";
import { fadeIn, slideInX, slideUp } from "../animations";

type Item = { icon: string; text: string };

type Props = {
  title: string;
  items: Item[];
  accentColor: string;
};

export const ListScene: React.FC<Props> = ({ title, items, accentColor }) => {
  const frame = useCurrentFrame();
  const titleOpacity = fadeIn(frame, 0, 15);
  const titleY = slideUp(frame, 0, 20, 20);

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
      <div style={{ maxWidth: 1300, width: "100%" }}>
        <h2
          style={{
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
            fontSize: 76,
            margin: 0,
            marginBottom: 56,
            color: accentColor,
            textAlign: "center",
            fontWeight: 800,
          }}
        >
          {title}
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {items.map((item, i) => {
            const itemStart = 18 + i * 10;
            const opacity = fadeIn(frame, itemStart, 15);
            const x = slideInX(frame, itemStart, 20, -40);
            return (
              <div
                key={item.text}
                style={{
                  opacity,
                  transform: `translateX(${x}px)`,
                  display: "flex",
                  alignItems: "center",
                  gap: 28,
                  backgroundColor: theme.surface,
                  padding: "28px 40px",
                  borderRadius: 16,
                  borderLeft: `6px solid ${accentColor}`,
                }}
              >
                <span style={{ fontSize: 54 }}>{item.icon}</span>
                <span style={{ fontSize: 36, lineHeight: 1.3 }}>
                  {item.text}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
