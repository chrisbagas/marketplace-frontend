import { useId } from "react";
import type { ProductType } from "@/lib/data";

// SVG mockup engine: renders a design (any image URI) onto
//  1. product flats + illustrated model scenes (vector, all products), and
//  2. real photos (blank-tee photography, kaos only) — "clothes only" flat-lay
//     or worn by a real person.
// Photo credit: ir0cko on Flickr, CC BY 2.0 (blank tee template series) —
// files in /public/models, attribution shown in the UI wherever photos render.
//
// Print sizing is physical: each product declares its max print area in cm
// (PRINT_CM); callers pass widthCm/offsetYCm and every view converts to its
// own px-per-cm, so "24 cm" looks proportionally identical in all views.

export type MockupView = "flat" | "model" | "photo-flat" | "photo-model";

export const PRINT_CM: Record<ProductType, { maxW: number; maxH: number }> = {
  kaos: { maxW: 30, maxH: 40 }, // area cetak DTG A3+
  hoodie: { maxW: 28, maxH: 30 }, // di atas kantong kangguru
  mug: { maxW: 9, maxH: 8.5 }, // sisi depan mug 330 ml
  totebag: { maxW: 25, maxH: 30 },
};

type Area = { x: number; y: number; w: number; h: number };

const PRINT: Record<string, Area> = {
  "kaos-flat": { x: 145, y: 160, w: 110, h: 140 },
  "hoodie-flat": { x: 150, y: 168, w: 100, h: 112 },
  "mug-flat": { x: 132, y: 160, w: 136, h: 130 },
  "totebag-flat": { x: 140, y: 200, w: 120, h: 140 },
  "kaos-model": { x: 167, y: 160, w: 66, h: 86 },
  "hoodie-model": { x: 172, y: 166, w: 56, h: 74 },
  "mug-model": { x: 152, y: 214, w: 100, h: 100 },
  "totebag-model": { x: 86, y: 274, w: 84, h: 84 },
};

export type PhotoDef = {
  src: string;
  w: number;
  h: number;
  area: Area;
  colors: string[]; // garment colorIds served by this photo
  trueColors: string[]; // subset that visually matches the photo
  label: string; // stock color name shown when it's a nearest-match
  dark?: boolean;
};

const KAOS_PHOTOS: Record<"photo-flat" | "photo-model", PhotoDef[]> = {
  "photo-flat": [
    { src: "/models/flat-putih.jpg", w: 640, h: 800, area: { x: 205, y: 240, w: 230, h: 306 }, colors: ["putih", "krem"], trueColors: ["putih"], label: "Putih" },
    { src: "/models/flat-hitam.jpg", w: 640, h: 800, area: { x: 205, y: 240, w: 230, h: 306 }, colors: ["hitam"], trueColors: ["hitam"], label: "Hitam", dark: true },
    { src: "/models/flat-navy.jpg", w: 640, h: 800, area: { x: 205, y: 240, w: 230, h: 306 }, colors: ["navy"], trueColors: ["navy"], label: "Navy", dark: true },
    { src: "/models/flat-seafoam.jpg", w: 640, h: 800, area: { x: 205, y: 240, w: 230, h: 306 }, colors: ["sage"], trueColors: [], label: "Seafoam" },
  ],
  "photo-model": [
    { src: "/models/person-cream.jpg", w: 768, h: 1024, area: { x: 253, y: 435, w: 235, h: 313 }, colors: ["krem", "putih"], trueColors: ["krem"], label: "Cream" },
    { src: "/models/person-sage.jpg", w: 768, h: 1024, area: { x: 253, y: 435, w: 235, h: 313 }, colors: ["sage"], trueColors: ["sage"], label: "Sagestone" },
    { src: "/models/person-bluejean.jpg", w: 768, h: 1024, area: { x: 253, y: 435, w: 235, h: 313 }, colors: ["navy", "hitam"], trueColors: [], label: "Blue Jean" },
  ],
};

export const PHOTO_CREDIT = "Foto: ir0cko via Flickr — CC BY 2.0";

/** Photo available for this product/view/color? Returns the chosen photo +
 *  whether it truly matches the selected garment color. */
export function photoInfo(
  type: ProductType,
  view: MockupView,
  colorId?: string
): { def: PhotoDef; exact: boolean } | null {
  if (type !== "kaos" || (view !== "photo-flat" && view !== "photo-model")) return null;
  const defs = KAOS_PHOTOS[view];
  const def = defs.find((d) => colorId && d.colors.includes(colorId)) ?? defs[0];
  return { def, exact: !!colorId && def.trueColors.includes(colorId) };
}

export function viewsFor(type: ProductType): { id: MockupView; label: string }[] {
  if (type === "kaos") {
    return [
      { id: "flat", label: "Produk" },
      { id: "photo-flat", label: "Foto asli" },
      { id: "photo-model", label: "Model (foto)" },
      { id: "model", label: "Model (ilustrasi)" },
    ];
  }
  return [
    { id: "flat", label: "Produk" },
    { id: "model", label: type === "mug" ? "Di meja" : "Dipakai model" },
  ];
}

type Props = {
  type: ProductType;
  colorHex: string;
  colorId?: string;
  designUri?: string;
  view?: MockupView;
  /** physical print width in cm (≤ PRINT_CM[type].maxW); omit = full area */
  widthCm?: number;
  /** vertical shift of the print in cm; + moves down */
  offsetYCm?: number;
  className?: string;
};

const luminance = (hex: string) => {
  const n = parseInt(hex.replace("#", ""), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
};

const shade = (hex: string, f: number) => {
  const n = parseInt(hex.replace("#", ""), 16);
  const c = (v: number) => Math.round(Math.min(255, v * f));
  return `rgb(${c((n >> 16) & 255)},${c((n >> 8) & 255)},${c(n & 255)})`;
};

function PrintImage({
  id,
  area,
  uri,
  scale = 1,
  offsetY = 0,
  blend,
}: {
  id: string;
  area: Area;
  uri?: string;
  scale?: number;
  offsetY?: number;
  blend?: "multiply" | "normal";
}) {
  if (!uri) return null;
  const cx = area.x + area.w / 2;
  const cy = area.y + area.h / 2;
  return (
    <>
      <defs>
        <clipPath id={id}>
          <rect x={area.x - 14} y={area.y - 24} width={area.w + 28} height={area.h + 48} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id})`}>
        <image
          href={uri}
          x={area.x}
          y={area.y}
          width={area.w}
          height={area.h}
          preserveAspectRatio="xMidYMid meet"
          style={blend ? { mixBlendMode: blend, opacity: 0.97 } : undefined}
          transform={`translate(0 ${offsetY}) translate(${cx} ${cy}) scale(${scale}) translate(${-cx} ${-cy})`}
        />
      </g>
    </>
  );
}

export default function Mockup({
  type,
  colorHex,
  colorId,
  designUri,
  view = "flat",
  widthCm,
  offsetYCm = 0,
  className,
}: Props) {
  const uid = useId().replace(/[:]/g, "");
  const phys = PRINT_CM[type];
  const scale = widthCm ? Math.max(0.05, widthCm / phys.maxW) : 1;

  // ---- real-photo views (kaos) -------------------------------------------
  const photo = photoInfo(type, view, colorId);
  if (photo) {
    const { def } = photo;
    const pxPerCm = def.area.w / phys.maxW;
    return (
      <svg viewBox={`0 0 ${def.w} ${def.h}`} className={className} role="img" aria-label={`Mockup foto ${type}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <image href={def.src} x="0" y="0" width={def.w} height={def.h} preserveAspectRatio="xMidYMid slice" />
        <PrintImage
          id={`clip-${uid}`}
          area={def.area}
          uri={designUri}
          scale={scale}
          offsetY={offsetYCm * pxPerCm}
          blend={def.dark ? "normal" : "multiply"}
        />
      </svg>
    );
  }

  // ---- vector views -------------------------------------------------------
  const effView: "flat" | "model" = view === "model" ? "model" : "flat";
  const dark = luminance(colorHex) < 0.45;
  const seam = dark ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.14)";
  const key = `${type}-${effView}` as keyof typeof PRINT;
  const area = PRINT[key] ?? PRINT[`${type}-flat`];
  const pxPerCm = area.w / phys.maxW;
  const print = (
    <PrintImage id={`clip-${uid}`} area={area} uri={designUri} scale={scale} offsetY={offsetYCm * pxPerCm} />
  );

  const modelBg = (
    <>
      <circle cx="200" cy="215" r="178" fill="#f0e9da" />
      <ellipse cx="200" cy="410" rx="96" ry="12" fill="rgba(0,0,0,0.08)" />
    </>
  );

  const person = (garment: React.ReactNode) => (
    <>
      {modelBg}
      {/* legs & shoes */}
      <rect x="152" y="290" width="96" height="34" rx="8" fill="#2f3a52" />
      <rect x="154" y="300" width="40" height="104" rx="10" fill="#2f3a52" />
      <rect x="206" y="300" width="40" height="104" rx="10" fill="#2f3a52" />
      <rect x="146" y="396" width="54" height="16" rx="8" fill="#dcd5c6" />
      <rect x="200" y="396" width="54" height="16" rx="8" fill="#dcd5c6" />
      {/* arms */}
      <path d="M128 216 L112 284" stroke="#c6845c" strokeWidth="22" strokeLinecap="round" />
      <path d="M272 216 L288 284" stroke="#c6845c" strokeWidth="22" strokeLinecap="round" />
      {/* neck & head */}
      <rect x="186" y="108" width="28" height="30" rx="9" fill="#c6845c" />
      <circle cx="200" cy="88" r="36" fill="#c6845c" />
      <path d="M164 86 A36 36 0 0 1 236 86 L236 80 Q222 88 210 78 Q186 92 164 80 Z" fill="#2e211b" />
      <circle cx="188" cy="93" r="3" fill="#3b2718" />
      <circle cx="212" cy="93" r="3" fill="#3b2718" />
      <path d="M192 104 Q200 111 208 104" stroke="#3b2718" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      {garment}
    </>
  );

  let scene: React.ReactNode = null;

  if (effView === "model" && (type === "kaos" || type === "hoodie")) {
    scene = person(
      <>
        {type === "hoodie" && (
          <path d="M148 128 Q200 96 252 128 L246 150 Q200 128 154 150 Z" fill={shade(colorHex, 0.8)} />
        )}
        <path
          d="M156 134 Q200 152 244 134 L266 142 L290 214 L260 228 L252 206 L252 302 L148 302 L148 206 L140 228 L110 214 L134 142 Z"
          fill={colorHex}
        />
        <path d="M182 134 Q200 147 218 134" stroke={seam} strokeWidth="6" fill="none" />
        {type === "hoodie" && (
          <>
            <path d="M190 142 v26" stroke={seam} strokeWidth="4" strokeLinecap="round" />
            <path d="M210 142 v26" stroke={seam} strokeWidth="4" strokeLinecap="round" />
            <path d="M166 258 L234 258 L240 300 L160 300 Z" fill="rgba(0,0,0,0.1)" />
          </>
        )}
        {print}
      </>
    );
  } else if (effView === "model" && type === "totebag") {
    scene = person(
      <>
        <path
          d="M156 134 Q200 152 244 134 L266 142 L290 214 L260 228 L252 206 L252 302 L148 302 L148 206 L140 228 L110 214 L134 142 Z"
          fill="#e7dcc4"
        />
        <path d="M182 134 Q200 147 218 134" stroke="rgba(0,0,0,0.14)" strokeWidth="6" fill="none" />
        <path d="M156 148 L118 264" stroke={shade(colorHex, 0.85)} strokeWidth="10" strokeLinecap="round" />
        <rect x="74" y="262" width="108" height="108" rx="8" fill={colorHex} stroke={seam} />
        {print}
      </>
    );
  } else if (effView === "model" && type === "mug") {
    scene = (
      <>
        {modelBg}
        {/* desk */}
        <rect x="36" y="332" width="328" height="18" rx="9" fill="#a97e57" />
        {/* plant */}
        <path d="M92 332 v-40 M92 300 q-26 -8 -30 -34 q26 4 30 26 M92 292 q26 -10 28 -36 q-26 6 -28 28" stroke="#1f8f63" strokeWidth="7" fill="none" strokeLinecap="round" />
        <path d="M74 332 h36 l-5 30 h-26 Z" fill="#d97843" />
        {/* books */}
        <rect x="286" y="316" width="70" height="9" rx="3" fill="#2b3a67" />
        <rect x="292" y="306" width="60" height="9" rx="3" fill="#d94a76" />
        {/* steam */}
        <path d="M178 168 q-9 -18 0 -34 M204 160 q-9 -18 0 -34 M228 168 q-9 -18 0 -34" stroke="rgba(0,0,0,0.18)" strokeWidth="5" fill="none" strokeLinecap="round" />
        {/* mug */}
        <path d="M264 226 q46 0 46 40 q0 40 -46 40" stroke={colorHex} strokeWidth="16" fill="none" />
        <rect x="140" y="196" width="124" height="136" rx="14" fill={colorHex} />
        <ellipse cx="202" cy="198" rx="62" ry="13" fill={shade(colorHex, 0.82)} />
        {print}
      </>
    );
  } else if (type === "kaos") {
    scene = (
      <>
        <ellipse cx="200" cy="400" rx="130" ry="14" fill="rgba(0,0,0,0.07)" />
        <path
          d="M154 86 Q200 122 246 86 L294 104 L354 160 L312 202 L284 178 L284 374 Q200 390 116 374 L116 178 L88 202 L46 160 L106 104 Z"
          fill={colorHex}
        />
        <path d="M150 84 Q200 128 250 84" stroke={seam} strokeWidth="10" fill="none" />
        <path d="M120 366 Q200 380 280 366" stroke={seam} strokeWidth="3" fill="none" />
        {print}
      </>
    );
  } else if (type === "hoodie") {
    scene = (
      <>
        <ellipse cx="200" cy="404" rx="134" ry="14" fill="rgba(0,0,0,0.07)" />
        <path d="M140 96 Q200 40 260 96 L268 130 Q200 98 132 130 Z" fill={shade(colorHex, 0.8)} />
        <path
          d="M150 92 Q200 130 250 92 L300 112 L356 170 L314 210 L286 186 L286 378 Q200 394 114 378 L114 186 L86 210 L44 170 L100 112 Z"
          fill={colorHex}
        />
        <path d="M152 94 Q200 142 248 94 Q200 172 152 94 Z" fill="rgba(0,0,0,0.22)" />
        <path d="M188 148 v34" stroke={seam} strokeWidth="5" strokeLinecap="round" />
        <path d="M212 148 v34" stroke={seam} strokeWidth="5" strokeLinecap="round" />
        <path d="M150 292 L250 292 L262 372 Q200 384 138 372 Z" fill="rgba(0,0,0,0.1)" />
        <path d="M120 370 Q200 386 280 370" stroke={seam} strokeWidth="3" fill="none" />
        {print}
      </>
    );
  } else if (type === "mug") {
    scene = (
      <>
        <ellipse cx="200" cy="352" rx="120" ry="14" fill="rgba(0,0,0,0.07)" />
        <path d="M288 168 q56 0 56 46 q0 46 -56 46" stroke={colorHex} strokeWidth="18" fill="none" />
        <rect x="112" y="126" width="176" height="198" rx="18" fill={colorHex} />
        <ellipse cx="200" cy="128" rx="88" ry="19" fill={shade(colorHex, 0.82)} />
        <ellipse cx="200" cy="130" rx="74" ry="14" fill={shade(colorHex, 0.68)} />
        {print}
      </>
    );
  } else {
    scene = (
      <>
        <ellipse cx="200" cy="400" rx="120" ry="13" fill="rgba(0,0,0,0.07)" />
        <path d="M146 152 Q200 58 254 152" stroke={shade(colorHex, 0.8)} strokeWidth="13" fill="none" />
        <path d="M132 152 Q200 44 268 152" stroke={colorHex} strokeWidth="13" fill="none" />
        <path d="M112 150 L288 150 L302 386 L98 386 Z" fill={colorHex} />
        <path d="M116 166 L284 166" stroke={seam} strokeWidth="3" />
        {print}
      </>
    );
  }

  return (
    <svg viewBox="0 0 400 440" className={className} role="img" aria-label={`Mockup ${type}`}>
      {scene}
    </svg>
  );
}
