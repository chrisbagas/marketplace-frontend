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
  if (same) same.qty += item.qty;
  else items.push(item);
  save(items);
}

export function updateQty(index: number, qty: number) {
  const items = getCart();
  if (!items[index]) return;
  if (qty <= 0) items.splice(index, 1);
  else items[index].qty = qty;
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
