import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname, "../.."),
  async rewrites() {
    const api = process.env.API_ORIGIN ?? "http://127.0.0.1:4000";
    return [{ source: "/eg-api/:path*", destination: `${api}/:path*` }];
  },
};

export default nextConfig;
