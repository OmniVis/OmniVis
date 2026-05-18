// Static shell for GitHub Pages — all data is read client-side via
// localStorage / BroadcastChannel inside PresenterClient.
// Server-side DB lookups and searchParams are handled at runtime
// by the Cloudflare Worker API when a cloud presentation ID is present.
export const dynamic = "force-static";

import PresenterClient from "@/components/PresenterClient";

export default function PresenterPage() {
  return <PresenterClient channelId="slidi-editor" />;
}
