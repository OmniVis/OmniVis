export type UrlContext = "image" | "link";

export interface SanitizeResult {
  valid: boolean;
  url: string;
  warning?: string;
}

const BLOCKED_SCHEMES = ["javascript", "data", "vbscript", "file"];

export function sanitizeUrl(raw: string, context: UrlContext): SanitizeResult {
  const trimmed = raw.trim();
  // Strip whitespace and control chars before scheme-checking to catch `  javascript:` tricks
  const normalised = trimmed.replace(/[\s\u0000-\u001F]/g, "").toLowerCase();

  for (const scheme of BLOCKED_SCHEMES) {
    if (
      normalised.startsWith(scheme + ":") ||
      normalised.startsWith(scheme + "%3a")
    ) {
      return { valid: false, url: "", warning: `"${scheme}:" URLs are not allowed.` };
    }
  }

  if (context === "image") {
    if (trimmed.startsWith("https://")) return { valid: true, url: trimmed };
    if (trimmed.startsWith("http://")) {
      return { valid: true, url: trimmed, warning: "Non-HTTPS URL — may be blocked by some browsers." };
    }
    return { valid: false, url: "", warning: "Image URLs must start with https:// or http://" };
  }

  // link context
  if (trimmed.startsWith("https://") || trimmed.startsWith("http://")) {
    return { valid: true, url: trimmed };
  }
  if (trimmed.startsWith("mailto:")) return { valid: true, url: trimmed };
  return { valid: false, url: "", warning: 'Link URLs must start with https://, http://, or mailto:' };
}
