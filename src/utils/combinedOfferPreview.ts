// Build a combined-offer preview by unioning Dexie metadata from input offers

import type { AssetItem, DexieOfferSummary, NFTItem, Offer } from '../types/index.ts';

export interface CombinedPreview {
  offered: Array<NFTItem | AssetItem>;
  requested: Array<NFTItem | AssetItem>;
  royaltyBreakdown: Array<{ name: string; royaltyPercent: number; nftId: string | null }>;
}

function itemKey(item: NFTItem | AssetItem): string {
  if (item.type === 'nft') {
    return `nft:${item.nftId ?? item.name}`;
  }
  return `asset:${item.code}:${item.amount}`;
}

function dedupeItems(items: Array<NFTItem | AssetItem>): Array<NFTItem | AssetItem> {
  const seen = new Set<string>();
  const result: Array<NFTItem | AssetItem> = [];
  for (const item of items) {
    const key = itemKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
}

/**
 * Union Dexie offered/requested summaries from valid input offers into a
 * combined preview. Royalty breakdown lists each unique NFT with royalty > 0.
 */
export function buildCombinedPreview(offers: Offer[]): CombinedPreview | null {
  const validWithDexie = offers.filter(
    (o) => o.isValid && o.dexieData?.success && o.dexieData.summary,
  );

  if (validWithDexie.length === 0) {
    return null;
  }

  const offered: Array<NFTItem | AssetItem> = [];
  const requested: Array<NFTItem | AssetItem> = [];

  for (const offer of validWithDexie) {
    const summary = offer.dexieData!.summary as DexieOfferSummary;
    offered.push(...summary.offered);
    requested.push(...summary.requested);
  }

  const dedupedOffered = dedupeItems(offered);
  const dedupedRequested = dedupeItems(requested);

  const royaltyBreakdown: CombinedPreview['royaltyBreakdown'] = [];
  const seenNfts = new Set<string>();

  for (const item of [...dedupedOffered, ...dedupedRequested]) {
    if (item.type !== 'nft' || item.royaltyPercent <= 0) continue;
    const key = item.nftId ?? item.name;
    if (seenNfts.has(key)) continue;
    seenNfts.add(key);
    royaltyBreakdown.push({
      name: item.name,
      royaltyPercent: item.royaltyPercent,
      nftId: item.nftId,
    });
  }

  return {
    offered: dedupedOffered,
    requested: dedupedRequested,
    royaltyBreakdown,
  };
}
