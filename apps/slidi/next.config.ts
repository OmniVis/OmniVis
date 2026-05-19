import type { NextConfig } from "next";
const basePath = process.env.NEXT_BASE_PATH ?? "";
const nextConfig: NextConfig = {
  output: "export",
  basePath,
  trailingSlash: false,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BASE_PATH: basePath }
};
export default nextConfig;
