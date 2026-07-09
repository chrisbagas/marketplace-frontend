import { DESIGNS, designById } from "./designs";

export type ProductType = "kaos" | "hoodie" | "mug" | "totebag";

export const PRODUCT_TYPES: Record<
  ProductType,
  { label: string; base: number; sizes: string[]; colorIds: string[] }
> = {
  kaos: { label: "Kaos", base: 95000, sizes: ["S", "M", "L", "XL", "XXL"], colorIds: ["putih", "hitam", "navy", "krem", "sage"] },
  hoodie: { label: "Hoodie", base: 225000, sizes: ["S", "M", "L", "XL", "XXL"], colorIds: ["hitam", "navy", "krem", "sage"] },
  mug: { label: "Mug", base: 65000, sizes: ["330 ml"], colorIds: ["putih", "krem"] },
  totebag: { label: "Totebag", base: 79000, sizes: ["38×42 cm"], colorIds: ["krem", "putih", "hitam"] },
};

export const COLORS: Record<string, { label: string; hex: string }> = {
  putih: { label: "Putih", hex: "#f4f2ec" },
  hitam: { label: "Hitam", hex: "#26241f" },
  navy: { label: "Navy", hex: "#26324e" },
  krem: { label: "Krem", hex: "#e7dcc4" },
  sage: { label: "Sage", hex: "#a3b899" },
};

export type Designer = {
  id: string;
  name: string;
  city: string;
  hue: number;
  followers: number;
  rating: number;
  bio: string;
};

export const DESIGNERS: Designer[] = [
  { id: "d-raka", name: "Raka Wijaya", city: "Yogyakarta", hue: 152, followers: 12400, rating: 4.9, bio: "Ilustrator retro yang jatuh cinta pada senja dan gunung." },
  { id: "d-sari", name: "Sari Kusuma", city: "Bandung", hue: 24, followers: 8900, rating: 4.8, bio: "Tipografi jenaka tentang kopi, kerja, dan kuliner Indonesia." },
  { id: "d-bima", name: "Bima Prasetyo", city: "Solo", hue: 226, followers: 15200, rating: 4.9, bio: "Menerjemahkan batik klasik ke bahasa desain kontemporer." },
  { id: "d-tiara", name: "Tiara Maharani", city: "Denpasar", hue: 190, followers: 6700, rating: 4.7, bio: "Ilustrasi laut & kampanye konservasi. 5% royalti untuk bersih pantai." },
];

export const designerById = (id: string) => DESIGNERS.find((d) => d.id === id);

export type Listing = {
  id: string;
  designId: string;
  type: ProductType;
  price: number;
  sold: number;
  rating: number;
  badge?: string;
};

export const LISTINGS: Listing[] = [
  { id: "kaos-anak-senja", designId: "anak-senja", type: "kaos", price: 129000, sold: 1284, rating: 4.9, badge: "Terlaris" },
  { id: "hoodie-anak-senja", designId: "anak-senja", type: "hoodie", price: 279000, sold: 431, rating: 4.8 },
  { id: "kaos-kopi-dulu", designId: "kopi-dulu", type: "kaos", price: 119000, sold: 967, rating: 4.8 },
  { id: "mug-kopi-dulu", designId: "kopi-dulu", type: "mug", price: 89000, sold: 2105, rating: 4.9, badge: "Favorit kantor" },
  { id: "kaos-kawung", designId: "kawung-modern", type: "kaos", price: 135000, sold: 758, rating: 4.9 },
  { id: "totebag-kawung", designId: "kawung-modern", type: "totebag", price: 99000, sold: 1440, rating: 4.9, badge: "Terlaris" },
  { id: "kaos-komodo", designId: "komodo-trail", type: "kaos", price: 129000, sold: 512, rating: 4.7 },
  { id: "hoodie-komodo", designId: "komodo-trail", type: "hoodie", price: 285000, sold: 198, rating: 4.8, badge: "Baru" },
  { id: "kaos-ombak", designId: "ombak-nusantara", type: "kaos", price: 125000, sold: 623, rating: 4.8 },
  { id: "totebag-jaga-laut", designId: "jaga-laut", type: "totebag", price: 95000, sold: 884, rating: 4.9 },
  { id: "kaos-jaga-laut", designId: "jaga-laut", type: "kaos", price: 119000, sold: 445, rating: 4.8 },
  { id: "kaos-rendang", designId: "rendang-love", type: "kaos", price: 119000, sold: 1032, rating: 4.9, badge: "Terlaris" },
  { id: "mug-rendang", designId: "rendang-love", type: "mug", price: 85000, sold: 690, rating: 4.8 },
  { id: "kaos-tropis", designId: "tropis", type: "kaos", price: 125000, sold: 377, rating: 4.7, badge: "Baru" },
  { id: "hoodie-tropis", designId: "tropis", type: "hoodie", price: 275000, sold: 121, rating: 4.8 },
];

export type FullListing = Listing & {
  title: string;
  designUri: string;
  designerName: string;
  designerId: string;
  typeLabel: string;
  sizes: string[];
  colorIds: string[];
  tags: string[];
};

export function fullListing(l: Listing): FullListing {
  const design = designById(l.designId)!;
  const designer = designerById(design.designerId)!;
  const pt = PRODUCT_TYPES[l.type];
  return {
    ...l,
    title: `${pt.label} ${design.title}`,
    designUri: design.uri,
    designerName: designer.name,
    designerId: designer.id,
    typeLabel: pt.label,
    sizes: pt.sizes,
    colorIds: pt.colorIds,
    tags: design.tags,
  };
}

export const ALL_LISTINGS: FullListing[] = LISTINGS.map(fullListing);
export const listingById = (id: string) => ALL_LISTINGS.find((l) => l.id === id);
export { DESIGNS };
