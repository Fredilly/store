"use client";

import { useMemo, useState } from "react";
import { formatNaira } from "../lib/money";
import type { VariantOption } from "../lib/queries";

export function InventoryBrowser({ items }: { items: VariantOption[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "low" | "zero">("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (filter === "low" && !(item.stock > 0 && item.stock <= 2)) return false;
      if (filter === "zero" && item.stock !== 0) return false;
      if (!q) return true;
      return item.label.toLowerCase().includes(q) || (item.category ?? "").toLowerCase().includes(q);
    });
  }, [items, query, filter]);

  return (
    <>
      <div className="inventoryTools">
        <input
          className="itemSearchInput"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search item or category"
          aria-label="Search inventory"
        />
        <div className="itemFilters" aria-label="Inventory filters">
          <button type="button" className={filter === "all" ? "filterActive" : ""} onClick={() => setFilter("all")}>All</button>
          <button type="button" className={filter === "low" ? "filterActive" : ""} onClick={() => setFilter("low")}>Low</button>
          <button type="button" className={filter === "zero" ? "filterActive" : ""} onClick={() => setFilter("zero")}>Out</button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="panel"><p className="muted">No matching items.</p></div>
      ) : (
        <section className="list">
          {filtered.map((item) => (
            <article className="inventoryRow" key={item.id}>
              <div>
                <strong>{item.label}</strong>
                <span>
                  Selling price · {formatNaira(item.selling_price_minor)}
                  {item.category ? " · " + item.category : ""}
                </span>
              </div>
              <div className="stockCount">
                <b className={item.stock <= 2 ? "lowStock" : ""}>{item.stock}</b>
                <span>{item.stock === 0 ? "out of stock" : item.stock <= 2 ? "low stock" : "in stock"}</span>
              </div>
            </article>
          ))}
        </section>
      )}
    </>
  );
}
