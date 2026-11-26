"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AuthShell from "@/components/AuthShell";
import { confirmEmailChange } from "@/lib/account";
import { refreshSession, useSession } from "@/lib/auth";

// Tujuan link di email konfirmasi ganti email: /konfirmasi-email?token=...
// Halaman ini tidak terlindungi: link bisa dibuka di browser tanpa sesi;
// token yang dikirim ke alamat baru itulah buktinya.

type Status = "memproses" | "berhasil" | "gagal";

function Confirm() {
  const token = useSearchParams().get("token") ?? "";
  const { user } = useSession();
  const [status, setStatus] = useState<Status>(token ? "memproses" : "gagal");
  const [email, setEmail] = useState("");
  const [error, setError] = useState(token ? "" : "Link konfirmasi tidak lengkap.");

  const run = useCallback(() => {
    let active = true;
    setStatus("memproses");
    confirmEmailChange(token)
      .then((r) => {
        if (!active) return;
        setEmail(r.email);
        setStatus("berhasil");
        refreshSession(); // email di header/menu ikut berganti
      })
      .catch((e: Error) => {
        if (!active) return;
        setStatus("gagal");
        setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => (token ? run() : undefined), [token, run]);

  return (
    <AuthShell
      title={status === "memproses" ? "Mengonfirmasi email…" : status === "berhasil" ? "Email diganti ✓" : "Konfirmasi gagal"}
      subtitle={
        status === "memproses"
          ? "Sebentar ya."
          : status === "berhasil"
            ? `Email akunmu kini ${email}. Gunakan alamat ini untuk masuk.`
            : error
      }
      footer={<Link href="/" className="font-semibold text-jade-700 hover:underline">Kembali ke beranda</Link>}
    >
      {status === "berhasil" && (
        <Link href={user ? "/akun" : "/login"} className="btn-primary w-full">
          {user ? "Ke pengaturan akun" : "Masuk"}
        </Link>
      )}
      {status === "gagal" && token && (
        <button type="button" onClick={run} className="btn-secondary mb-3 w-full">
          Coba lagi
        </button>
      )}
      {status === "gagal" && (
        <Link href="/akun" className="btn-primary w-full">
          Minta link baru di pengaturan akun
        </Link>
      )}
    </AuthShell>
  );
}

export default function ConfirmEmailPage() {
  return (
    <Suspense>
      <Confirm />
    </Suspense>
  );
}
