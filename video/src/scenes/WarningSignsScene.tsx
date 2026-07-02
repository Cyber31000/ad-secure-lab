import { theme } from "../theme";
import { ListScene } from "./ListScene";

const ITEMS = [
  { icon: "⏰", text: "Urgency — 'act now or lose your account'" },
  { icon: "💳", text: "Requests for wire transfers or gift cards" },
  { icon: "✉️", text: "Odd sender addresses or misspellings" },
  { icon: "🔗", text: "Unexpected attachments or shortened links" },
  { icon: "🎁", text: "Offers that sound too good to be true" },
];

export const WarningSignsScene = () => {
  return (
    <ListScene
      title="Warning Signs"
      items={ITEMS}
      accentColor={theme.warning}
    />
  );
};
