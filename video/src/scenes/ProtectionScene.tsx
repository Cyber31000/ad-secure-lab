import { theme } from "../theme";
import { ListScene } from "./ListScene";

const ITEMS = [
  { icon: "✅", text: "Verify senders through official channels" },
  { icon: "🔑", text: "Never share passwords or one-time codes" },
  { icon: "🛡️", text: "Enable multi-factor authentication" },
  { icon: "🔄", text: "Keep your browser and OS up to date" },
  { icon: "🚨", text: "Report suspicious messages to your IT team" },
];

export const ProtectionScene = () => {
  return (
    <ListScene
      title="How to Protect Yourself"
      items={ITEMS}
      accentColor={theme.accent}
    />
  );
};
