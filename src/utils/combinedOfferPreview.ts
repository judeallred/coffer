// Build the combined-offer preview from the offer's own contents.
//
// Amounts and royalties come from the combined offer's coin spends, so they stay
// correct for offers that aren't listed on any marketplace. dexie/MintGarden
// data is used only to put names and thumbnails on the assets we already found.

import type { AssetItem, NFTItem, Offer } from '../types/index.ts';
import { hexToBech32m } from './offerUtils.ts';
import { formatMojos, XCH_KEY } from './offerContents.ts';
import type { CombinedContents, FungibleAmount, NftAsset } from './offerContents.ts';

export interface PreviewNft {
  launcherId: string;
  nftId: string | null;
  name: string;
  collectionName: string | null;
  collectionId: string | null;
  thumbnail: string | null;
  royaltyPercent: number;
}

export interface PreviewAmount {
  key: string;
  amount: string;
  code: string;
}

export interface PreviewSide {
  amounts: PreviewAmount[];
  nfts: PreviewNft[];
}

export interface CombinedPreview {
  requested: PreviewSide;
  offered: PreviewSide;
  /** Assets that cancel out between offers and never reach the taker. */
  intermediates: PreviewSide;
  royalties: Array<{ nft: PreviewNft; amounts: PreviewAmount[] }>;
  /** Maker fee in XCH, omitted when zero. */
  fee: string | null;
}

interface NftMetadata {
  name: string;
  collectionName: string | null;
  collectionId: string | null;
  thumbnail: string | null;
}

interface MetadataIndex {
  nfts: Map<string, NftMetadata>;
  catCodes: Map<string, string>;
}

function shortId(id: string): string {
  return id.length > 12 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id;
}

function safeNftId(launcherId: string): string | null {
  try {
    return hexToBech32m(launcherId, 'nft');
  } catch {
    return null;
  }
}

/**
 * Index names/thumbnails from whichever input offers had marketplace data.
 */
function buildMetadataIndex(offers: Offer[]): MetadataIndex {
  const nfts = new Map<string, NftMetadata>();
  const catCodes = new Map<string, string>();

  for (const offer of offers) {
    const summary = offer.dexieData?.success ? offer.dexieData.summary : undefined;
    if (!summary) continue;

    for (const item of [...summary.offered, ...summary.requested]) {
      if (item.type === 'nft') {
        const nft = item as NFTItem;
        if (!nft.nftId) continue;
        nfts.set(nft.nftId, {
          name: nft.name,
          collectionName: nft.collectionName || null,
          collectionId: nft.collectionId,
          thumbnail: nft.thumbnail,
        });
      } else {
        const asset = item as AssetItem;
        if (asset.assetId && asset.code) {
          catCodes.set(asset.assetId.toLowerCase(), asset.code);
        }
      }
    }
  }

  return { nfts, catCodes };
}

function toPreviewNft(asset: NftAsset, index: MetadataIndex): PreviewNft {
  const nftId = safeNftId(asset.launcherId);
  const metadata = nftId ? index.nfts.get(nftId) : undefined;

  return {
    launcherId: asset.launcherId,
    nftId,
    name: metadata?.name ?? `NFT ${shortId(nftId ?? asset.launcherId)}`,
    collectionName: metadata?.collectionName ?? null,
    collectionId: metadata?.collectionId ?? null,
    thumbnail: metadata?.thumbnail ?? null,
    royaltyPercent: asset.royaltyBasisPoints / 100,
  };
}

function toPreviewAmount(amount: FungibleAmount, index: MetadataIndex): PreviewAmount {
  let code = 'XCH';
  if (amount.key !== XCH_KEY && amount.assetId) {
    code = index.catCodes.get(amount.assetId.toLowerCase()) ?? `CAT ${shortId(amount.assetId)}`;
  }

  return {
    key: amount.key,
    amount: formatMojos(amount.key, amount.mojos),
    code,
  };
}

function toSide(
  amounts: FungibleAmount[],
  nfts: NftAsset[],
  index: MetadataIndex,
): PreviewSide {
  return {
    amounts: amounts.map((amount) => toPreviewAmount(amount, index)),
    nfts: nfts.map((nft) => toPreviewNft(nft, index)),
  };
}

function isEmptySide(side: PreviewSide): boolean {
  return side.amounts.length === 0 && side.nfts.length === 0;
}

/**
 * Turn derived combined-offer contents into display data.
 * Returns null when the offer resolves to nothing on either side.
 */
export function buildCombinedPreview(
  contents: CombinedContents,
  offers: Offer[],
): CombinedPreview | null {
  const index = buildMetadataIndex(offers);

  const requested = toSide(contents.requestedFungible, contents.requestedNfts, index);
  const offered = toSide(contents.offeredFungible, contents.offeredNfts, index);
  const intermediates = toSide(
    contents.intermediateFungible,
    contents.intermediateNfts,
    index,
  );

  if (isEmptySide(requested) && isEmptySide(offered)) {
    return null;
  }

  return {
    requested,
    offered,
    intermediates,
    royalties: contents.royalties.map((charge) => ({
      nft: toPreviewNft(charge.nft, index),
      amounts: charge.amounts.map((amount) => toPreviewAmount(amount, index)),
    })),
    fee: contents.fee > 0n ? formatMojos(XCH_KEY, contents.fee) : null,
  };
}

/**
 * Filename for downloading a combined offer: `offer` plus the last ~12
 * characters of the offer string, plus a `.offer` extension
 * (e.g. `offercmqvpsrvl00n.offer`).
 */
export function combinedOfferFileName(offer: string, suffixLength = 12): string {
  const trimmed = offer.trim();
  if (!trimmed) {
    throw new Error('Cannot download an empty offer');
  }
  return `offer${trimmed.slice(-suffixLength)}.offer`;
}
