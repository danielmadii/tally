"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Search, Check, ShoppingBasket, Sparkles } from "lucide-react";
import Scanner from "@/components/Scanner";
import { findByBarcode, searchCatalogue, localDB } from "@/lib/client/db";
import { useCatalogueSync, itemLabel } from "@/lib/client/catalogue";
import { fmtMoney } from "@/lib/format";
import type { BasketLine, CatalogueItem } from "@/lib/types";
import { useT } from "@/lib/i18n/client";

type Mode = "scan" | "search";

interface SaleResult {
  sale_no: string;
  total: number;
}

const RECENTS_KEY = "tally-recent-variants";

export default function SellScreen({ sellerName }: { sellerName: string }) {
  const { t } = useT();
  useCatalogueSync();
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<Mode>("scan");
  const [basket, setBasket] = useState<BasketLine[]>([]);
  const [basketOpen, setBasketOpen] = useState(false);
  const [idemKey, setIdemKey] = useState(() => crypto.randomUUID());
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState<SaleResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Stock advisory — never blocks a sale, just informs.
  const { data: stockData } = useQuery({
    queryKey: ["stock"],
    queryFn: async () => {
      const res = await fetch("/api/stock");
      if (!res.ok) throw new Error("stock");
      return res.json() as Promise<{ stock: { variantId: string; qtyOnHand: number }[] }>;
    },
    staleTime: 60_000,
  });
  const stockMap = useMemo(
    () => new Map((stockData?.stock ?? []).map((s) => [s.variantId, s.qtyOnHand])),
    [stockData]
  );

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1600);
  }, []);

  const addItem = useCallback(
    (item: CatalogueItem) => {
      setBasket((prev) => {
        const i = prev.findIndex((l) => l.item.variantId === item.variantId);
        if (i >= 0) {
          const next = [...prev];
          next[i] = { ...next[i], qty: next[i].qty + 1 };
          return next;
        }
        return [...prev, { item, qty: 1, discount: 0 }];
      });
      showToast(`${t("added")} ${itemLabel(item)}`);
      try {
        const recents: string[] = JSON.parse(localStorage.getItem(RECENTS_KEY) ?? "[]");
        const next = [item.variantId, ...recents.filter((id) => id !== item.variantId)].slice(0, 12);
        localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
      } catch {}
    },
    [showToast, t]
  );

  const onScan = useCallback(
    async (code: string) => {
      const item = await findByBarcode(code);
      if (item) {
        addItem(item);
      } else {
        // Local miss → server fallback would go here; for now surface it so
        // the unknown barcode is visible rather than silently dropped.
        showToast(`${t("unknownBarcode")} ${code} — ${t("useSearch")}`);
      }
    },
    [addItem, showToast, t]
  );

  function setQty(variantId: string, qty: number) {
    setBasket((prev) =>
      qty <= 0
        ? prev.filter((l) => l.item.variantId !== variantId)
        : prev.map((l) => (l.item.variantId === variantId ? { ...l, qty } : l))
    );
  }

  const total = basket.reduce((s, l) => s + l.qty * l.item.price - l.discount, 0);
  const units = basket.reduce((s, l) => s + l.qty, 0);

  async function confirmSale() {
    if (!basket.length || confirming) return;
    setConfirming(true);
    setError(null);
    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idempotencyKey: idemKey,
          lines: basket.map((l) => ({
            variant_id: l.item.variantId,
            qty: l.qty,
            unit_price: l.item.price,
            discount: l.discount,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t("couldNotRecord"));
        return;
      }
      setDone({ sale_no: data.sale_no, total: Number(data.total) });
      setBasket([]);
      setBasketOpen(false);
      setIdemKey(crypto.randomUUID());
      queryClient.invalidateQueries({ queryKey: ["me-stats"] });
      queryClient.invalidateQueries({ queryKey: ["stock"] });
      if (navigator.vibrate) navigator.vibrate([50, 60, 50]);
    } catch {
      setError(t("saleNotRecorded"));
    } finally {
      setConfirming(false);
    }
  }

  if (done) {
    return <Confirmation result={done} sellerName={sellerName} onNext={() => setDone(null)} />;
  }

  return (
    <div className="mx-auto max-w-md px-4 pt-4">
      {/* mode switch */}
      <div className="flex rounded-xl bg-slate-200/70 p-1">
        {(["scan", "search"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold capitalize ${
              mode === m ? "bg-white shadow-sm" : "text-slate-500"
            }`}
          >
            {m === "scan" ? <Camera className="h-4 w-4" /> : <Search className="h-4 w-4" />}
            {m === "scan" ? t("scan") : t("search")}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {mode === "scan" ? (
          <Scanner onDetected={onScan} paused={basketOpen} />
        ) : (
          <SearchPanel addItem={addItem} stockMap={stockMap} />
        )}
      </div>

      {toast && (
        <div className="fixed inset-x-4 top-20 z-40 mx-auto max-w-md rounded-xl bg-slate-900/90 px-4 py-3 text-center text-sm font-medium text-white">
          {toast}
        </div>
      )}

      {/* basket bar — always within thumb reach, above the tab bar */}
      {basket.length > 0 && (
        <button
          onClick={() => setBasketOpen(true)}
          className="press fixed inset-x-4 bottom-20 z-30 mx-auto flex max-w-md items-center justify-between rounded-2xl bg-slate-900 px-5 py-4 text-white shadow-xl"
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <ShoppingBasket className="h-5 w-5" />
            {units} {units === 1 ? t("item") : t("items")}
          </span>
          <span className="text-lg font-bold">{fmtMoney(total)} · {t("basket")}</span>
        </button>
      )}

      {/* basket sheet */}
      {basketOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40" onClick={() => setBasketOpen(false)}>
          <div
            className="safe-bottom max-h-[85dvh] overflow-y-auto rounded-t-3xl bg-white p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-slate-300" />
            <h2 className="text-lg font-semibold">{t("basket")}</h2>

            <ul className="mt-3 divide-y divide-slate-100">
              {basket.map((l) => {
                const onHand = stockMap.get(l.item.variantId);
                return (
                  <li key={l.item.variantId} className="flex items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-medium leading-snug">{itemLabel(l.item)}</p>
                      <p className="text-xs text-slate-500">
                        {fmtMoney(l.item.price)}
                        {onHand !== undefined && (
                          <span className={onHand <= 3 ? "ms-2 text-amber-600" : "ms-2 text-slate-400"}>
                            · {onHand} {t("inStock")}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Stepper onClick={() => setQty(l.item.variantId, l.qty - 1)} label="−" />
                      <span className="w-8 text-center text-base font-semibold tabular-nums">{l.qty}</span>
                      <Stepper onClick={() => setQty(l.item.variantId, l.qty + 1)} label="+" />
                    </div>
                    <span className="w-16 text-end text-sm font-semibold tabular-nums">
                      {fmtMoney(l.qty * l.item.price - l.discount)}
                    </span>
                  </li>
                );
              })}
            </ul>

            <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4">
              <span className="text-sm text-slate-500">{t("total")}</span>
              <span className="text-2xl font-bold tabular-nums">{fmtMoney(total)}</span>
            </div>

            {error && (
              <p className="mt-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
            )}

            <button
              onClick={confirmSale}
              disabled={confirming || !basket.length}
              className="press mt-4 w-full rounded-2xl bg-primary py-4 text-xl font-bold text-white disabled:opacity-60"
            >
              {confirming ? t("recording") : `${t("confirm")} · ${fmtMoney(total)}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Stepper({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="press flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xl font-semibold text-slate-700"
    >
      {label}
    </button>
  );
}

function SearchPanel({
  addItem,
  stockMap,
}: {
  addItem: (item: CatalogueItem) => void;
  stockMap: Map<string, number>;
}) {
  const { t } = useT();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CatalogueItem[]>([]);
  const [recents, setRecents] = useState<CatalogueItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (query.trim()) {
        const r = await searchCatalogue(query);
        if (!cancelled) setResults(r);
      } else {
        // No query: recently-sold first (one tap covers most transactions),
        // then the full catalogue.
        try {
          const ids: string[] = JSON.parse(localStorage.getItem(RECENTS_KEY) ?? "[]");
          const items = (await localDB.catalogue.bulkGet(ids)).filter(
            (i): i is CatalogueItem => !!i
          );
          if (!cancelled) setRecents(items);
        } catch {}
        const all = await localDB.catalogue.limit(100).toArray();
        if (!cancelled) setResults(all);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [query]);

  const showRecents = !query.trim() && recents.length > 0;

  return (
    <div>
      <input
        type="search"
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("searchPlaceholder")}
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
      />

      {showRecents && (
        <>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
            {t("recentlySold")}
          </p>
          <ItemList items={recents} addItem={addItem} stockMap={stockMap} />
          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
            {t("allProducts")}
          </p>
        </>
      )}

      <ItemList items={results} addItem={addItem} stockMap={stockMap} />

      {query.trim() && results.length === 0 && (
        <p className="mt-6 text-center text-sm text-slate-400">
          {t("nothingFound")}
        </p>
      )}
    </div>
  );
}

function ItemList({
  items,
  addItem,
  stockMap,
}: {
  items: CatalogueItem[];
  addItem: (item: CatalogueItem) => void;
  stockMap: Map<string, number>;
}) {
  const { t } = useT();
  return (
    <ul className="mt-2 divide-y divide-slate-100 card">
      {items.map((item) => {
        const onHand = stockMap.get(item.variantId);
        return (
          <li key={item.variantId}>
            <button
              onClick={() => addItem(item)}
              className="flex w-full items-center gap-3 px-4 py-3 text-start active:bg-slate-50"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.imageUrl} alt="" className="h-full w-full rounded-lg object-cover" />
                ) : (
                  <Sparkles className="h-5 w-5 text-slate-400" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm font-medium leading-snug">{itemLabel(item)}</p>
                <p className="text-xs text-slate-500">
                  {item.brandName}
                  {onHand !== undefined && (
                    <span className={onHand <= 3 ? "ms-2 text-amber-600" : "ms-2 text-slate-400"}>
                      · {onHand} {t("left")}
                    </span>
                  )}
                </p>
              </div>
              <span className="text-sm font-semibold tabular-nums">{fmtMoney(item.price)}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function Confirmation({
  result,
  sellerName,
  onNext,
}: {
  result: SaleResult;
  sellerName: string;
  onNext: () => void;
}) {
  const { t } = useT();
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 pt-16 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
        <Check className="h-10 w-10 text-green-700" strokeWidth={2.5} />
      </div>
      <h2 className="mt-5 text-2xl font-bold">{fmtMoney(result.total)}</h2>
      <p className="mt-1 text-sm text-slate-500">
        {t("sale")} {result.sale_no} · {t("soldBy")} {sellerName}
      </p>
      <p className="mt-1 text-sm font-medium text-green-700">{t("itCounted")}</p>
      <button
        onClick={onNext}
        className="press mt-10 w-full rounded-2xl bg-primary py-4 text-xl font-bold text-white"
      >
        {t("nextSale")}
      </button>
    </div>
  );
}
