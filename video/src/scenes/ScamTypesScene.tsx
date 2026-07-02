import { Sequence } from "remotion";
import { ScamCard } from "./ScamCard";

const CARD_DURATION = 90;

const CARDS = [
  {
    emoji: "🎣",
    title: "Phishing",
    description:
      "Fake emails or texts posing as banks, delivery services, or coworkers — designed to steal your password.",
  },
  {
    emoji: "🖥️",
    title: "Tech Support Scams",
    description:
      "Pop-ups and cold calls claim your device is infected. The real goal is remote access to your machine.",
  },
  {
    emoji: "💔",
    title: "Romance Scams",
    description:
      "Fake profiles build trust over weeks, then invent an emergency to ask for money or gift cards.",
  },
  {
    emoji: "📈",
    title: "Investment Fraud",
    description:
      "Guaranteed returns, crypto giveaways, and 'insider tips' from strangers on social media.",
  },
];

export const ScamTypesScene = () => {
  return (
    <>
      {CARDS.map((card, i) => (
        <Sequence
          key={card.title}
          from={i * CARD_DURATION}
          durationInFrames={CARD_DURATION}
        >
          <ScamCard {...card} />
        </Sequence>
      ))}
    </>
  );
};
