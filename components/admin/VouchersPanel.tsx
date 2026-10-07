"use client";

import { useCallback, useEffect, useState } from "react";
import { createVoucher, getVouchers, setVoucherActive } from "@/lib/orders";
import { fmtDate, rupiah } from "@/lib/format";
import type { Voucher } from "@/lib/types";

// Tab "Voucher" di dashboard admin: daftar voucher + pemakaian, buat baru, aktif/nonaktif.

const KIND_LABEL: Record<Voucher["kind"], string> = { percent: "Persen", fixed: "Potongan", shipping: "Gratis ongkir" };

const valueText = (v: Voucher) =>
  v.kind === "percent"
    ? `${v.value}%${v.maxDiscount ? ` (maks ${rupiah(v.maxDiscount)})` : ""}`
    : v.kind === "shipping"
      ? `ongkir s.d. ${rupiah(v.value)}`
      : rupiah(v.value);

const EMPTY = { code: "", description: "", kind: "percent" as Voucher["kind"], value: "", minSubtotal: "", maxDiscount: "", usageLimit: "", perUserLimit: "1", endsAt: "" };

export default function VouchersPanel() {
  const [list, setList] = useState<Voucher[] | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    getVouchers().then(setList).catch((e: Error) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  const n = (s: string) => (s.trim() === "" ? undefined : Number(s));

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await createVoucher({
        code: form.code,
        description: form.description,
        kind: form.kind,
        value: n(form.value),
        minSubtotal: n(form.minSubtotal) ?? 0,
        maxDiscount: form.kind === "percent" ? n(form.maxDiscount) : undefined,
        usageLimit: n(form.usageLimit),
        perUserLimit: n(form.perUserLimit) ?? 1,
        endsAt: form.endsAt ? new Date(`${form.endsAt}T23:59:59`).getTime() : undefined,
      });
      setForm(EMPTY);
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function toggle(v: Voucher) {
    try {
      await setVoucherActive(v.code, !v.active);
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const field = (k: keyof typeof EMPTY, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label className="label" htmlFor={`v-${k}`}>{label}</label>
      <input id={`v-${k}`} className="input py-2 text-sm" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} {...props} />
    </div>
  );

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-ink/8 text-xs text-ink/50">
              <th className="p-3 font-semibold">Kode</th>
              <th className="p-3 font-semibold">Nilai</th>
              <th className="p-3 font-semibold">Syarat</th>
              <th className="p-3 font-semibold">Dipakai</th>
              <th className="p-3 font-semibold" />
            </tr>
          </thead>
          <tbody>
            {list?.map((v) => (
              <tr key={v.code} className={`border-t border-ink/5 ${v.active ? "" : "opacity-50"}`}>
                <td className="p-3">
                  <p className="font-bold">{v.code}</p>
                  <p className="max-w-56 text-xs text-ink/50">{v.description}</p>
                </td>
                <td className="p-3">
                  <p className="text-xs text-ink/45">{KIND_LABEL[v.kind]}</p>
                  <p className="font-semibold">{valueText(v)}</p>
                </td>
                <td className="p-3 text-xs text-ink/60">
                  {v.minSubtotal > 0 ? `min. ${rupiah(v.minSubtotal)}` : "tanpa minimum"}
                  <span className="block">{v.perUserLimit}× per akun{v.endsAt ? ` · s.d. ${fmtDate(v.endsAt)}` : ""}</span>
                </td>
                <td className="p-3 text-xs">
                  <p className="font-semibold">{v.used}{v.usageLimit ? ` / ${v.usageLimit}` : ""} pesanan</p>
                  <p className="text-ink/50">diskon {rupiah(v.discountSum)}</p>
                </td>
                <td className="p-3 text-right">
                  <button onClick={() => toggle(v)} className="btn-secondary btn-sm">{v.active ? "Nonaktifkan" : "Aktifkan"}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {list?.length === 0 && <p className="p-8 text-center text-sm text-ink/55">Belum ada voucher.</p>}
      </div>

      <form onSubmit={create} className="card h-fit space-y-3 p-5">
        <p className="font-bold">Buat voucher</p>
        {field("code", "Kode *", { placeholder: "LEBARAN20", maxLength: 20, required: true, style: { textTransform: "uppercase" } })}
        {field("description", "Deskripsi", { placeholder: "Diskon 20% untuk semua kaos", maxLength: 200 })}
        <div>
          <label className="label" htmlFor="v-kind">Jenis</label>
          <select id="v-kind" className="input py-2 text-sm" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as Voucher["kind"] })}>
            <option value="percent">Persen dari subtotal</option>
            <option value="fixed">Potongan nominal (Rp)</option>
            <option value="shipping">Subsidi ongkir (Rp)</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {field("value", form.kind === "percent" ? "Persen *" : "Nominal Rp *", { inputMode: "numeric", required: true, placeholder: form.kind === "percent" ? "10" : "25000" })}
          {form.kind === "percent" ? field("maxDiscount", "Maks. potongan", { inputMode: "numeric", placeholder: "50000" }) : <span />}
          {field("minSubtotal", "Min. belanja", { inputMode: "numeric", placeholder: "0" })}
          {field("perUserLimit", "Per akun", { inputMode: "numeric" })}
          {field("usageLimit", "Kuota total", { inputMode: "numeric", placeholder: "tanpa batas" })}
          {field("endsAt", "Berlaku s.d.", { type: "date" })}
        </div>
        {error && <p className="rounded-lg bg-coral-50 p-2 text-xs font-semibold text-coral-600">{error}</p>}
        <button type="submit" className="btn-primary w-full" disabled={busy}>{busy ? "Menyimpan…" : "Simpan voucher"}</button>
        <p className="text-xs text-ink/45">Diskon ditanggung platform — royalti kreator tetap dihitung dari harga item.</p>
      </form>
    </div>
  );
}
