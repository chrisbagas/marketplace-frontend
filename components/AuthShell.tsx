"use client";

import { useEffect, useState } from "react";
import { getProviders, googleLoginUrl } from "@/lib/auth";

// Kerangka halaman Masuk / Daftar: kartu di tengah + tombol Google.

export default function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-12">
      <div className="card p-6 sm:p-8">
        <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-ink/60">{subtitle}</p>
        <div className="mt-6">{children}</div>
      </div>
      <p className="mt-5 text-center text-sm text-ink/60">{footer}</p>
    </div>
  );
}

// Tombol Google: aktif hanya bila backend punya kredensial OAuth
// (GOOGLE_CLIENT_ID / SECRET / REDIRECT_URL). Login lewat redirect penuh.
export function GoogleButton({ next, label }: { next: string; label: string }) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  useEffect(() => {
    getProviders().then((p) => setEnabled(p.google));
  }, []);

  const icon = (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );

  if (enabled) {
    return (
      <a href={googleLoginUrl(next)} className="btn-secondary flex w-full items-center justify-center gap-2.5" data-track="login-google">
        {icon}
        {label}
      </a>
    );
  }
  return (
    <button
      type="button"
      disabled
      className="btn-secondary flex w-full cursor-not-allowed items-center justify-center gap-2.5 opacity-50"
      title="Login Google belum dikonfigurasi di server"
    >
      {icon}
      {label}
      {enabled === false && <span className="text-xs font-medium">(segera hadir)</span>}
    </button>
  );
}

export function Divider() {
  return (
    <div className="my-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-ink/40">
      <span className="h-px flex-1 bg-ink/10" />
      atau
      <span className="h-px flex-1 bg-ink/10" />
    </div>
  );
}

export function FormError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-xl bg-coral-50 px-3 py-2 text-sm font-medium text-coral-600">
      {message}
    </p>
  );
}

export function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? "text" : "password"}
        className="input pr-20"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        required
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute inset-y-0 right-2 my-auto h-fit rounded-lg px-2 py-1 text-xs font-semibold text-ink/55 hover:bg-ink/5"
        aria-label={show ? "Sembunyikan password" : "Tampilkan password"}
      >
        {show ? "Sembunyikan" : "Tampilkan"}
      </button>
    </div>
  );
}
