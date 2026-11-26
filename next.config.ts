import type { NextConfig } from "next";

// Semua panggilan /api/* diteruskan ke backend Go (folder ../backend).
// Frontend tetap memanggil fetch("/api/...") — tanpa CORS, tanpa hardcode host.
const API_URL = process.env.API_URL ?? "http://localhost:8081";

const isProd = process.env.NODE_ENV === "production";

// Midtrans Snap: snap.js + iframe pembayaran (app.*) dan panggilan API (api.*),
// sandbox dan produksi (backend memilih lewat MIDTRANS_ENV).
const MIDTRANS_APP = ["https://app.midtrans.com", "https://app.sandbox.midtrans.com"];
const MIDTRANS_API = ["https://api.midtrans.com", "https://api.sandbox.midtrans.com"];

// Optional extra image origin (object storage / CDN for uploaded designs).
const FILES_ORIGIN = process.env.FILES_ORIGIN?.trim();

// Report-Only: violations are logged to the browser console but nothing is blocked yet.
// - script 'unsafe-inline': Next injects inline bootstrap scripts (no nonce set up).
// - style 'unsafe-inline': components use style={{…}}.
// - img data:/blob: — designs and avatars are data: URIs; /uploads is same-origin via the proxy.
// - Google sign-in is a top-level redirect (/api/auth/google/start), not a script or iframe.
// - next/font is self-hosted at build time.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"} ${MIDTRANS_APP.join(" ")}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob:${FILES_ORIGIN ? ` ${FILES_ORIGIN}` : ""}`,
  "font-src 'self' data:",
  `connect-src 'self' ${[...MIDTRANS_APP, ...MIDTRANS_API].join(" ")}${isProd ? "" : " ws: wss:"}`,
  `frame-src ${MIDTRANS_APP.join(" ")}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Content-Security-Policy-Report-Only", value: csp },
        ],
      },
      // Halaman tujuan link email membawa token di URL — jangan bocorkan lewat
      // header Referer ke situs lain. Listed after the catch-all rule so it wins
      // (Next applies matching rules in order; the last value for a key is kept).
      ...["/reset-password", "/verifikasi-email"].map((source) => ({
        source,
        headers: [{ key: "Referrer-Policy", value: "no-referrer" }],
      })),
    ];
  },
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${API_URL}/api/:path*` },
      { source: "/uploads/:path*", destination: `${API_URL}/uploads/:path*` }, // gambar desain tersimpan
    ];
  },
};

export default nextConfig;
