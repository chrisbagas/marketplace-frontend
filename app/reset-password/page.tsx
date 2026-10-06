"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import AuthShell, { FormError, PasswordInput } from "@/components/AuthShell";
import { resetPassword } from "@/lib/auth";

// Tujuan link di email reset: /reset-password?token=...
// Token baru dipakai saat form dikirim (bukan saat halaman dibuka), supaya
// pemindai link di email tidak menghanguskannya.

const MIN_PASSWORD = 8;

function ResetForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < MIN_PASSWORD) return setError(`Password minimal ${MIN_PASSWORD} karakter`);
    if (password !== confirm) return setError("Konfirmasi password tidak sama");
    setBusy(true);
    try {
      const u = await resetPassword(token, password);
      router.replace(u.role === "admin" ? "/admin" : u.role === "designer" ? "/designer" : "/");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <AuthShell
        title="Link tidak lengkap"
        subtitle="Buka link langsung dari email, atau minta link baru."
        footer={<Link href="/login" className="font-semibold text-jade-700 hover:underline">Kembali ke Masuk</Link>}
      >
        <Link href="/lupa-password" className="btn-primary w-full">Minta link baru</Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Buat password baru"
      subtitle="Setelah disimpan, semua perangkat lain akan dikeluarkan dari akunmu."
      footer={
        <>
          Link kedaluwarsa?{" "}
          <Link href="/lupa-password" className="font-semibold text-jade-700 hover:underline">
            Minta link baru
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="password">Password baru</label>
          <PasswordInput id="password" value={password} onChange={setPassword} autoComplete="new-password" placeholder={`Minimal ${MIN_PASSWORD} karakter`} />
        </div>
        <div>
          <label className="label" htmlFor="confirm">Ulangi password baru</label>
          <PasswordInput id="confirm" value={confirm} onChange={setConfirm} autoComplete="new-password" />
        </div>
        <FormError message={error} />
        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy ? "Menyimpan…" : "Simpan & masuk"}
        </button>
      </form>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
