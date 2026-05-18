"use client";

import SrcdocPreview from "@/components/SrcdocPreview";

interface ViewerSandpackProps {
  code: string;
  id?: string;
}

/**
 * Renders a shared presentation using SrcdocPreview.
 * Replaces the old SandpackProvider+SandpackPreview approach which required
 * a service worker — unavailable on plain HTTP in production.
 */
export default function ViewerSandpack({ code, id }: ViewerSandpackProps) {
  const channel = id || (typeof window !== "undefined" ? window.location.pathname.split("/").pop() : "viewer");
  return <SrcdocPreview code={code} theme="minimal" branding={null} syncChannel={channel} />;
}
