// Foto profil bawaan: inisial di atas warna khas kreator.
// Cermin dari avatarURI di backend (internal/db/seed.go).
export function avatarUri(name: string, hue: number): string {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" rx="40" fill="hsl(${hue} 48% 36%)"/><text x="40" y="51" font-family="Arial,sans-serif" font-size="30" font-weight="700" fill="#fff" text-anchor="middle">${initials}</text></svg>`;
  return "data:image/svg+xml," + encodeURIComponent(svg);
}
