"use client";

import { useMemo, useState } from "react";
import type { VariantOption } from "../lib/queries";

export function ItemPicker({
  items,
  selectId,
  name = "variant_id",
  includeZeroStock = true,
}: {
  items: VariantOption[];
  selectId: string;
  name?: string;
  includeZeroStock?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "low" | "zero">("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();

    return items.filter((item) => {
      if (!includeZeroStock && item.stock <= 0) return false;
      if (stockFilter === "low" && !(item.stock > 0 && item.stock <= 2)) return false;
      if (stockFilter === "zero" && item.stock !== 0) return false;

      if (!q) return true;
      return (
        item.label.toLowerCase().includes(q) ||
        (item.category ?? "").toLowerCase().includes(q)
      );
    });
  }, [items, query, stockFilter, includeZeroStock]);

  return (
    <div className="itemPicker">
      <input
        className="itemSearchInput"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search item or category"
        aria-label="Search items"
      />

      <div className="itemFilters" aria-label="Stock filters">
        <button type="button" className={stockFilter === "all" ? "filterActive" : ""} onClick={() => setStockFilter("all")}>All</button>
        <button type="button" className={stockFilter === "low" ? "filterActive" : ""} onClick={() => setStockFilter("low")}>Low stock</button>
        {includeZeroStock && <button type="button" className={stockFilter === "zero" ? "filterActive" : ""} onClick={() => setStockFilter("zero")}>Out of stock</button>}
      </div>

      <select id={selectId} name={name} required>
        {filtered.length === 0 ? (
          <option value="">No matching items</option>
        ) : (
          filtered.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label} · {item.stock} left
            </option>
          ))
        )}
      </select>
    </div>
  );
}
