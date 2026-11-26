import Link from "next/link";
import Avatar from "./Avatar";
import Mockup from "./Mockup";
import { COLORS, designerById } from "@/lib/data";
import type { Product } from "@/lib/types";
import { rupiah, compact } from "@/lib/format";

export default function ProductCard({ listing }: { listing: Product }) {
  const colorHex = COLORS[listing.colorIds[0]].hex;
  return (
    // A link inside a link is invalid HTML: the product link is stretched over
    // the whole card (after:inset-0) and the creator link sits above it (z-20).
    <div className="card group relative overflow-hidden transition hover:-translate-y-1 hover:shadow-xl hover:shadow-ink/8">
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
        <h3 className="truncate font-semibold">
          <Link href={`/product/${listing.id}`} className="after:absolute after:inset-0 after:z-10">
            {listing.title}
          </Link>
        </h3>
        <p className="text-xs text-ink/55">
          <Link
            href={`/kreator/${listing.designerId}`}
            className="relative z-20 inline-flex items-center gap-1.5 hover:text-jade-700 hover:underline"
          >
            <Avatar
              uri={listing.designerAvatar}
              name={listing.designerName}
              hue={designerById(listing.designerId)?.hue ?? 152}
              size={16}
            />
            oleh {listing.designerName}
          </Link>
        </p>
        <div className="flex items-center justify-between pt-1">
          <span className="font-bold">{rupiah(listing.price)}</span>
          <span className="text-xs text-ink/55">★ {listing.rating} · {compact(listing.sold)} terjual</span>
        </div>
      </div>
    </div>
  );
}
