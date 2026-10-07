"use client";

import { useEffect, useMemo, useState } from "react";
import { rupiah } from "@/lib/format";
import { track } from "@/lib/track";

// Mock of an Indonesian payment gateway checkout (Midtrans Snap-style popup).
// In production this component is replaced by the real Snap JS SDK — the
// order/payment API contract in /api/orders is designed to match that flow.

type OrderLite = { id: string; total: number };

const METHODS = [
  { id: "QRIS", label: "QRIS", desc: "Scan dari aplikasi bank / e-wallet apa pun", group: "Instan" },
  { id: "GoPay", label: "GoPay", desc: "Bayar lewat aplikasi Gojek", group: "E-Wallet" },
  { id: "OVO", label: "OVO", desc: "Push notification ke aplikasi OVO", group: "E-Wallet" },
  { id: "DANA", label: "DANA", desc: "Bayar lewat aplikasi DANA", group: "E-Wallet" },
  { id: "ShopeePay", label: "ShopeePay", desc: "Bayar lewat aplikasi Shopee", group: "E-Wallet" },
  { id: "VA BCA", label: "BCA Virtual Account", desc: "Transfer dari m-BCA / KlikBCA", group: "Transfer Bank" },
  { id: "VA Mandiri", label: "Mandiri Virtual Account", desc: "Transfer dari Livin' by Mandiri", group: "Transfer Bank" },
  { id: "VA BNI", label: "BNI Virtual Account", desc: "Transfer dari BNI Mobile", group: "Transfer Bank" },
];

function hashStr(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function FakeQr({ seed }: { seed: string }) {
  const cells = useMemo(() => {
    let h = hashStr(seed);
    const rnd = () => {
      h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
      return h / 4294967296;
    };
    const n = 21;
    const grid: boolean[][] = [];
    for (let y = 0; y < n; y++) {
      grid.push([]);
      for (let x = 0; x < n; x++) grid[y].push(rnd() > 0.5);
    }
    return grid;
  }, [seed]);

  const finder = (x: number, y: number) => (
    <g key={`${x}-${y}`}>
      <rect x={x} y={y} width="7" height="7" fill="#0b0b0b" />
      <rect x={x + 1} y={y + 1} width="5" height="5" fill="#fff" />
      <rect x={x + 2} y={y + 2} width="3" height="3" fill="#0b0b0b" />
    </g>
  );

  return (
    <svg viewBox="-1 -1 23 23" className="h-44 w-44 rounded-lg border border-ink/10 bg-white p-1">
      {cells.map((row, y) =>
        row.map((on, x) => {
          const inFinder = (x < 8 && y < 8) || (x > 12 && y < 8) || (x < 8 && y > 12);
          return on && !inFinder ? <rect key={`${x}.${y}`} x={x} y={y} width="1" height="1" fill="#0b0b0b" /> : null;
        })
      )}
      {finder(0, 0)}
      {finder(14, 0)}
      {finder(0, 14)}
    </svg>
  );
}

export default function PaymentModal({
  order,
  onClose,
  onPaid,
}: {
  order: OrderLite;
  onClose: () => void;
  onPaid: () => void;
}) {
  const [step, setStep] = useState<"method" | "pay" | "done">("method");
  const [method, setMethod] = useState<(typeof METHODS)[number] | null>(null);
  const [secs, setSecs] = useState(15 * 60);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    track("payment_open", { label: order.id, page: "/checkout" });
  }, [order.id]);

  useEffect(() => {
    if (step !== "pay") return;
    const t = setInterval(() => setSecs((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [step]);

  const vaNumber = useMemo(() => "8808" + String(hashStr(order.id)).padStart(10, "0").slice(0, 10), [order.id]);

  async function confirmPaid() {
    setBusy(true);
    const res = await fetch(`/api/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "pay", method: method?.id }),
    });
    setBusy(false);
    if (res.ok) {
      track("purchase", { label: order.id, value: order.total });
      setStep("done");
    }
  }

  const groups = [...new Set(METHODS.map((m) => m.group))];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-0 backdrop-blur-sm sm:items-center sm:p-6">
      <div className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        {/* header mimics a gateway popup */}
        <div className="flex items-center justify-between bg-jade-800 px-5 py-4 text-white">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-white/60">Pembayaran aman · sandbox</p>
            <p className="font-bold">{rupiah(order.total)}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-white/60">Order ID</p>
            <p className="text-sm font-semibold">{order.id}</p>
          </div>
        </div>

        <div className="overflow-y-auto p-5">
          {step === "method" && (
            <div className="space-y-4">
              {groups.map((g) => (
                <div key={g}>
                  <p className="label">{g}</p>
                  <div className="space-y-2">
                    {METHODS.filter((m) => m.group === g).map((m) => (
                      <button
                        key={m.id}
                        onClick={() => {
                          setMethod(m);
                          setStep("pay");
                          track("payment_method", { label: m.id });
                        }}
                        className="flex w-full items-center gap-3 rounded-xl border border-ink/10 p-3 text-left transition hover:border-jade-600 hover:bg-jade-50"
                      >
                        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-jade-100 text-sm font-extrabold text-jade-800">
                          {m.label.slice(0, 2).toUpperCase()}
                        </span>
                        <span className="min-w-0">
                          <span className="block font-semibold">{m.label}</span>
                          <span className="block truncate text-xs text-ink/55">{m.desc}</span>
                        </span>
                        <span className="ml-auto text-ink/30">›</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {step === "pay" && method && (
            <div className="space-y-4 text-center">
              <p className="text-sm text-ink/60">
                Selesaikan pembayaran dalam{" "}
                <span className="font-bold text-coral-600">
                  {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, "0")}
                </span>
              </p>

              {method.id === "QRIS" ? (
                <div className="flex flex-col items-center gap-2">
                  <FakeQr seed={order.id} />
                  <p className="text-xs text-ink/55">Scan dengan BCA mobile, GoPay, OVO, DANA, atau bank lainnya</p>
                </div>
              ) : method.group === "Transfer Bank" ? (
                <div className="rounded-xl bg-cream p-4 text-left">
                  <p className="label">Nomor Virtual Account ({method.label})</p>
                  <p className="font-mono text-xl font-bold tracking-wider">{vaNumber}</p>
                  <p className="mt-2 text-xs text-ink/55">
                    Transfer tepat sebesar {rupiah(order.total)}. Pembayaran terverifikasi otomatis.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl bg-cream p-6">
                  <p className="font-semibold">Cek notifikasi di aplikasi {method.label} kamu</p>
                  <p className="mt-1 text-xs text-ink/55">Permintaan pembayaran {rupiah(order.total)} telah dikirim.</p>
                </div>
              )}

              <button onClick={confirmPaid} disabled={busy} className="btn-primary w-full" data-track="simulate-pay">
                {busy ? "Memverifikasi..." : "Simulasikan pembayaran berhasil"}
              </button>
              <button onClick={() => setStep("method")} className="text-sm font-semibold text-ink/50 hover:text-ink">
                ‹ Ganti metode pembayaran
              </button>
            </div>
          )}

          {step === "done" && (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-jade-100">
                <svg viewBox="0 0 24 24" className="h-8 w-8 text-jade-700" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </span>
              <p className="text-lg font-bold">Pembayaran berhasil 🎉</p>
              <p className="text-sm text-ink/60">
                Pesanan {order.id} masuk antrean produksi. Kamu bisa memantau statusnya di halaman pesanan.
              </p>
              <button onClick={onPaid} className="btn-primary mt-2 w-full">
                Lihat status pesanan
              </button>
            </div>
          )}
        </div>

        {step !== "done" && (
          <button onClick={onClose} className="border-t border-ink/8 py-3 text-sm font-semibold text-ink/50 hover:text-ink">
            Tutup — bayar nanti
          </button>
        )}
      </div>
    </div>
  );
}
