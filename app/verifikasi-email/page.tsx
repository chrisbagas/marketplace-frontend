"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AuthShell from "@/components/AuthShell";
import { resendVerification, useSession, verifyEmail } from "@/lib/auth";

// Tujuan link di email verifikasi: /verifikasi-email?token=...
// Token langsung dikirim ke backend saat halaman dibuka.

type Status = "memproses" | "berhasil" | "sudah" | "gagal";

function Verify() {
  const token = useSearchParams().get("token") ?? "";
  const { user } = useSession();
  const [status, setStatus] = useState<Status>(token ? "memproses" : "gagal");
  const [error, setError] = useState(token ? "" : "Link verifikasi tidak lengkap.");
  const [resent, setResent] = useState("");
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true; // cegah dua kali kirim (React StrictMode di dev)
    verifyEmail(token)
      .then((r) => setStatus(r.alreadyVerified ? "sudah" : "berhasil"))
      .catch((e: Error) => {
        setStatus("gagal");
        setError(e.message);
      });
  }, [token]);

  async function resend() {
    try {
      await resendVerification();
      setResent(`Link baru sudah dikirim ke ${user?.email}.`);
    } catch (e) {
      setResent((e as Error).message);
    }
  }

  const done = status === "berhasil" || status === "sudah";
  return (
    <AuthShell
      title={status === "memproses" ? "Memverifikasi email…" : done ? "Email terverifikasi ✓" : "Verifikasi gagal"}
      subtitle={
        status === "memproses"
          ? "Sebentar ya."
          : done
            ? status === "sudah"
              ? "Email ini sudah terverifikasi sebelumnya."
              : "Terima kasih! Akunmu kini aktif sepenuhnya."
            : error
      }
      footer={<Link href="/" className="font-semibold text-jade-700 hover:underline">Kembali ke beranda</Link>}
    >
      {done && (
        <Link href={user?.role === "designer" ? "/designer" : "/products"} className="btn-primary w-full">
          {user?.role === "designer" ? "Buka Studio Kreator" : "Mulai belanja"}
        </Link>
      )}
      {status === "gagal" &&
        (user ? (
          <div className="space-y-3">
            <button type="button" onClick={resend} className="btn-primary w-full">
              Kirim ulang link verifikasi
            </button>
            {resent && <p className="text-sm text-ink/70">{resent}</p>}
          </div>
        ) : (
          <Link href="/login?next=%2Fverifikasi-email" className="btn-primary w-full">
            Masuk untuk minta link baru
          </Link>
        ))}
    </AuthShell>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <Verify />
    </Suspense>
  );
}
