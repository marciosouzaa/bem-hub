import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    proxyClientMaxBodySize: "6mb",
  },
  serverExternalPackages: ["mammoth", "pdf-parse", "pdfjs-dist"],
};

export default nextConfig;
