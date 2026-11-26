import { readFileSync } from "node:fs";
import path from "node:path";
import type { ReactNode } from "react";
import Link from "next/link";

// Legal / info pages are plain markdown files in content/legal/. They are read
// at build time by server components (no runtime filesystem access in the
// browser) and rendered by the tiny renderer below. Supported subset:
//   # / ## / ### headings (optional explicit anchor: `## Title {#anchor}`),
//   paragraphs, "- " bullet lists, "1. " numbered lists, **bold**, [text](url).
// Owner-specific facts stay in the markdown as `[ISI OLEH PEMILIK: ...]`.

export const LEGAL_PAGES = [
  { href: "/syarat-ketentuan", file: "syarat-ketentuan", label: "Syarat & Ketentuan" },
  { href: "/kebijakan-privasi", file: "kebijakan-privasi", label: "Kebijakan Privasi" },
  { href: "/kebijakan-pengembalian", file: "kebijakan-pengembalian", label: "Kebijakan Pengembalian" },
  { href: "/kontak", file: "kontak", label: "Kontak" },
  { href: "/tentang", file: "tentang", label: "Tentang Kami" },
  { href: "/faq", file: "faq", label: "FAQ" },
] as const;

export type LegalFile = (typeof LEGAL_PAGES)[number]["file"];

type Block =
  | { kind: "h"; level: 1 | 2 | 3; text: string; id: string }
  | { kind: "p"; text: string }
  | { kind: "ul" | "ol"; items: string[] };

const HEADING_RE = /^(#{1,3})\s+(.*?)(?:\s+\{#([a-z0-9-]+)\})?\s*$/;
const UL_RE = /^[-*]\s+(.*)$/;
const OL_RE = /^\d+\.\s+(.*)$/;

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

function parse(md: string): Block[] {
  const blocks: Block[] = [];
  let para: string[] = [];
  let list: { kind: "ul" | "ol"; items: string[] } | null = null;
  const flush = () => {
    if (para.length) blocks.push({ kind: "p", text: para.join(" ") });
    if (list) blocks.push(list);
    para = [];
    list = null;
  };
  for (const raw of md.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trim();
    const h = HEADING_RE.exec(line);
    const ul = UL_RE.exec(line);
    const ol = OL_RE.exec(line);
    if (!line) flush();
    else if (h) {
      flush();
      const text = h[2]!;
      blocks.push({ kind: "h", level: h[1]!.length as 1 | 2 | 3, text, id: h[3] ?? slugify(text) });
    } else if (ul || ol) {
      const kind = ul ? "ul" : "ol";
      if (para.length || (list && list.kind !== kind)) flush();
      list ??= { kind, items: [] };
      list.items.push((ul ?? ol)![1]!);
    } else {
      if (list) flush();
      para.push(line);
    }
  }
  flush();
  return blocks;
}

const INLINE_RE = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)\s]+\))/g;

function inline(text: string): ReactNode[] {
  return text.split(INLINE_RE).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={i}>{inline(part.slice(2, -2))}</strong>;
    }
    const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part);
    if (link) {
      const [, label, href] = link as unknown as [string, string, string];
      const cls = "font-semibold text-jade-700 underline-offset-2 hover:underline";
      return /^https?:\/\//.test(href) ? (
        <a key={i} href={href} className={cls} target="_blank" rel="noopener noreferrer">
          {label}
        </a>
      ) : (
        <Link key={i} href={href} className={cls}>
          {label}
        </Link>
      );
    }
    return part;
  });
}

function render(blocks: Block[]): ReactNode {
  return blocks.map((b, i) => {
    switch (b.kind) {
      case "h":
        if (b.level === 1) {
          return (
            <h1 key={i} id={b.id} className="text-3xl font-extrabold tracking-tight">
              {inline(b.text)}
            </h1>
          );
        }
        return b.level === 2 ? (
          <h2 key={i} id={b.id} className="mt-10 scroll-mt-24 text-xl font-extrabold tracking-tight">
            {inline(b.text)}
          </h2>
        ) : (
          <h3 key={i} id={b.id} className="mt-6 scroll-mt-24 text-base font-bold">
            {inline(b.text)}
          </h3>
        );
      case "p":
        return (
          <p key={i} className="mt-3 leading-relaxed text-ink/80">
            {inline(b.text)}
          </p>
        );
      case "ul":
      case "ol": {
        const Tag = b.kind;
        return (
          <Tag
            key={i}
            className={`mt-3 space-y-1.5 pl-5 leading-relaxed text-ink/80 ${b.kind === "ul" ? "list-disc" : "list-decimal"}`}
          >
            {b.items.map((it, j) => (
              <li key={j}>{inline(it)}</li>
            ))}
          </Tag>
        );
      }
    }
  });
}

export type LegalDoc = { title: string; description: string; body: ReactNode };

export function loadLegal(file: LegalFile): LegalDoc {
  const md = readFileSync(path.join(process.cwd(), "content", "legal", `${file}.md`), "utf8");
  const blocks = parse(md);
  const title = blocks.find((b) => b.kind === "h" && b.level === 1);
  const firstPara = blocks.find((b) => b.kind === "p" && !b.text.startsWith("Terakhir diperbarui"));
  const strip = (s: string) => s.replace(/\*\*|\[([^\]]+)\]\([^)]*\)/g, "$1");
  return {
    title: title && title.kind === "h" ? title.text : file,
    description: firstPara && firstPara.kind === "p" ? strip(firstPara.text).slice(0, 160) : "",
    body: render(blocks),
  };
}
