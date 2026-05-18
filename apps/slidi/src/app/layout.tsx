import type { Metadata } from "next";
import "./globals.css";

// Prefix the favicon with basePath — metadata.icons doesn't apply basePath
// reliably in Next.js 16, so we use NEXT_PUBLIC_BASE_PATH explicitly.
const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const metadata: Metadata = {
  title: "Slidi - Next Level Slides",
  description: "Generate interactive web presentations with AI. Bring your own API key.",
  icons: {
    icon: `${base}/favicon.ico`,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  );
}
