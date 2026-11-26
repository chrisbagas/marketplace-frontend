"use client";

import { useState } from "react";
import { COMPLAINT_REASONS, fileComplaint, MAX_COMPLAINT_PHOTOS } from "@/lib/orders";
import type { ComplaintReason, Order } from "@/lib/types";

// Formulir "Ajukan komplain" (pembeli, saat pesanan berstatus tiba). Foto diunggah
// lewat /api/uploads — yang disimpan hanya URL-nya, maksimal 3.
export default function ComplaintForm({ orderId, onDone }: { orderId: string; onDone: (order: Order) => void }) {
  const [reason, setReason] = useState<ComplaintReason>("cacat-cetak");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function addPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return setError("Foto harus berformat PNG, JPG, atau WebP.");
    if (file.size > 4_000_000) return setError("Foto terlalu besar — maksimal 4 MB.");
    setError("");
    setUploading(true);
    const reader = new FileReader();
    reader.onerror = () => {
      setUploading(false);
      setError("Gagal membaca foto.");
    };
    reader.onload = async () => {
      try {
        const res = await fetch("/api/uploads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: file.name, uri: String(reader.result) }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.url) throw new Error(data.error ?? "Gagal mengunggah foto");
        setPhotos((p) => [...p, data.url]);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      onDone(await fileComplaint(orderId, { reason, description: description.trim(), photos }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-3 space-y-3">
      <div>
        <label className="label" htmlFor="complaint-reason">Masalahnya apa?</label>
        <select id="complaint-reason" className="input" value={reason} onChange={(e) => setReason(e.target.value as ComplaintReason)}>
          {Object.entries(COMPLAINT_REASONS).map(([k, label]) => (
            <option key={k} value={k}>{label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="complaint-desc">Ceritakan detailnya</label>
        <textarea
          id="complaint-desc"
          className="input h-24 resize-none text-sm"
          placeholder="Mis. gambar tercetak miring dan warnanya luntur setelah dicuci sekali."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={1000}
        />
      </div>
      <div>
        <p className="label">Foto bukti (maks {MAX_COMPLAINT_PHOTOS})</p>
        <div className="flex flex-wrap items-center gap-2">
          {photos.map((url) => (
            <div key={url} className="relative h-20 w-20 overflow-hidden rounded-lg border border-ink/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="Foto komplain" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => setPhotos((p) => p.filter((u) => u !== url))}
                className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink/70 text-xs text-white"
                aria-label="Hapus foto"
              >
                ×
              </button>
            </div>
          ))}
          {photos.length < MAX_COMPLAINT_PHOTOS && (
            <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-lg border border-dashed border-ink/25 text-center text-xs font-semibold text-ink/50 hover:border-jade-600 hover:text-jade-700">
              {uploading ? "Mengunggah…" : "+ Foto"}
              <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={addPhoto} disabled={uploading} />
            </label>
          )}
        </div>
      </div>
      {error && <p className="text-sm font-semibold text-coral-600">{error}</p>}
      <button type="submit" className="btn-primary btn-sm" disabled={busy || uploading || description.trim().length < 10} data-track="kirim-komplain">
        {busy ? "Mengirim…" : "Kirim komplain"}
      </button>
    </form>
  );
}
