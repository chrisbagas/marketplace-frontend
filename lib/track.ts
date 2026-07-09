"use client";

// Lightweight client-side behavior tracker. Events land in /api/track and are
// visible live on the admin dashboard ("Perilaku Pelanggan" tab).

function sessionId(): string {
  if (typeof window === "undefined") return "ssr";
  let id = sessionStorage.getItem("kk-session");
  if (!id) {
    id = Math.random().toString(36).slice(2, 10);
    sessionStorage.setItem("kk-session", id);
  }
  return id;
}

const device = () =>
  typeof navigator !== "undefined" && /Mobi|Android/i.test(navigator.userAgent) ? "mobile" : "desktop";

export function track(type: string, data: { page?: string; label?: string; value?: number } = {}) {
  if (typeof window === "undefined") return;
  const body = JSON.stringify({ type, session: sessionId(), device: device(), ...data });
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
    } else {
      fetch("/api/track", { method: "POST", body, keepalive: true });
    }
  } catch {
    /* monitoring must never break the shop */
  }
}
