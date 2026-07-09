// Seed design artwork, generated as inline SVG data-URIs so the prototype
// works fully offline with no image hosting.

export type Design = {
  id: string;
  title: string;
  designerId: string;
  uri: string;
  tags: string[];
};

const uri = (svg: string) => `data:image/svg+xml,${encodeURIComponent(svg)}`;

const FONT = `font-family='Segoe UI, Arial, sans-serif'`;

const anakSenja = uri(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 480 480'>
<defs><clipPath id='c'><circle cx='240' cy='190' r='140'/></clipPath></defs>
<g clip-path='url(#c)'>
<rect x='100' y='50' width='280' height='44' fill='#ffc24b'/>
<rect x='100' y='102' width='280' height='40' fill='#ff9e43'/>
<rect x='100' y='150' width='280' height='36' fill='#ff7a50'/>
<rect x='100' y='194' width='280' height='32' fill='#f55b6c'/>
<rect x='100' y='234' width='280' height='28' fill='#d94a76'/>
<rect x='100' y='270' width='280' height='60' fill='#8e3b74'/>
</g>
<path d='M120 330 L200 250 L250 300 L310 240 L360 330 Z' fill='#3b2350'/>
<text x='240' y='398' text-anchor='middle' ${FONT} font-size='46' font-weight='800' letter-spacing='8' fill='#3b2350'>ANAK SENJA</text>
<text x='240' y='428' text-anchor='middle' ${FONT} font-size='16' letter-spacing='6' fill='#d94a76'>NUSANTARA GOLDEN HOUR</text>
</svg>`);

const kopiDulu = uri(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 480 480'>
<g stroke='#4a2f23' stroke-width='10' fill='none' stroke-linecap='round'>
<path d='M170 70 q-14 26 0 48 q14 22 0 44'/>
<path d='M240 56 q-14 26 0 48 q14 22 0 44'/>
<path d='M310 70 q-14 26 0 48 q14 22 0 44'/>
</g>
<path d='M140 180 h200 v70 a100 100 0 0 1 -200 0 Z' fill='#4a2f23'/>
<path d='M340 195 h24 a30 30 0 0 1 0 60 h-30' fill='none' stroke='#4a2f23' stroke-width='12'/>
<rect x='120' y='300' width='240' height='14' rx='7' fill='#4a2f23'/>
<text x='240' y='370' text-anchor='middle' ${FONT} font-size='44' font-weight='800' fill='#4a2f23'>KOPI DULU,</text>
<text x='240' y='420' text-anchor='middle' ${FONT} font-size='34' font-weight='700' letter-spacing='2' fill='#b0673e'>KERJA KEMUDIAN</text>
</svg>`);

const kawung = uri(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 480 480'>
<defs><pattern id='kw' width='96' height='96' patternUnits='userSpaceOnUse'>
<g fill='#2b3a67'>
<ellipse cx='48' cy='14' rx='16' ry='26'/>
<ellipse cx='48' cy='82' rx='16' ry='26'/>
<ellipse cx='14' cy='48' rx='26' ry='16'/>
<ellipse cx='82' cy='48' rx='26' ry='16'/>
</g>
<circle cx='48' cy='48' r='7' fill='#d9a441'/>
<circle cx='0' cy='0' r='5' fill='#d9a441'/><circle cx='96' cy='0' r='5' fill='#d9a441'/>
<circle cx='0' cy='96' r='5' fill='#d9a441'/><circle cx='96' cy='96' r='5' fill='#d9a441'/>
</pattern>
<clipPath id='r'><rect x='48' y='28' width='384' height='384' rx='28'/></clipPath></defs>
<g clip-path='url(#r)'><rect x='48' y='28' width='384' height='384' fill='url(#kw)'/></g>
<rect x='48' y='28' width='384' height='384' rx='28' fill='none' stroke='#2b3a67' stroke-width='8'/>
<text x='240' y='456' text-anchor='middle' ${FONT} font-size='26' font-weight='700' letter-spacing='10' fill='#2b3a67'>KAWUNG MODERN</text>
</svg>`);

const komodo = uri(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 480 480'>
<circle cx='240' cy='220' r='168' fill='none' stroke='#264d3b' stroke-width='12'/>
<circle cx='240' cy='220' r='140' fill='#f0e7d2'/>
<circle cx='285' cy='160' r='34' fill='#e8a13c'/>
<path d='M110 290 L180 190 L225 250 L275 175 L370 290 Z' fill='#264d3b'/>
<path d='M110 290 h260 v18 h-260 Z' fill='#6f8f7f'/>
<rect x='96' y='330' width='288' height='54' rx='10' fill='#264d3b'/>
<text x='240' y='366' text-anchor='middle' ${FONT} font-size='30' font-weight='800' letter-spacing='3' fill='#f0e7d2'>KOMODO TRAIL</text>
<text x='240' y='426' text-anchor='middle' ${FONT} font-size='20' letter-spacing='8' fill='#264d3b'>FLORES &#8226; NTT &#8226; 1991</text>
</svg>`);

const ombak = uri(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 480 480'>
<defs><clipPath id='o'><rect x='60' y='60' width='360' height='300' rx='24'/></clipPath></defs>
<g clip-path='url(#o)'>
<rect x='60' y='60' width='360' height='300' fill='#eaf4fb'/>
<circle cx='330' cy='140' r='44' fill='#f5a524'/>
<path d='M40 250 q60 -60 120 0 t120 0 t120 0 t120 0 v140 h-480 Z' fill='#67b3e3'/>
<path d='M20 285 q60 -55 120 0 t120 0 t120 0 t120 0 v110 h-500 Z' fill='#1d7fcb'/>
<path d='M0 320 q60 -50 120 0 t120 0 t120 0 t120 0 v80 h-520 Z' fill='#0e5fa8'/>
</g>
<rect x='60' y='60' width='360' height='300' rx='24' fill='none' stroke='#0e5fa8' stroke-width='8'/>
<text x='240' y='420' text-anchor='middle' ${FONT} font-size='38' font-weight='800' letter-spacing='6' fill='#0e5fa8'>OMBAK NUSANTARA</text>
</svg>`);

const jagaLaut = uri(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 480 480'>
<g>
<ellipse cx='240' cy='210' rx='120' ry='104' fill='#0f766e'/>
<g fill='#14b8a6'>
<polygon points='240,130 300,165 300,235 240,270 180,235 180,165'/>
</g>
<g fill='#0f766e'>
<polygon points='240,150 282,175 282,225 240,250 198,225 198,175' opacity='0.5'/>
</g>
<circle cx='240' cy='84' r='34' fill='#0f766e'/>
<circle cx='228' cy='78' r='5' fill='#ecfdf5'/><circle cx='252' cy='78' r='5' fill='#ecfdf5'/>
<ellipse cx='118' cy='170' rx='40' ry='18' fill='#0f766e' transform='rotate(-30 118 170)'/>
<ellipse cx='362' cy='170' rx='40' ry='18' fill='#0f766e' transform='rotate(30 362 170)'/>
<ellipse cx='130' cy='290' rx='34' ry='16' fill='#0f766e' transform='rotate(30 130 290)'/>
<ellipse cx='350' cy='290' rx='34' ry='16' fill='#0f766e' transform='rotate(-30 350 290)'/>
</g>
<text x='240' y='396' text-anchor='middle' ${FONT} font-size='42' font-weight='800' letter-spacing='4' fill='#0f766e'>JAGA LAUT</text>
<text x='240' y='430' text-anchor='middle' ${FONT} font-size='18' letter-spacing='6' fill='#14b8a6'>SATU SAMPAH PUN BERARTI</text>
</svg>`);

const rendang = uri(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 480 480'>
<text x='240' y='150' text-anchor='middle' ${FONT} font-size='72' font-weight='900' letter-spacing='2' fill='#b33a2b'>RENDANG</text>
<text x='240' y='210' text-anchor='middle' ${FONT} font-size='30' font-weight='600' letter-spacing='10' fill='#1c1814'>IS MY</text>
<text x='240' y='280' text-anchor='middle' ${FONT} font-size='48' font-weight='800' fill='#e08e0b'>LOVE LANGUAGE</text>
<g transform='translate(240 360)'>
<path d='M-14 -30 q-40 10 -34 58 q4 30 34 30 q30 0 34 -30 q6 -48 -34 -58' fill='#c62828'/>
<path d='M-14 -30 q6 -18 24 -20 q-2 14 -10 22 Z' fill='#2e7d32'/>
</g>
<text x='240' y='452' text-anchor='middle' ${FONT} font-size='16' letter-spacing='6' fill='#b33a2b'>MASAKAN PALING ENAK SEDUNIA</text>
</svg>`);

const tropis = uri(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 480 480'>
<g fill='#1f8f63'>
<path d='M150 320 C90 250 100 130 200 90 C185 140 190 170 210 200 C160 205 150 260 150 320 Z'/>
<path d='M240 340 C200 220 240 100 340 80 C310 130 315 175 345 210 C280 210 255 270 240 340 Z' opacity='0.85'/>
<path d='M320 330 C330 250 380 200 430 200 C410 240 415 270 435 300 C390 300 350 315 320 330 Z' opacity='0.7'/>
</g>
<circle cx='140' cy='120' r='36' fill='#f5a524'/>
<text x='240' y='420' text-anchor='middle' ${FONT} font-size='44' font-weight='800' letter-spacing='12' fill='#1f8f63'>TROPIS</text>
<text x='240' y='452' text-anchor='middle' ${FONT} font-size='16' letter-spacing='5' fill='#e08e0b'>SELALU MUSIM PANAS</text>
</svg>`);

export const DESIGNS: Design[] = [
  { id: "anak-senja", title: "Anak Senja", designerId: "d-raka", uri: anakSenja, tags: ["retro", "senja", "typography"] },
  { id: "kopi-dulu", title: "Kopi Dulu, Kerja Kemudian", designerId: "d-sari", uri: kopiDulu, tags: ["kopi", "quotes"] },
  { id: "kawung-modern", title: "Kawung Modern", designerId: "d-bima", uri: kawung, tags: ["batik", "pattern", "heritage"] },
  { id: "komodo-trail", title: "Komodo Trail", designerId: "d-raka", uri: komodo, tags: ["travel", "badge", "flores"] },
  { id: "ombak-nusantara", title: "Ombak Nusantara", designerId: "d-tiara", uri: ombak, tags: ["laut", "ilustrasi"] },
  { id: "jaga-laut", title: "Jaga Laut", designerId: "d-tiara", uri: jagaLaut, tags: ["laut", "kampanye", "penyu"] },
  { id: "rendang-love", title: "Rendang Is My Love Language", designerId: "d-sari", uri: rendang, tags: ["kuliner", "quotes"] },
  { id: "tropis", title: "Tropis", designerId: "d-bima", uri: tropis, tags: ["botani", "tropis"] },
];

export const designById = (id: string) => DESIGNS.find((d) => d.id === id);
