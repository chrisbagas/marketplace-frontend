import Link from "next/link";
import Mockup from "./Mockup";
import { COLORS, type FullListing } from "@/lib/data";
import { rupiah, compact } from "@/lib/format";

export default function ProductCard({ listing }: { listing: FullListing }) {
  const colorHex = COLORS[listing.colorIds[0]].hex;
  return (
    <Link
      href={`/product/${listing.id}`}
      className="card group block overflow-hidden transition hover:-translate-y-1 hover:shadow-xl hover:shadow-ink/8"
    >
      <div className="relative bg-gradient-to-b from-jade-50 to-cream p-4">
        {listing.badge && (
          <span className="chip absolute left-3 top-3 z-10 bg-sun-400 text-ink">{listing.badge}</span>
        )}
        <Mockup
          type={listing.type}
          colorHex={colorHex}
          designUri={listing.designUri}
          className="mx-auto aspect-square w-full max-w-56 transition group-hover:scale-105"
        />
      </div>
      <div className="space-y-1 p-4">
        <p className="text-xs font-semibold text-jade-700">{listing.typeLabel}</p>
        <h3 className="truncate font-semibold">{listing.title}</h3>
        <p className="text-xs text-ink/55">oleh {listing.designerName}</p>
        <div className="flex items-center justify-between pt-1">
          <span className="font-bold">{rupiah(listing.price)}</span>
          <span className="text-xs text-ink/55">★ {listing.rating} · {compact(listing.sold)} terjual</span>
        </div>
      </div>
    </Link>
  );
}
