import { useState, useEffect } from "react";
import { getAsset } from "@/lib/idb";

/**
 * Resolves a logo URL reference to an actual displayable URL.
 * - `idb://<uuid>` → fetches data URL from IndexedDB (async)
 * - Any other string → returned as-is (synchronous)
 * - `undefined` → returns `undefined`
 */
export function useLogoUrl(logoUrl: string | undefined): string | undefined {
  const [resolved, setResolved] = useState<string | undefined>(() => {
    if (!logoUrl || !logoUrl.startsWith("idb://")) return logoUrl;
    return undefined;
  });

  useEffect(() => {
    if (!logoUrl || !logoUrl.startsWith("idb://")) {
      setResolved(logoUrl);
      return;
    }
    let cancelled = false;
    resolveLogoUrl(logoUrl).then((data) => {
      if (!cancelled) setResolved(data);
    });
    return () => {
      cancelled = true;
    };
  }, [logoUrl]);

  return resolved;
}

/** Pure async resolver — usable in tests and non-React contexts. */
export async function resolveLogoUrl(logoUrl: string | undefined): Promise<string | undefined> {
  if (!logoUrl || !logoUrl.startsWith("idb://")) return logoUrl;
  const id = logoUrl.slice("idb://".length);
  return getAsset(id);
}
