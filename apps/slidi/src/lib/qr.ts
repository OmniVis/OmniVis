import QRCode from "qrcode";

/**
 * Generate a QR code as a data URL.
 * Client-side only — call from useEffect or event handlers, not during SSR.
 */
export async function generateQRDataURL(text: string): Promise<string> {
  return QRCode.toDataURL(text, { margin: 1, width: 256, color: { dark: "#0f172a", light: "#ffffff" } });
}
