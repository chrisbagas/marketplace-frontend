"use client";

import type { UploadedFile } from "./types";

// Upload gambar ke object storage (S3 / Cloudflare R2). Satu-satunya jalan
// unggah di aplikasi ini:
//   1. POST /api/uploads/presign  → server memeriksa tipe/ukuran, memberi URL PUT bertanda tangan
//   2. PUT langsung dari browser ke storage (badan file tidak lewat server kita)
//   3. POST /api/uploads/complete → server memeriksa isi file sebenarnya + membaca ukuran piksel
// Hasilnya URL publik file + dimensi pikselnya.

export type UploadPurpose = "designs" | "custom" | "avatars" | "complaints";
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
export const MAX_UPLOAD_LABEL = "50 MB";
// Teks siap pakai untuk tombol/petunjuk unggah (SVG hanya diterima untuk admin, jadi tidak dijanjikan).
export const UPLOAD_HINT = `PNG/JPG/WebP, maks ${MAX_UPLOAD_LABEL}`;

const ALLOWED = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

export class UploadError extends Error {}

type Presign = { key: string; uploadUrl: string; headers: Record<string, string> };

async function postJSON<T>(path: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new UploadError("Server tidak terjangkau. Periksa koneksi internetmu lalu coba lagi.");
  }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) throw new UploadError("Sesi kamu berakhir — silakan masuk lagi.");
  if (!res.ok) throw new UploadError(data.error ?? `Gagal mengunggah (${res.status})`);
  return data as T;
}

// PUT dengan XHR karena fetch belum punya progres unggah.
function putFile(file: File, p: Presign, onProgress?: (percent: number) => void, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", p.uploadUrl);
    for (const [k, v] of Object.entries(p.headers)) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.min(99, Math.round((e.loaded / e.total) * 100)));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      reject(
        new UploadError(
          xhr.status === 403
            ? "Tautan unggah ditolak atau sudah kedaluwarsa — coba unggah ulang."
            : `Penyimpanan file menolak unggahan (${xhr.status}).`,
        ),
      );
    };
    xhr.onerror = () => reject(new UploadError("Koneksi terputus saat mengunggah. Coba lagi."));
    xhr.ontimeout = () => reject(new UploadError("Unggahan terlalu lama. Coba lagi dengan koneksi yang lebih stabil."));
    xhr.onabort = () => reject(new UploadError("Unggahan dibatalkan."));
    signal?.addEventListener("abort", () => xhr.abort(), { once: true });
    xhr.send(file);
  });
}

/** Unggah satu gambar. Melempar UploadError dengan pesan berbahasa Indonesia. */
export async function uploadImage(
  file: File,
  purpose: UploadPurpose,
  opts: { onProgress?: (percent: number) => void; signal?: AbortSignal } = {},
): Promise<UploadedFile> {
  if (!ALLOWED.includes(file.type)) {
    throw new UploadError("Jenis file harus PNG, JPG, atau WebP.");
  }
  if (file.size <= 0) throw new UploadError("File kosong.");
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new UploadError(`File terlalu besar — maksimal ${MAX_UPLOAD_LABEL}.`);
  }

  opts.onProgress?.(0);
  const presign = await postJSON<Presign>("/api/uploads/presign", { mime: file.type, size: file.size, purpose });
  await putFile(file, presign, opts.onProgress, opts.signal);
  const done = await postJSON<UploadedFile>("/api/uploads/complete", { key: presign.key });
  opts.onProgress?.(100);
  return done;
}
