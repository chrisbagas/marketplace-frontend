"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

// Last-resort boundary for render errors in the root layout. It replaces the
// layout, so it renders its own <html>. No-op reporting when Sentry is off.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
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
