"use client";

import { useState } from "react";
import Link from "next/link";
import AuthShell, { FormError } from "@/components/AuthShell";
import { forgotPassword } from "@/lib/auth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const { message } = await forgotPassword(email);
      setSent(message);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell
      title="Lupa password?"
      subtitle="Masukkan email akunmu. Kami kirim link untuk membuat password baru."
      footer={
        <>
          Ingat passwordnya?{" "}
          <Link href="/login" className="font-semibold text-jade-700 hover:underline">
            Masuk
          </Link>
        </>
      }
    >
      {sent ? (
        <div className="space-y-3 text-sm">
          <p className="rounded-xl bg-jade-50 px-3 py-3 text-jade-800">{sent}</p>
          <p className="text-ink/60">
            Link berlaku 30 menit. Tidak ada email? Cek folder spam, atau{" "}
            <button type="button" onClick={() => setSent("")} className="font-semibold text-jade-700 hover:underline">
              coba lagi
            </button>
            .
          </p>
          {process.env.NODE_ENV !== "production" && (
            <p className="rounded-xl border border-dashed border-ink/15 p-3 text-xs text-ink/60">
              Mode dev: email tertangkap di Mailpit —{" "}
              <a href="http://localhost:8025" target="_blank" rel="noreferrer" className="font-semibold text-jade-700 hover:underline">
                localhost:8025
              </a>
            </p>
          )}
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="budi@mail.com"
              required
            />
          </div>
          <FormError message={error} />
          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? "Mengirim…" : "Kirim link reset"}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
