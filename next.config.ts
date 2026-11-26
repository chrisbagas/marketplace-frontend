import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

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

// Sentry wrapper: source maps are uploaded only when SENTRY_AUTH_TOKEN is set (plus
// SENTRY_ORG and SENTRY_PROJECT); otherwise it only wires up instrumentation.
export default withSentryConfig(nextConfig, {
  silent: true,
  telemetry: false,
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
  // Errors only (tracesSampleRate is 0): drop tracing code and SDK debug logging to keep the bundle small.
  bundleSizeOptimizations: { excludeTracing: true, excludeDebugStatements: true },
});
