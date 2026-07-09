import { avatarUri } from "@/lib/avatar";

// Foto profil kreator. `uri` dari database; kalau kosong, dibuat dari inisial.
export default function Avatar({
  uri,
  name,
  hue = 152,
  size = 20,
  className = "",
}: {
  uri?: string;
  name: string;
  hue?: number;
  size?: number;
  className?: string;
}) {
  const src = uri && uri.length > 0 ? uri : avatarUri(name, hue);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={`Foto profil ${name}`}
      width={size}
      height={size}
      className={`inline-block shrink-0 rounded-full ${className}`}
    />
  );
}
