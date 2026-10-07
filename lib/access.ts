import type { Role, SessionUser } from "./types";

// Aturan akses halaman — dipakai middleware.ts (Edge) dan komponen klien.
// Halaman terlindungi dan peran yang boleh membukanya. middleware.ts memakai
// tabel yang sama; backend tetap memeriksa ulang setiap endpoint.
export const PROTECTED: { prefix: string; roles?: Role[] }[] = [
  { prefix: "/admin", roles: ["admin"] },
  { prefix: "/designer", roles: ["designer", "admin"] },
  { prefix: "/profile" },
  { prefix: "/studio" },
];

export const canAccess = (user: SessionUser | null, path: string) => {
  const rule = PROTECTED.find((p) => path === p.prefix || path.startsWith(p.prefix + "/"));
  if (!rule) return true;
  if (!user) return false;
  return !rule.roles || rule.roles.includes(user.role);
};

// Hanya izinkan path internal sebagai tujuan setelah login (cegah open redirect).
export const safeNext = (next: string | null | undefined) =>
  next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/";

export const ROLE_LABEL: Record<Role, string> = { customer: "Pelanggan", designer: "Kreator", admin: "Admin" };
