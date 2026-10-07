"use client";

export type CartItem = {
  productId: string;
  title: string;
  type: string;
  color: string;
  size: string;
  qty: number;
  price: number;
  designUri?: string;
};

const KEY = "kk-cart";
export const MAX_QTY = 99; // sama dengan batas backend per baris

export function getCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

function save(items: CartItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent("cart:change"));
}

export function addToCart(item: CartItem) {
  const items = getCart();
  const same = items.find(
    (i) => i.productId === item.productId && i.color === item.color && i.size === item.size
  );
  if (same) same.qty = Math.min(MAX_QTY, same.qty + item.qty);
  else items.push(item);
  save(items);
}

// Tambah beberapa baris sekaligus (mis. satu desain, beberapa ukuran).
export function addManyToCart(lines: CartItem[]) {
  const items = getCart();
  for (const item of lines) {
    const same = items.find((i) => i.productId === item.productId && i.color === item.color && i.size === item.size);
    if (same) same.qty = Math.min(MAX_QTY, same.qty + item.qty);
    else items.push({ ...item, qty: Math.min(MAX_QTY, item.qty) });
  }
  save(items);
}

// Ganti ukuran satu baris; bila ukuran baru sudah ada untuk produk & warna yang
// sama, kedua baris digabung.
export function updateSize(index: number, size: string) {
  const items = getCart();
  const it = items[index];
  if (!it || it.size === size) return;
  const twin = items.findIndex((i, j) => j !== index && i.productId === it.productId && i.color === it.color && i.size === size);
  if (twin >= 0) {
    items[twin].qty = Math.min(MAX_QTY, items[twin].qty + it.qty);
    items.splice(index, 1);
  } else {
    it.size = size;
  }
  save(items);
}

export function updateQty(index: number, qty: number) {
  const items = getCart();
  if (!items[index]) return;
  if (qty <= 0) items.splice(index, 1);
  else items[index].qty = Math.min(MAX_QTY, qty);
  save(items);
}

export function removeItem(index: number) {
  const items = getCart();
  items.splice(index, 1);
  save(items);
}

export function clearCart() {
  save([]);
}

export const cartCount = () => getCart().reduce((a, i) => a + i.qty, 0);
export const cartSubtotal = () => getCart().reduce((a, i) => a + i.price * i.qty, 0);
