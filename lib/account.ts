// Pengaturan akun (halaman /akun) — backend internal/api/account.go.

async function request<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new Error("Server tidak merespons. Periksa koneksi lalu coba lagi.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Gagal (${res.status})`);
  return data as T;
}

// Sesi lain keluar; sesi ini tetap masuk.
export const changePassword = (currentPassword: string, newPassword: string) =>
  request<{ ok: true }>("POST", "/api/account/password", { currentPassword, newPassword });

// Link konfirmasi dikirim ke email baru; email akun baru berganti setelah link dibuka.
export const requestEmailChange = (newEmail: string, password: string) =>
  request<{ ok: true; sentTo: string }>("POST", "/api/account/email", { newEmail, password });

// Satu permintaan per token (aman dari efek ganda StrictMode); token sekali pakai ditangani backend.
const confirming = new Map<string, Promise<{ ok: true; email: string }>>();

export function confirmEmailChange(token: string): Promise<{ ok: true; email: string }> {
  let p = confirming.get(token);
  if (!p) {
    p = request<{ ok: true; email: string }>("POST", "/api/account/email/confirm", { token }).finally(() => {
      setTimeout(() => confirming.delete(token), 2000);
    });
    confirming.set(token, p);
  }
  return p;
}

export const getDeletionCheck = () =>
  request<{ blockers: string[]; hasPassword: boolean }>("GET", "/api/account/deletion");

// Akun tanpa password (Google): link konfirmasi dikirim ke email akun.
export const requestAccountDeletion = () =>
  request<{ ok: true; sentTo: string }>("POST", "/api/account/delete/request");

// Akun dengan password: {password}. Akun tanpa password: {token} dari link email.
export const deleteAccount = (proof: { password: string } | { token: string }) =>
  request<{ ok: true }>("POST", "/api/account/delete", proof);
