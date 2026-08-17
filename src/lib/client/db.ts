import Dexie, { Table } from "dexie";
import type { CatalogueItem } from "@/lib/types";

/**
 * Local catalogue cache. Synced from the server in the background so search
 * and barcode lookup are instant with no network round-trip — the foundation
 * for offline mode later.
 */
class TallyDB extends Dexie {
  catalogue!: Table<CatalogueItem, string>;
  meta!: Table<{ key: string; value: string }, string>;

  constructor() {
    super("tally");
    this.version(1).stores({
      catalogue: "variantId, sku, *barcodes",
      meta: "key",
    });
  }
}

export const localDB = new TallyDB();

export async function replaceCatalogue(items: CatalogueItem[], syncedAt: string) {
  await localDB.transaction("rw", localDB.catalogue, localDB.meta, async () => {
    await localDB.catalogue.clear();
    await localDB.catalogue.bulkPut(items);
    await localDB.meta.put({ key: "catalogueSyncedAt", value: syncedAt });
  });
}

export async function findByBarcode(code: string): Promise<CatalogueItem | undefined> {
  return localDB.catalogue.where("barcodes").equals(code).first();
}

export async function searchCatalogue(query: string, limit = 30): Promise<CatalogueItem[]> {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  // "Ruby 04" must match name + shade code together: every term must appear.
  return localDB.catalogue
    .filter((item) => terms.every((t) => item.haystack.includes(t)))
    .limit(limit)
    .toArray();
}
