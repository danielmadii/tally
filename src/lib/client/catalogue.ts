"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { replaceCatalogue } from "@/lib/client/db";
import type { CatalogueItem } from "@/lib/types";

/**
 * Syncs the catalogue into IndexedDB in the background. Screens read from
 * Dexie, so a stale cache still works while this refreshes.
 */
export function useCatalogueSync() {
  const query = useQuery({
    queryKey: ["catalogue"],
    queryFn: async () => {
      const res = await fetch("/api/catalogue/sync");
      if (!res.ok) throw new Error("Catalogue sync failed");
      return (await res.json()) as { items: CatalogueItem[]; syncedAt: string };
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (query.data) {
      replaceCatalogue(query.data.items, query.data.syncedAt).catch(console.error);
    }
  }, [query.data]);

  return query;
}

export function itemLabel(item: CatalogueItem) {
  return [item.productName, item.shadeName && `${item.shadeName}${item.shadeCode ? ` ${item.shadeCode}` : ""}`, item.sizeLabel]
    .filter(Boolean)
    .join(" — ");
}
