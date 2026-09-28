// Net out what a combined offer actually takes in and gives out.
//
// Amounts come from the offers' own coin spends (see parseOfferContents in
// services/walletSDK.ts), not from marketplace listings, so unlisted offers
// still count toward the totals.

export const MOJOS_PER_XCH = 1_000_000_000_000n;
export const MOJOS_PER_CAT = 1_000n;

/** Fungible assets are keyed by 'xch' or `cat:<assetId>`. */
export const XCH_KEY = 'xch';

export interface NftAsset {
  launcherId: string;
  royaltyBasisPoints: number;
  royaltyPuzzleHash: string;
}

export interface FungibleAmount {
  key: string;
  /** null for XCH, hex asset id for CATs */
  assetId: string | null;
  mojos: bigint;
}

export interface RoyaltyCharge {
  nft: NftAsset;
  amounts: FungibleAmount[];
}

/** A single offer's contents, derived from its coin spends. */
export interface OfferContents {
  requestedFungible: Map<string, bigint>;
  requestedNfts: Map<string, NftAsset>;
  offeredFungible: Map<string, bigint>;
  offeredNfts: Map<string, NftAsset>;
  /**
   * Royalties the taker owes for this offer's NFTs. They are fixed by the trade
   * prices each NFT spend commits to, so they stay owed even when the NFT is
   * passed straight on to another offer in a combined bundle.
   */
  royalties: RoyaltyCharge[];
  /** Maker fee in mojos. */
  fee: bigint;
}

export interface CombinedContents {
  /** Net amount the taker pays, royalties already folded in. */
  requestedFungible: FungibleAmount[];
  requestedNfts: NftAsset[];
  /** Net amount the taker receives. */
  offeredFungible: FungibleAmount[];
  offeredNfts: NftAsset[];
  /** Cancelled between offers, so it never reaches the taker. */
  intermediateFungible: FungibleAmount[];
  intermediateNfts: NftAsset[];
  /** Totals before netting, matching what a wallet displays. */
  grossRequestedFungible: FungibleAmount[];
  grossOfferedFungible: FungibleAmount[];
  royalties: RoyaltyCharge[];
  fee: bigint;
}

export function catAssetIdFromKey(key: string): string | null {
  return key.startsWith('cat:') ? key.slice(4) : null;
}

export function fungibleDecimals(key: string): number {
  return key === XCH_KEY ? 12 : 3;
}

function amountOf(key: string, mojos: bigint): FungibleAmount {
  return { key, assetId: catAssetIdFromKey(key), mojos };
}

function addTo(map: Map<string, bigint>, key: string, mojos: bigint): void {
  map.set(key, (map.get(key) ?? 0n) + mojos);
}

function sortAmounts(amounts: FungibleAmount[]): FungibleAmount[] {
  return amounts.sort((a, b) => {
    if (a.key === b.key) return 0;
    if (a.key === XCH_KEY) return -1;
    if (b.key === XCH_KEY) return 1;
    return a.key.localeCompare(b.key);
  });
}

/**
 * Format a mojo amount as a decimal string, trimming trailing zeros.
 */
export function formatMojos(key: string, mojos: bigint): string {
  const decimals = fungibleDecimals(key);
  const divisor = 10n ** BigInt(decimals);
  const negative = mojos < 0n;
  const abs = negative ? -mojos : mojos;
  const whole = abs / divisor;
  const frac = abs % divisor;

  let text = whole.toString();
  if (frac > 0n) {
    const fracText = frac.toString().padStart(decimals, '0').replace(/0+$/, '');
    text = `${text}.${fracText}`;
  }
  return negative ? `-${text}` : text;
}

/**
 * Royalty owed on an NFT for the given trade prices, rounded down the same way
 * the NFT's transfer program computes it on chain.
 */
export function royaltyForTradePrices(
  nft: NftAsset,
  tradePrices: Map<string, bigint>,
): RoyaltyCharge | null {
  const amounts: FungibleAmount[] = [];
  for (const [key, mojos] of tradePrices) {
    const royalty = (mojos * BigInt(nft.royaltyBasisPoints)) / 10000n;
    if (royalty > 0n) amounts.push(amountOf(key, royalty));
  }
  return amounts.length > 0 ? { nft, amounts: sortAmounts(amounts) } : null;
}

/**
 * Merge per-offer contents into the combined offer's net position.
 *
 * Assets that one offer requests and another offers cancel out; whatever is
 * left is what the taker actually pays or receives. Each offer's NFT royalties
 * are payments the taker must make, so they are netted like any other request.
 */
export function combineOfferContents(offers: OfferContents[]): CombinedContents {
  const grossRequested = new Map<string, bigint>();
  const grossOffered = new Map<string, bigint>();
  const royalties: RoyaltyCharge[] = [];
  let fee = 0n;

  for (const offer of offers) {
    for (const [key, mojos] of offer.requestedFungible) addTo(grossRequested, key, mojos);
    for (const [key, mojos] of offer.offeredFungible) addTo(grossOffered, key, mojos);
    for (const charge of offer.royalties) {
      royalties.push(charge);
      for (const amount of charge.amounts) addTo(grossRequested, amount.key, amount.mojos);
    }
    fee += offer.fee;
  }

  const requestedFungible: FungibleAmount[] = [];
  const offeredFungible: FungibleAmount[] = [];
  const intermediateFungible: FungibleAmount[] = [];

  for (const key of new Set([...grossRequested.keys(), ...grossOffered.keys()])) {
    const requested = grossRequested.get(key) ?? 0n;
    const offered = grossOffered.get(key) ?? 0n;
    const cancelled = requested < offered ? requested : offered;
    if (cancelled > 0n) {
      intermediateFungible.push(amountOf(key, cancelled));
    }

    const net = requested - offered;
    if (net > 0n) {
      requestedFungible.push(amountOf(key, net));
    } else if (net < 0n) {
      offeredFungible.push(amountOf(key, -net));
    }
  }

  // NFTs present on both sides are intermediates that pass straight through.
  const requestedNfts: NftAsset[] = [];
  const offeredNfts: NftAsset[] = [];
  const intermediateNfts: NftAsset[] = [];
  const allNftLaunchers = new Set<string>();
  const requestedNftMap = new Map<string, NftAsset>();
  const offeredNftMap = new Map<string, NftAsset>();

  for (const offer of offers) {
    for (const [id, nft] of offer.requestedNfts) {
      requestedNftMap.set(id, nft);
      allNftLaunchers.add(id);
    }
    for (const [id, nft] of offer.offeredNfts) {
      offeredNftMap.set(id, nft);
      allNftLaunchers.add(id);
    }
  }

  for (const id of [...allNftLaunchers].sort()) {
    const asRequested = requestedNftMap.get(id);
    const asOffered = offeredNftMap.get(id);
    if (asRequested && asOffered) {
      intermediateNfts.push(asOffered);
    } else if (asRequested) {
      requestedNfts.push(asRequested);
    } else if (asOffered) {
      offeredNfts.push(asOffered);
    }
  }

  const toAmounts = (totals: Map<string, bigint>): FungibleAmount[] =>
    sortAmounts(
      [...totals]
        .filter(([, mojos]) => mojos > 0n)
        .map(([key, mojos]) => amountOf(key, mojos)),
    );

  return {
    requestedFungible: sortAmounts(requestedFungible),
    requestedNfts,
    offeredFungible: sortAmounts(offeredFungible),
    offeredNfts,
    intermediateFungible: sortAmounts(intermediateFungible),
    intermediateNfts,
    grossRequestedFungible: toAmounts(grossRequested),
    grossOfferedFungible: toAmounts(grossOffered),
    royalties,
    fee,
  };
}
