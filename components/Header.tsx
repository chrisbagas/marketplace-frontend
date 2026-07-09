"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cartCount } from "@/lib/cart";

const NAV = [
  { href: "/products", label: "Jelajah" },
  { href: "/designer", label: "Studio Kreator" },
  { href: "/admin", label: "Admin" },
];

export default function Header() {
  const pathname = usePathname();
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
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                pathname.startsWith(n.href)
                  ? "bg-jade-700 text-white"
                  : "text-ink/70 hover:bg-ink/5 hover:text-ink"
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
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
