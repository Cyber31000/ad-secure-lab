import { Audio, Sequence, staticFile } from "remotion";
import { HookScene } from "./scenes/HookScene";
import { ScamTypesScene } from "./scenes/ScamTypesScene";
import { WarningsScene } from "./scenes/WarningsScene";
import { TipsScene } from "./scenes/TipsScene";
import { CTAScene } from "./scenes/CTAScene";
import { Subtitles } from "./Subtitles";

export const MyComposition = () => {
  return (
    <>
      <Audio src={staticFile("voiceover.mp3")} />

      <Sequence durationInFrames={90} layout="none">
        <HookScene />
      </Sequence>
      <Sequence from={90} durationInFrames={720} layout="none">
        <ScamTypesScene />
      </Sequence>
      <Sequence from={810} durationInFrames={390} layout="none">
        <WarningsScene />
      </Sequence>
      <Sequence from={1200} durationInFrames={480} layout="none">
        <TipsScene />
      </Sequence>
      <Sequence from={1680} durationInFrames={120} layout="none">
        <CTAScene />
      </Sequence>

      <Subtitles />
    </>
  );
};
