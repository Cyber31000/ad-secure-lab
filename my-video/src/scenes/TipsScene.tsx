import { Sequence } from "remotion";
import { theme } from "../theme";
import { BeatScene } from "./BeatScene";

export const TipsScene = () => {
  return (
    <>
      <Sequence durationInFrames={120} layout="none">
        <BeatScene emoji="🛡️" headline="Protège-toi" accent={theme.tip} />
      </Sequence>
      <Sequence from={120} durationInFrames={150} layout="none">
        <BeatScene emoji="✅" headline="Vérifie l'expéditeur" accent={theme.tip} />
      </Sequence>
      <Sequence from={270} durationInFrames={120} layout="none">
        <BeatScene emoji="🔐" headline="Double auth" accent={theme.tip} />
      </Sequence>
      <Sequence from={390} durationInFrames={90} layout="none">
        <BeatScene emoji="🔑" headline="Jamais tes codes" accent={theme.tip} />
      </Sequence>
    </>
  );
};
