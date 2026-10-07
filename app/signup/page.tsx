"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import AuthShell, { Divider, FormError, GoogleButton, PasswordInput } from "@/components/AuthShell";
import { canAccess, safeNext, signup, useSession } from "@/lib/auth";
import { track } from "@/lib/track";

// Aturan yang sama dengan backend (internal/api/auth.go) — dicek di sini
// supaya pesan muncul sebelum submit; backend tetap memvalidasi ulang.
const USERNAME_RE = /^[a-z0-9_.]{3,30}$/;
const MIN_PASSWORD = 8;

function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const rawNext = params.get("next");
  const next = safeNext(rawNext);
  const { user, loading } = useSession();

  const [form, setForm] = useState({ name: "", username: "", email: "", password: "", city: "" });
  const [asCreator, setAsCreator] = useState(params.get("peran") === "kreator");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && user) router.replace(canAccess(user, next) ? next : "/");
  }, [loading, user, next, router]);

  const usernameHint =
    form.username && !USERNAME_RE.test(form.username) ? "3–30 karakter: huruf kecil, angka, titik, atau garis bawah" : "";
  const passwordHint =
    form.password && form.password.length < MIN_PASSWORD ? `Minimal ${MIN_PASSWORD} karakter` : "";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (usernameHint || passwordHint) return setError(usernameHint ? `Username: ${usernameHint}` : `Password: ${passwordHint}`);
    setBusy(true);
    try {
      const u = await signup({ ...form, asCreator });
      track("click", { label: asCreator ? "daftar-kreator" : "daftar-pelanggan" });
      router.replace(rawNext && canAccess(u, next) ? next : u.role === "designer" ? "/designer" : "/");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: e.target.value }),
  });

  return (
    <AuthShell
      title="Buat akun KaryaKita"
      subtitle="Belanja karya kreator lokal, atau buka toko dan dapatkan royalti dari setiap penjualan."
      footer={
        <>
          Sudah punya akun?{" "}
          <Link href={`/login${rawNext ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-jade-700 hover:underline">
            Masuk
          </Link>
        </>
      }
    >
      <GoogleButton next={next} label="Daftar dengan Google" />
      <Divider />

      <form onSubmit={submit} className="space-y-4">
        <fieldset>
          <legend className="label">Saya ingin…</legend>
          <div className="grid grid-cols-2 gap-2">
            {[
              { v: false, t: "Belanja", d: "Akun pelanggan" },
              { v: true, t: "Jualan desain", d: "Akun kreator" },
            ].map((o) => (
              <label
                key={o.t}
                className={`cursor-pointer rounded-xl border p-3 transition ${asCreator === o.v ? "border-jade-700 bg-jade-50" : "border-ink/10 hover:border-ink/25"}`}
              >
                <input type="radio" name="peran" className="sr-only" checked={asCreator === o.v} onChange={() => setAsCreator(o.v)} />
                <span className="block text-sm font-bold">{o.t}</span>
                <span className="text-xs text-ink/55">{o.d}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label className="label" htmlFor="name">{asCreator ? "Nama toko / kreator" : "Nama lengkap"}</label>
          <input id="name" className="input" {...field("name")} autoComplete="name" placeholder={asCreator ? "Studio Senja" : "Budi Santoso"} maxLength={80} required />
        </div>
        {asCreator && (
          <div>
            <label className="label" htmlFor="city">Kota</label>
            <input id="city" className="input" {...field("city")} autoComplete="address-level2" placeholder="Yogyakarta" maxLength={60} />
          </div>
        )}
        <div>
          <label className="label" htmlFor="username">Username</label>
          <input
            id="username"
            className="input"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().replace(/\s/g, "") })}
            autoComplete="username"
            autoCapitalize="none"
            placeholder="budi.santoso"
            maxLength={30}
            required
          />
          {usernameHint && <p className="mt-1 text-xs text-coral-600">{usernameHint}</p>}
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" className="input" {...field("email")} autoComplete="email" placeholder="budi@mail.com" required />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <PasswordInput
            id="password"
            value={form.password}
            onChange={(v) => setForm({ ...form, password: v })}
            autoComplete="new-password"
            placeholder={`Minimal ${MIN_PASSWORD} karakter`}
          />
          {passwordHint && <p className="mt-1 text-xs text-coral-600">{passwordHint}</p>}
        </div>
        <FormError message={error} />
        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy ? "Membuat akun…" : asCreator ? "Daftar sebagai kreator" : "Daftar"}
        </button>
      </form>
    </AuthShell>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
