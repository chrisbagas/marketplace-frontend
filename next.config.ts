import type { NextConfig } from "next";

// Semua panggilan /api/* diteruskan ke backend Go (folder ../backend).
// Frontend tetap memanggil fetch("/api/...") — tanpa CORS, tanpa hardcode host.
const API_URL = process.env.API_URL ?? "http://localhost:8081";

const nextConfig: NextConfig = {
  // Halaman tujuan link email membawa token di URL — jangan bocorkan lewat
  // header Referer ke situs lain (mis. font/gambar pihak ketiga).
  async headers() {
    return ["/reset-password", "/verifikasi-email"].map((source) => ({
      source,
      headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
    }));
  },
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${API_URL}/api/:path*` },
      { source: "/uploads/:path*", destination: `${API_URL}/uploads/:path*` }, // gambar desain tersimpan
    ];
  },
};

export default nextConfig;
