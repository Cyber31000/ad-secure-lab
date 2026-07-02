import { Sequence } from "remotion";
import { IntroScene } from "./scenes/IntroScene";
import { ScamTypesScene } from "./scenes/ScamTypesScene";
import { WarningSignsScene } from "./scenes/WarningSignsScene";
import { ProtectionScene } from "./scenes/ProtectionScene";
import { OutroScene } from "./scenes/OutroScene";

export const MyComposition = () => {
  return (
    <>
      <Sequence durationInFrames={90}>
        <IntroScene />
      </Sequence>
      <Sequence from={90} durationInFrames={360}>
        <ScamTypesScene />
      </Sequence>
      <Sequence from={450} durationInFrames={180}>
        <WarningSignsScene />
      </Sequence>
      <Sequence from={630} durationInFrames={180}>
        <ProtectionScene />
      </Sequence>
      <Sequence from={810} durationInFrames={90}>
        <OutroScene />
      </Sequence>
    </>
  );
};
