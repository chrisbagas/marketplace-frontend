import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Monitor from "@/components/Monitor";
import VerifyBanner from "@/components/VerifyBanner";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "KaryaKita — Marketplace Print-on-Demand Karya Kreator Indonesia",
  description:
    "Kaos, hoodie, mug, dan totebag dengan desain orisinal kreator lokal. Dicetak sesuai pesanan, dikirim ke seluruh Indonesia.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={jakarta.variable}>
      <body className="font-sans">
        <Monitor />
        <Header />
        <VerifyBanner />
        <main className="min-h-[70vh]">{children}</main>
        <footer className="mt-20 border-t border-ink/8 bg-white">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-3">
            <div>
              <p className="text-lg font-extrabold">
                Karya<span className="text-jade-700">Kita</span>
              </p>
              <p className="mt-2 max-w-xs text-sm text-ink/60">
                Marketplace print-on-demand untuk kreator Indonesia. Setiap pembelian mengalirkan royalti langsung ke
                desainernya.
              </p>
            </div>
            <div className="text-sm">
              <p className="mb-2 font-bold">Jelajahi</p>
              <ul className="space-y-1.5 text-ink/60">
                <li><a href="/products" className="hover:text-ink">Semua produk</a></li>
                <li><a href="/designer" className="hover:text-ink">Jadi kreator</a></li>
                <li><a href="/designer/studio" className="hover:text-ink">Studio Mockup</a></li>
                <li><a href="/admin" className="hover:text-ink">Dashboard admin (demo)</a></li>
              </ul>
            </div>
            <div className="text-sm">
              <p className="mb-2 font-bold">Pembayaran</p>
              <div className="flex flex-wrap gap-2">
                {["QRIS", "GoPay", "OVO", "DANA", "ShopeePay", "VA BCA", "VA Mandiri", "VA BNI"].map((m) => (
                  <span key={m} className="rounded-md border border-ink/10 bg-cream px-2 py-1 text-xs font-semibold text-ink/70">
                    {m}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-xs text-ink/40">Prototipe demo — pembayaran memakai gateway sandbox tiruan.</p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
