import { Sequence } from "remotion";
import { theme } from "../theme";
import { BeatScene } from "./BeatScene";

export const WarningsScene = () => {
  return (
    <>
      <Sequence durationInFrames={120} layout="none">
        <BeatScene emoji="🚨" headline="SIGNAUX D'ALERTE" accent={theme.warning} />
      </Sequence>
      <Sequence from={120} durationInFrames={150} layout="none">
        <BeatScene emoji="⏰" headline="Urgence + chantage" accent={theme.warning} />
      </Sequence>
      <Sequence from={270} durationInFrames={120} layout="none">
        <BeatScene emoji="🔗" headline="Liens louches" accent={theme.warning} />
      </Sequence>
    </>
  );
};
