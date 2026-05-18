import type { NextConfig } from "next";

const basePath = process.env.NEXT_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  // Disable trailingSlash to prevent redirect loops behind proxies that also manage slashes.
  // Note: If using Nginx/Traefik, ensure X-Forwarded-Proto is set so Next.js knows it's on HTTPS.
  trailingSlash: false,
  images: {
    unoptimized: true,
  },
  // Bake basePath into the client bundle so fetch() calls can prefix it.
  // NEXT_BASE_PATH is set at docker build time (ARG NEXT_BASE_PATH=/slidi).
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;
