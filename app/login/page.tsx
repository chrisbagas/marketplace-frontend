"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import AuthShell, { Divider, FormError, GoogleButton, PasswordInput } from "@/components/AuthShell";
import { canAccess, login, ROLE_LABEL, safeNext, useSession } from "@/lib/auth";
import { track } from "@/lib/track";
import type { SessionUser } from "@/lib/types";

const GOOGLE_ERRORS: Record<string, string> = {
  "google-batal": "Login Google dibatalkan.",
  "google-sesi-habis": "Sesi login Google kedaluwarsa. Coba lagi.",
  "google-state": "Permintaan login Google tidak valid. Coba lagi.",
  "google-email-belum-terverifikasi": "Email Google kamu belum terverifikasi.",
  "google-nonaktif": "Login Google belum diaktifkan.",
  "google-gagal": "Login Google gagal. Coba lagi atau pakai password.",
};

// Tujuan bawaan setelah login bila tidak ada ?next=
const homeFor = (u: SessionUser) => (u.role === "admin" ? "/admin" : u.role === "designer" ? "/designer" : "/");

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const rawNext = params.get("next");
  const next = safeNext(rawNext);
  const roleDenied = params.get("alasan") === "peran";
  const { user, loading } = useSession();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(GOOGLE_ERRORS[params.get("error") ?? ""] ?? "");

  // sudah login dan boleh membuka tujuan → langsung lanjut
  useEffect(() => {
    if (!loading && user && !roleDenied && canAccess(user, next)) {
      router.replace(rawNext ? next : homeFor(user));
    }
  }, [loading, user, roleDenied, next, rawNext, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const u = await login(identifier, password);
      track("click", { label: "login-berhasil" });
      if (!canAccess(u, next)) {
        setError(`Akun ${ROLE_LABEL[u.role].toLowerCase()} tidak punya akses ke halaman ${next}.`);
        setBusy(false);
        return;
      }
      router.replace(rawNext ? next : homeFor(u));
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Masuk ke KaryaKita"
      subtitle="Lanjutkan belanja, kelola toko kreatormu, atau buka dashboard."
      footer={
        <>
          Belum punya akun?{" "}
          <Link href={`/signup${rawNext ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-jade-700 hover:underline">
            Daftar gratis
          </Link>
        </>
      }
    >
      {roleDenied && user && (
        <p className="mb-4 rounded-xl bg-sun-50 px-3 py-2 text-sm text-sun-600">
          Kamu masuk sebagai <b>{user.name}</b> ({ROLE_LABEL[user.role]}), yang tidak punya akses ke <b>{next}</b>.
          Masuk dengan akun lain untuk melanjutkan.
        </p>
      )}

      <GoogleButton next={next} label="Masuk dengan Google" />
      <Divider />

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="identifier">Username atau email</label>
          <input
            id="identifier"
            className="input"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            placeholder="budi atau budi@mail.com"
            required
          />
        </div>
        <div>
          <div className="flex items-baseline justify-between">
            <label className="label" htmlFor="password">Password</label>
            <Link href="/lupa-password" className="text-xs font-semibold text-jade-700 hover:underline">
              Lupa password?
            </Link>
          </div>
          <PasswordInput id="password" value={password} onChange={setPassword} autoComplete="current-password" />
        </div>
        <FormError message={error} />
        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy ? "Memproses…" : "Masuk"}
        </button>
      </form>

      {process.env.NODE_ENV !== "production" && (
        <div className="mt-5 rounded-xl border border-dashed border-ink/15 p-3 text-xs text-ink/60">
          <p className="font-semibold text-ink/75">Akun demo (hanya di mode dev)</p>
          <p className="mt-1">
            <code>admin</code> · <code>raka</code> (kreator) · <code>demo</code> (pelanggan) — password{" "}
            <code>karyakita123</code>
          </p>
        </div>
      )}
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
