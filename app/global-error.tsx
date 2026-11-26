"use client";

import { useEffect } from "react";
import { SENTRY_DSN } from "@/lib/sentry";

// Last-resort boundary for render errors in the root layout. It replaces the
// layout, so it renders its own <html>. The SDK is imported lazily (see
// instrumentation-client.ts) so it stays out of the first-load bundle; with no
// DSN at build time nothing is loaded.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    if (!SENTRY_DSN) return;
    import("@sentry/nextjs")
      .then((Sentry) => Sentry.captureException(error))
      .catch(() => {});
  }, [error]);

  return (
    <html lang="id">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "4rem 1rem", textAlign: "center" }}>
        <h1>Terjadi kesalahan</h1>
        <p>Maaf, ada yang tidak beres di sisi kami. Coba muat ulang halaman ini.</p>
        <button onClick={reset} style={{ marginTop: "1rem", padding: "0.5rem 1.25rem", cursor: "pointer" }}>
          Coba lagi
        </button>
      </body>
    </html>
  );
}
