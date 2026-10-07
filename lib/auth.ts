"use client";

import { useEffect, useState } from "react";
import type { SessionUser } from "./types";

// Sesi disimpan di cookie HttpOnly `kk_session` yang dipasang backend Go;
// JS tidak bisa (dan tidak perlu) membacanya. Status login diambil dari
// GET /api/auth/me lalu di-cache di modul ini dan dibagikan ke semua komponen.

type State = { user: SessionUser | null; loading: boolean };

let state: State = { user: null, loading: true };
let inflight: Promise<void> | null = null;
const listeners = new Set<(s: State) => void>();

function set(next: State) {
  state = next;
  listeners.forEach((l) => l(state));
}

export function refreshSession(): Promise<void> {
  inflight ??= fetch("/api/auth/me", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : { user: null }))
    .then((d) => set({ user: d.user ?? null, loading: false }))
    .catch(() => set({ user: null, loading: false }))
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function useSession(): State {
  const [s, setS] = useState(state);
  useEffect(() => {
    listeners.add(setS);
    if (state.loading) refreshSession();
    else setS(state);
    return () => {
      listeners.delete(setS);
    };
  }, []);
  return s;
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15_000), // jangan biarkan UI menggantung selamanya
    });
  } catch {
    throw new Error("Server tidak merespons. Periksa koneksi lalu coba lagi.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Gagal (${res.status})`);
  return data as T;
}

export async function login(identifier: string, password: string): Promise<SessionUser> {
  const { user } = await post<{ user: SessionUser }>("/api/auth/login", { identifier, password });
  set({ user, loading: false });
  return user;
}

export type SignupInput = {
  username: string;
  email: string;
  password: string;
  name: string;
  asCreator: boolean;
  city: string;
};

export async function signup(input: SignupInput): Promise<SessionUser> {
  const { user } = await post<{ user: SessionUser }>("/api/auth/signup", input);
  set({ user, loading: false });
  return user;
}

export async function logout(): Promise<void> {
  await post("/api/auth/logout").catch(() => {});
  set({ user: null, loading: false });
}

// ---- verifikasi email & reset password ------------------------------------

// Satu permintaan per token, dibagi ke semua pemanggil: aman dari efek ganda
// (StrictMode / hot reload) tanpa bergantung pada ref komponen.
const verifying = new Map<string, Promise<{ alreadyVerified?: boolean }>>();

export function verifyEmail(token: string): Promise<{ alreadyVerified?: boolean }> {
  let p = verifying.get(token);
  if (!p) {
    p = post<{ alreadyVerified?: boolean }>("/api/auth/verify-email", { token })
      .then((res) => {
        if (state.user) refreshSession(); // banner verifikasi hilang
        return res;
      })
      .finally(() => {
        // berhasil atau gagal, izinkan percobaan ulang (token sekali pakai ditangani backend)
        setTimeout(() => verifying.delete(token), 2000);
      });
    verifying.set(token, p);
  }
  return p;
}

export const resendVerification = () => post<{ alreadyVerified?: boolean }>("/api/auth/verify-email/resend");

export const forgotPassword = (email: string) => post<{ message: string }>("/api/auth/password/forgot", { email });

// Berhasil = password baru + langsung masuk (semua sesi lain dicabut backend).
export async function resetPassword(token: string, password: string): Promise<SessionUser> {
  const { user } = await post<{ user: SessionUser }>("/api/auth/password/reset", { token, password });
  set({ user, loading: false });
  return user;
}

export async function getProviders(): Promise<{ password: boolean; google: boolean }> {
  try {
    const res = await fetch("/api/auth/providers", { cache: "no-store" });
    return await res.json();
  } catch {
    return { password: true, google: false };
  }
}

// Login Google berjalan lewat redirect penuh (bukan fetch): backend → Google → backend → `next`.
export const googleLoginUrl = (next: string) => `/api/auth/google/start?next=${encodeURIComponent(next)}`;

export { PROTECTED, canAccess, safeNext, ROLE_LABEL } from "./access";
