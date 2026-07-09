import type { NextConfig } from "next";

// Semua panggilan /api/* diteruskan ke backend Go (folder ../backend).
// Frontend tetap memanggil fetch("/api/...") — tanpa CORS, tanpa hardcode host.
const API_URL = process.env.API_URL ?? "http://localhost:8081";

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_URL}/api/:path*` }];
  },
};

export default nextConfig;
