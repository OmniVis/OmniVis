// Static shell for GitHub Pages
export const dynamic = "force-static";
import PresenterClient from "@/components/PresenterClient";
export default function PresenterPage() {
  return <PresenterClient channelId="slidi-editor" />;
}
