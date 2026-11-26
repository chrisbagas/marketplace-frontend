"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormError, PasswordInput } from "@/components/AuthShell";
import {
  changePassword,
  deleteAccount,
  getDeletionCheck,
  requestAccountDeletion,
  requestEmailChange,
} from "@/lib/account";
import { forgotPassword, logout, useSession } from "@/lib/auth";
import type { SessionUser } from "@/lib/types";

const MIN_PASSWORD = 8;

function Notice({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p role="status" className="rounded-xl bg-jade-50 px-3 py-2 text-sm font-medium text-jade-700">
      {message}
    </p>
  );
}

// Akun yang hanya punya login Google tidak punya "password saat ini" untuk dibuktikan:
// mereka membuat password lewat link ke email akun, setelah itu form di bawah terbuka.
function NoPasswordNote({ user, what }: { user: SessionUser; what: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function send() {
    setBusy(true);
    setError("");
    try {
      const r = await forgotPassword(user.email);
      setMessage(r.message);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-ink/70">
        Akun ini masuk lewat Google dan belum punya password. Buat password dulu untuk {what}; kami kirim linknya ke{" "}
        <b>{user.email}</b>.
      </p>
      <FormError message={error} />
      <Notice message={message} />
      {!message && (
        <button type="button" className="btn-secondary btn-sm" onClick={send} disabled={busy}>
          {busy ? "Mengirim…" : "Kirim link buat password"}
        </button>
      )}
    </div>
  );
}

function PasswordSection({ user }: { user: SessionUser }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setDone("");
    if (next.length < MIN_PASSWORD) return setError(`Password baru minimal ${MIN_PASSWORD} karakter`);
    if (next !== confirm) return setError("Konfirmasi password tidak sama");
    setBusy(true);
    try {
      await changePassword(current, next);
      setCurrent("");
      setNext("");
      setConfirm("");
      setDone("Password diubah. Perangkat lain sudah dikeluarkan dari akunmu.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card p-6" aria-labelledby="sec-password">
      <h2 id="sec-password" className="text-lg font-extrabold">Ganti password</h2>
      <p className="mb-4 mt-1 text-sm text-ink/55">Semua perangkat lain akan keluar dari akunmu; perangkat ini tetap masuk.</p>
      {user.hasPassword ? (
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label" htmlFor="pw-current">Password saat ini</label>
            <PasswordInput id="pw-current" value={current} onChange={setCurrent} autoComplete="current-password" />
          </div>
          <div>
            <label className="label" htmlFor="pw-new">Password baru</label>
            <PasswordInput id="pw-new" value={next} onChange={setNext} autoComplete="new-password" placeholder={`Minimal ${MIN_PASSWORD} karakter`} />
          </div>
          <div>
            <label className="label" htmlFor="pw-confirm">Ulangi password baru</label>
            <PasswordInput id="pw-confirm" value={confirm} onChange={setConfirm} autoComplete="new-password" />
          </div>
          <FormError message={error} />
          <Notice message={done} />
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? "Menyimpan…" : "Simpan password"}
          </button>
        </form>
      ) : (
        <NoPasswordNote user={user} what="mengganti password" />
      )}
    </section>
  );
}

function EmailSection({ user }: { user: SessionUser }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sentTo, setSentTo] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSentTo("");
    setBusy(true);
    try {
      const r = await requestEmailChange(email.trim(), password);
      setSentTo(r.sentTo);
      setPassword("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card p-6" aria-labelledby="sec-email">
      <h2 id="sec-email" className="text-lg font-extrabold">Ganti email</h2>
      <p className="mb-4 mt-1 text-sm text-ink/55">
        Email saat ini: <b>{user.email}</b>. Email baru baru berlaku setelah kamu mengklik link konfirmasi yang kami kirim ke sana.
      </p>
      {user.hasPassword ? (
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label" htmlFor="em-new">Email baru</label>
            <input
              id="em-new"
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="em-password">Password saat ini</label>
            <PasswordInput id="em-password" value={password} onChange={setPassword} autoComplete="current-password" />
          </div>
          <FormError message={error} />
          <Notice
            message={sentTo ? `Link konfirmasi dikirim ke ${sentTo}. Cek kotak masuk (dan folder spam); berlaku 24 jam. Email lamamu tetap berlaku sampai dikonfirmasi.` : ""}
          />
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? "Mengirim…" : "Kirim link konfirmasi"}
          </button>
        </form>
      ) : (
        <NoPasswordNote user={user} what="mengganti email" />
      )}
    </section>
  );
}

function DeleteSection({ user, token }: { user: SessionUser; token: string }) {
  const router = useRouter();
  const [blockers, setBlockers] = useState<string[] | null>(null);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [open, setOpen] = useState(Boolean(token));

  useEffect(() => {
    getDeletionCheck()
      .then((r) => setBlockers(r.blockers))
      .catch((e: Error) => setError(e.message));
  }, []);

  async function requestLink() {
    setBusy(true);
    setError("");
    try {
      const r = await requestAccountDeletion();
      setSentTo(r.sentTo);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!window.confirm("Akun akan dihapus permanen dan tidak bisa dipulihkan. Lanjutkan?")) return;
    setBusy(true);
    setError("");
    try {
      await deleteAccount(user.hasPassword ? { password } : { token });
      await logout();
      router.replace("/");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  const blocked = (blockers?.length ?? 0) > 0;

  return (
    <section className="card border-coral-200 p-6" aria-labelledby="sec-delete">
      <h2 id="sec-delete" className="text-lg font-extrabold text-coral-600">Hapus akun</h2>
      <p className="mb-3 mt-1 text-sm text-ink/70">
        Nama, email, nomor telepon, alamat, dan login akunmu dianonimkan dan tidak bisa dipulihkan. Desain pribadimu dihapus.
        Riwayat pesanan tetap disimpan tanpa identitasmu untuk pembukuan. Kamu bisa mendaftar lagi dengan email yang sama sebagai akun baru.
      </p>
      {user.role === "designer" && (
        <p className="mb-3 text-sm text-ink/70">
          Sebagai kreator: semua produkmu dinonaktifkan dan pengajuan desain yang menunggu ditolak. Saldo royalti di bawah penarikan minimum tidak bisa
          dicairkan lagi setelah akun dihapus.
        </p>
      )}

      {blocked && (
        <div role="alert" className="mb-4 rounded-xl bg-sun-50 px-4 py-3 text-sm text-sun-600">
          <p className="font-semibold">Akun belum bisa dihapus:</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {blockers!.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </div>
      )}
      <FormError message={error} />

      {!blocked && blockers && !open && (
        <button type="button" className="mt-2 rounded-full border border-coral-500 px-5 py-2.5 text-sm font-semibold text-coral-600 transition hover:bg-coral-50" onClick={() => setOpen(true)}>
          Saya ingin menghapus akun
        </button>
      )}

      {!blocked && open && user.hasPassword && (
        <form onSubmit={submit} className="mt-2 space-y-4">
          <div>
            <label className="label" htmlFor="del-password">Masukkan password untuk konfirmasi</label>
            <PasswordInput id="del-password" value={password} onChange={setPassword} autoComplete="current-password" />
          </div>
          <button type="submit" className="rounded-full bg-coral-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-coral-500 disabled:opacity-50" disabled={busy}>
            {busy ? "Menghapus…" : "Hapus akun saya permanen"}
          </button>
        </form>
      )}

      {!blocked && open && !user.hasPassword && !token && (
        <div className="mt-2 space-y-3">
          {sentTo ? (
            <Notice message={`Link konfirmasi dikirim ke ${sentTo} (berlaku 30 menit). Buka linknya untuk melanjutkan.`} />
          ) : (
            <>
              <p className="text-sm text-ink/70">
                Akun ini masuk lewat Google, jadi kami minta konfirmasi lewat link yang dikirim ke <b>{user.email}</b>.
              </p>
              <button type="button" className="btn-secondary" onClick={requestLink} disabled={busy}>
                {busy ? "Mengirim…" : "Kirim link konfirmasi"}
              </button>
            </>
          )}
        </div>
      )}

      {!blocked && open && !user.hasPassword && token && (
        <form onSubmit={submit} className="mt-2 space-y-3">
          <p className="text-sm text-ink/70">Link konfirmasi diterima. Tekan tombol di bawah untuk menghapus akunmu secara permanen.</p>
          <button type="submit" className="rounded-full bg-coral-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-coral-500 disabled:opacity-50" disabled={busy}>
            {busy ? "Menghapus…" : "Hapus akun saya permanen"}
          </button>
        </form>
      )}
    </section>
  );
}

function AccountSettings() {
  const { user, loading } = useSession();
  const token = useSearchParams().get("token") ?? "";

  if (loading || !user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="h-48 animate-pulse rounded-2xl bg-ink/5" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-3xl font-extrabold tracking-tight">Pengaturan akun</h1>
      <p className="mt-1 text-sm text-ink/55">
        Masuk sebagai <b>@{user.username}</b> · {user.email}
      </p>
      <div className="mt-6 space-y-6">
        {/* link hapus akun dari email: tampilkan paling atas supaya langsung terlihat */}
        {token && !user.hasPassword && <DeleteSection user={user} token={token} />}
        <PasswordSection user={user} />
        <EmailSection user={user} />
        {!(token && !user.hasPassword) && <DeleteSection user={user} token={token} />}
      </div>
    </div>
  );
}

export default function AccountPage() {
  return (
    <Suspense>
      <AccountSettings />
    </Suspense>
  );
}
