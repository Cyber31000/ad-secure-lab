import { Sequence } from "remotion";
import { ScamCard } from "./ScamCard";

const CARD_DURATION = 180;

const CARDS = [
  { emoji: "🎣", label: "Phishing" },
  { emoji: "🖥️", label: "Faux support" },
  { emoji: "💔", label: "Fake love" },
  { emoji: "📈", label: "Crypto piégée" },
];

export const ScamTypesScene = () => {
  return (
    <>
      {CARDS.map((card, i) => (
        <Sequence
          key={card.label}
          from={i * CARD_DURATION}
          durationInFrames={CARD_DURATION}
          layout="none"
        >
          <ScamCard index={i + 1} {...card} />
        </Sequence>
      ))}
    </>
  );
};
