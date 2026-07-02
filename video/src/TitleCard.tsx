import { useCurrentFrame, interpolate } from "remotion";

export const TitleCard = () => {
  const frame = useCurrentFrame();

  const opacity = interpolate(
    frame, [0, 20], [0, 1],
    { extrapolateRight: "clamp" }
  );

  const translateY = interpolate(
    frame, [0, 30], [40, 0],
    { extrapolateRight: "clamp" }
  );

  return (
    <div style={{ opacity, transform: `translateY(${translateY}px)` }}>
      <h1>Hello, Remotion</h1>
    </div>
  );
};
