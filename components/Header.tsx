"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cartCount } from "@/lib/cart";
import { canAccess, logout, ROLE_LABEL, useSession } from "@/lib/auth";
import type { SessionUser } from "@/lib/types";

// Menu tampil sesuai peran: tamu melihat ajakan jadi kreator,
// kreator/admin melihat dashboard-nya.
const navFor = (user: SessionUser | null) =>
  [
    { href: "/products", label: "Jelajah" },
    { href: "/studio", label: "Custom" },
    !user && { href: "/signup?peran=kreator", label: "Jadi Kreator", match: "/signup" },
    canAccess(user, "/designer") && { href: "/designer", label: "Studio Kreator" },
    canAccess(user, "/admin") && { href: "/admin", label: "Admin" },
  ].filter(Boolean) as { href: string; label: string; match?: string }[];

export default function Header() {
  const pathname = usePathname();
  const { user, loading } = useSession();
  const [count, setCount] = useState(0);

  useEffect(() => {
    const update = () => setCount(cartCount());
    update();
    window.addEventListener("cart:change", update);
    return () => window.removeEventListener("cart:change", update);
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-ink/8 bg-cream/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
        <Link href="/" className="flex items-center gap-2.5" data-track="logo">
          <svg viewBox="0 0 32 32" className="h-8 w-8">
            <rect width="32" height="32" rx="9" fill="#0b6244" />
            <path d="M9 23 V9 h3.4 v5.6 L17.6 9 h4.4 l-6 6.6 6.4 7.4 h-4.5 l-5.5 -6.6 V23 Z" fill="#f5a524" />
          </svg>
          <span className="text-lg font-extrabold tracking-tight">
            Karya<span className="text-jade-700">Kita</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          {navFor(user).map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                pathname.startsWith(n.match ?? n.href)
                  ? "bg-jade-700 text-white"
                  : "text-ink/70 hover:bg-ink/5 hover:text-ink"
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {loading ? (
            <span className="h-10 w-10 animate-pulse rounded-full bg-ink/5" />
          ) : user ? (
            <AccountMenu user={user} active={pathname.startsWith("/profile")} />
          ) : (
            <Link
              href={`/login${pathname === "/" || pathname.startsWith("/login") || pathname.startsWith("/signup") ? "" : `?next=${encodeURIComponent(pathname)}`}`}
              className="btn-primary btn-sm"
              data-track="header-masuk"
            >
              Masuk
            </Link>
          )}
          <Link
            href="/cart"
            className="relative rounded-full border border-ink/12 bg-white p-2.5 transition hover:border-ink/30"
            aria-label="Keranjang"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            {count > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-coral-500 px-1 text-[11px] font-bold text-white">
                {count}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}

function AccountMenu({ user, active }: { user: SessionUser; active: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  async function signOut() {
    setOpen(false);
    await logout();
    router.push("/");
    router.refresh();
  }

  const initial = (user.name || user.username).trim().charAt(0).toUpperCase();
  const links = [
    { href: "/pesanan", label: "Pesanan saya" },
    { href: "/profile", label: "Profil & desain saya" },
    canAccess(user, "/designer") && { href: "/designer", label: "Studio Kreator" },
    canAccess(user, "/admin") && { href: "/admin", label: "Dashboard admin" },
  ].filter(Boolean) as { href: string; label: string }[];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 transition ${active || open ? "border-jade-700 bg-jade-50" : "border-ink/12 bg-white hover:border-ink/30"}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Menu akun"
      >
        {user.designer?.avatarUri ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.designer.avatarUri} alt="" className="h-8 w-8 rounded-full" />
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-jade-700 text-sm font-bold text-white">{initial}</span>
        )}
        <span className="hidden max-w-28 truncate text-sm font-semibold sm:block">{user.name.split(" ")[0] || user.username}</span>
      </button>

      {open && (
        <div role="menu" className="absolute right-0 mt-2 w-60 overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-lg">
          <div className="border-b border-ink/8 px-4 py-3">
            <p className="truncate text-sm font-bold">{user.name}</p>
            <p className="truncate text-xs text-ink/55">@{user.username} · {ROLE_LABEL[user.role]}</p>
          </div>
          {links.map((l) => (
            <Link key={l.href} href={l.href} role="menuitem" onClick={() => setOpen(false)} className="block px-4 py-2.5 text-sm hover:bg-ink/5">
              {l.label}
            </Link>
          ))}
          <button type="button" role="menuitem" onClick={signOut} className="block w-full border-t border-ink/8 px-4 py-2.5 text-left text-sm font-semibold text-coral-600 hover:bg-coral-50" data-track="logout">
            Keluar
          </button>
        </div>
      )}
    </div>
  );
}
