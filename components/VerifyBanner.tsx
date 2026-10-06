"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { resendVerification, useSession } from "@/lib/auth";

// Pengingat untuk akun yang emailnya belum terverifikasi. Belanja tetap
// jalan; hanya aksi kreator tertentu (ajukan desain) yang mewajibkannya.
export default function VerifyBanner() {
  const { user } = useSession();
  const pathname = usePathname();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  if (!user || user.emailVerified || pathname.startsWith("/verifikasi-email")) return null;

  async function resend() {
    setBusy(true);
    try {
      const r = await resendVerification();
      setNote(r.alreadyVerified ? "Email sudah terverifikasi — muat ulang halaman." : "Link baru terkirim. Cek kotak masuk (dan folder spam).");
    } catch (e) {
      setNote((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-b border-sun-200 bg-sun-50">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-sm text-sun-600">
        <span>
          Verifikasi email <b>{user.email}</b> lewat link yang kami kirim
          {user.role === "designer" ? " — wajib sebelum mengajukan desain." : "."}
        </span>
        {note ? (
          <span className="font-semibold">{note}</span>
        ) : (
          <button type="button" onClick={resend} disabled={busy} className="font-semibold underline underline-offset-2 hover:text-sun-500">
            {busy ? "Mengirim…" : "Kirim ulang"}
          </button>
        )}
      </div>
    </div>
  );
}
