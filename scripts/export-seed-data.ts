// One-off: dump the catalog seed data (designs incl. SVG data-URIs, product
// types, colors, designers, listings) to JSON for the Go backend seeder.
import { writeFileSync } from "node:fs";
import { DESIGNS } from "../lib/designs";
import { COLORS, DESIGNERS, LISTINGS, PRODUCT_TYPES } from "../lib/data";

const out = {
  productTypes: PRODUCT_TYPES,
  colors: COLORS,
  designers: DESIGNERS,
  designs: DESIGNS,
  listings: LISTINGS,
};
writeFileSync(process.argv[2] ?? "seed_data.json", JSON.stringify(out, null, 1));
console.log("wrote", process.argv[2], "designs:", DESIGNS.length, "listings:", LISTINGS.length);
