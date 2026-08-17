"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import type { CatalogueItem } from "@/lib/types";
import { itemLabel } from "@/lib/client/catalogue";

interface Line {
  variantId: string;
  label: string;
  qty: number;
}

export default function StockInPanel({ shopId }: { shopId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [csv, setCsv] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["catalogue"],
    queryFn: async () => {
      const res = await fetch("/api/catalogue/sync");
      if (!res.ok) throw new Error("Catalogue load failed");
      return res.json() as Promise<{ items: CatalogueItem[] }>;
    },
    staleTime: 5 * 60 * 1000,
    enabled: open,
  });
  const items = useMemo(() => data?.items ?? [], [data]);

  const results = useMemo(() => {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return [];
    return items.filter((i) => terms.every((t) => i.haystack.includes(t))).slice(0, 8);
  }, [items, query]);

  function addLine(item: CatalogueItem) {
    setLines((prev) => {
      const i = prev.findIndex((l) => l.variantId === item.variantId);
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i], qty: next[i].qty + 1 };
        return next;
      }
      return [...prev, { variantId: item.variantId, label: itemLabel(item), qty: 1 }];
    });
    setQuery("");
  }

  function importCsv() {
    const bySku = new Map(items.map((i) => [i.sku.toLowerCase(), i]));
    const missing: string[] = [];
    const parsed: Line[] = [];
    for (const raw of csv.split(/\n+/)) {
      const [sku, qtyStr] = raw.split(/[,;\t]/).map((s) => s?.trim());
      if (!sku) continue;
      const item = bySku.get(sku.toLowerCase());
      const qty = parseInt(qtyStr ?? "", 10);
      if (!item || !Number.isFinite(qty) || qty <= 0) {
        missing.push(sku);
        continue;
      }
      parsed.push({ variantId: item.variantId, label: itemLabel(item), qty });
    }
    setLines((prev) => {
      const merged = [...prev];
      for (const p of parsed) {
        const i = merged.findIndex((l) => l.variantId === p.variantId);
        if (i >= 0) merged[i] = { ...merged[i], qty: merged[i].qty + p.qty };
        else merged.push(p);
      }
      return merged;
    });
    setCsv("");
    setMessage(
      missing.length
        ? `Imported ${parsed.length} lines. Skipped unknown/invalid: ${missing.join(", ")}`
        : `Imported ${parsed.length} lines.`
    );
  }

  async function submit() {
    if (!lines.length || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/stock/stock-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopId,
          items: lines.map((l) => ({ variantId: l.variantId, qty: l.qty })),
          note: note || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Failed to record stock");
        return;
      }
      setMessage(`Recorded ${data.lines} stock-in lines`);
      setLines([]);
      setNote("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="press mt-6 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white"
      >
        + Stock in (received goods)
      </button>
    );
  }

  return (
    <div className="mt-6 card p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Stock in</h2>
        <button onClick={() => setOpen(false)} className="text-sm text-slate-400">
          Close
        </button>
      </div>

      <div className="relative mt-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, shade or SKU…"
          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
        {results.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl bg-white shadow-lg border border-slate-200">
            {results.map((item) => (
              <li key={item.variantId}>
                <button
                  onClick={() => addLine(item)}
                  className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm active:bg-slate-50"
                >
                  <span>{itemLabel(item)}</span>
                  <span className="font-mono text-xs text-slate-400">{item.sku}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {lines.length > 0 && (
        <ul className="mt-3 divide-y divide-slate-100">
          {lines.map((l) => (
            <li key={l.variantId} className="flex items-center gap-3 py-2">
              <span className="min-w-0 flex-1 truncate text-sm">{l.label}</span>
              <input
                type="number"
                min={1}
                value={l.qty}
                onChange={(e) =>
                  setLines((prev) =>
                    prev.map((x) =>
                      x.variantId === l.variantId
                        ? { ...x, qty: Math.max(1, parseInt(e.target.value || "1", 10)) }
                        : x
                    )
                  )
                }
                className="w-20 rounded-lg border border-slate-300 px-2 py-1.5 text-right text-sm tabular-nums"
              />
              <button
                onClick={() => setLines((prev) => prev.filter((x) => x.variantId !== l.variantId))}
                aria-label="Remove line"
                className="p-1 text-slate-400"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <details className="mt-3">
        <summary className="cursor-pointer text-sm font-medium text-slate-500">
          Paste CSV instead (one line per item: SKU, quantity)
        </summary>
        <textarea
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          rows={4}
          placeholder={"VEL-LIP-01,10\nMR-MSC-BLK,6"}
          className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-xs outline-none focus:border-primary"
        />
        <button
          onClick={importCsv}
          className="mt-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium"
        >
          Add lines
        </button>
      </details>

      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note (delivery ref, supplier…)"
        className="mt-3 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-primary"
      />

      {message && (
        <p className="mt-3 rounded-lg bg-slate-100 px-4 py-2.5 text-sm text-slate-700">{message}</p>
      )}

      <button
        onClick={submit}
        disabled={!lines.length || busy}
        className="press mt-3 w-full rounded-xl bg-primary py-3.5 font-semibold text-white disabled:opacity-50"
      >
        {busy ? "Recording…" : `Record stock in (${lines.length} lines)`}
      </button>
    </div>
  );
}
