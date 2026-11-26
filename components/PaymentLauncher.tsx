"use client";

import { useEffect, useRef, useState } from "react";
import PaymentModal from "@/components/PaymentModal";
import { getPaymentConfig, payWithSnap, type PaymentConfig } from "@/lib/payments";
import { rupiah } from "@/lib/format";
import { track } from "@/lib/track";

// Membuka pembayaran untuk satu pesanan sesuai penyedia dari server:
// Midtrans Snap (nyata), modal tiruan (dev), atau pesan "belum tersedia".
// onPaid dipanggil hanya bila SERVER mengonfirmasi lunas; onClose untuk
// semua kasus lain (ditutup, menunggu transfer, gagal) — pesanan tetap bisa
// dibayar dari halaman pesanan.

export default function PaymentLauncher({
  order,
  onClose,
  onPaid,
}: {
  order: { id: string; total: number };
  onClose: () => void;
  onPaid: () => void;
}) {
  const [cfg, setCfg] = useState<PaymentConfig | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const running = useRef(false);

  useEffect(() => {
    getPaymentConfig().then(setCfg).catch(() => setError("Tidak bisa menghubungi server pembayaran."));
  }, []);

  useEffect(() => {
    if (!cfg || cfg.provider !== "midtrans" || running.current) return;
    running.current = true;
    setError("");
    track("payment_open", { label: order.id, page: "/checkout" });
    payWithSnap(order.id, cfg)
      .then(({ result, order: fresh }) => {
        if (fresh?.payment.status === "paid") {
          track("purchase", { label: order.id, value: order.total });
          onPaid();
        } else if (result === "error") {
          setError("Pembayaran gagal diproses. Kamu bisa mencoba lagi atau memilih metode lain.");
          running.current = false;
        } else {
          onClose(); // ditutup / menunggu transfer — lanjut di halaman pesanan
        }
      })
      .catch((e: Error) => {
        setError(e.message);
        running.current = false;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg, attempt]);

  if (cfg?.provider === "mock") return <PaymentModal order={order} onClose={onClose} onPaid={onPaid} />;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-6 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl">
        {cfg?.provider === "none" ? (
          <>
            <p className="font-bold">Pembayaran belum tersedia</p>
            <p className="mt-1 text-sm text-ink/60">Pesananmu tersimpan. Hubungi kami atau coba lagi nanti dari halaman pesanan.</p>
          </>
        ) : error ? (
          <>
            <p className="font-bold text-coral-600">Pembayaran terhenti</p>
            <p className="mt-1 text-sm text-ink/60">{error}</p>
            <button className="btn-primary mt-4 w-full" onClick={() => setAttempt((a) => a + 1)}>Coba lagi</button>
          </>
        ) : (
          <>
            <span className="mx-auto block h-8 w-8 animate-spin rounded-full border-4 border-jade-200 border-t-jade-700" />
            <p className="mt-3 font-bold">Membuka pembayaran…</p>
            <p className="text-sm text-ink/60">{rupiah(order.total)} · {order.id}</p>
          </>
        )}
        <button onClick={onClose} className="mt-4 text-sm font-semibold text-ink/50 hover:text-ink">
          Tutup — bayar nanti
        </button>
      </div>
    </div>
  );
}
