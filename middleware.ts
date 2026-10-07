import { NextResponse, type NextRequest } from "next/server";
import { PROTECTED } from "./lib/access";
import type { SessionUser } from "./lib/types";

// Penjaga halaman: sebelum halaman terlindungi dirender, cek sesi ke backend
// (GET /api/auth/me dengan cookie milik pengunjung).
//   - belum login        → /login?next=<halaman>
//   - peran tidak cocok  → /login?next=<halaman>&alasan=peran
// Ini lapisan UX; keamanan sebenarnya tetap di backend (setiap endpoint dicek).

const API_URL = process.env.API_URL ?? "http://localhost:8081";

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const rule = PROTECTED.find((p) => path === p.prefix || path.startsWith(p.prefix + "/"));
  if (!rule) return NextResponse.next();

  const toLogin = (reason?: string) => {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", path + req.nextUrl.search);
    if (reason) url.searchParams.set("alasan", reason);
    return NextResponse.redirect(url);
  };

  const cookie = req.cookies.get("kk_session");
  if (!cookie?.value) return toLogin();

  let user: SessionUser | null = null;
  try {
    const res = await fetch(`${API_URL}/api/auth/me`, {
      headers: { cookie: `kk_session=${cookie.value}` },
      cache: "no-store",
    });
    if (res.ok) user = (await res.json()).user;
  } catch {
    // backend mati: biarkan halaman terbuka — API-nya sendiri akan menolak
    // permintaan tanpa sesi valid, dan halaman menampilkan galatnya.
    return NextResponse.next();
  }

  if (!user) {
    const res = toLogin();
    res.cookies.delete("kk_session"); // sesi kedaluwarsa / dicabut
    return res;
  }
  if (rule.roles && !rule.roles.includes(user.role)) return toLogin("peran");
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/designer/:path*", "/profile/:path*", "/studio/:path*", "/checkout/:path*", "/pesanan/:path*"],
};
