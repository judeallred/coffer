/// <reference lib="deno.ns" />
import { assertEquals, assertThrows } from 'https://deno.land/std@0.208.0/testing/asserts.ts';
import { bytesToHex, findOfferedCoinConflicts, isZeroParent } from '../../src/utils/coinUtils.ts';
import {
  buildCombinedPreview,
  combinedOfferFileName,
} from '../../src/utils/combinedOfferPreview.ts';
import {
  combineOfferContents,
  formatMojos,
  MOJOS_PER_XCH,
  XCH_KEY,
} from '../../src/utils/offerContents.ts';
import type { NftAsset, OfferContents } from '../../src/utils/offerContents.ts';
import type { Offer } from '../../src/types/index.ts';

function emptyContents(): OfferContents {
  return {
    requestedFungible: new Map(),
    requestedNfts: new Map(),
    offeredFungible: new Map(),
    offeredNfts: new Map(),
    fee: 0n,
  };
}

function nft(launcherId: string, royaltyBasisPoints = 0): NftAsset {
  return { launcherId, royaltyBasisPoints, royaltyPuzzleHash: 'ff'.repeat(32) };
}

const xch = (amount: number) => BigInt(amount) * MOJOS_PER_XCH;

Deno.test('coinUtils', async (t) => {
  await t.step('bytesToHex encodes bytes', () => {
    assertEquals(bytesToHex(new Uint8Array([0, 15, 255])), '000fff');
  });

  await t.step('isZeroParent detects 32 zero bytes', () => {
    assertEquals(isZeroParent(new Uint8Array(32)), true);
    const notZero = new Uint8Array(32);
    notZero[0] = 1;
    assertEquals(isZeroParent(notZero), false);
    assertEquals(isZeroParent(new Uint8Array(16)), false);
  });

  await t.step('findOfferedCoinConflicts reports shared coins across offers', () => {
    const conflicts = findOfferedCoinConflicts([
      { offerIndex: 1, coinIds: ['aaa', 'bbb'] },
      { offerIndex: 2, coinIds: ['bbb', 'ccc'] },
      { offerIndex: 3, coinIds: ['ddd'] },
    ]);
    assertEquals(conflicts.length, 1);
    assertEquals(conflicts[0].coinId, 'bbb');
    assertEquals(conflicts[0].offerIndexes, [1, 2]);
  });

  await t.step('findOfferedCoinConflicts returns empty when all coins unique', () => {
    assertEquals(
      findOfferedCoinConflicts([
        { offerIndex: 1, coinIds: ['a'] },
        { offerIndex: 2, coinIds: ['b'] },
      ]),
      [],
    );
  });
});

Deno.test('formatMojos', async (t) => {
  await t.step('formats XCH with 12 decimals and trims zeros', () => {
    assertEquals(formatMojos(XCH_KEY, MOJOS_PER_XCH), '1');
    assertEquals(formatMojos(XCH_KEY, MOJOS_PER_XCH / 10n), '0.1');
    assertEquals(formatMojos(XCH_KEY, 11n * MOJOS_PER_XCH / 10n), '1.1');
    assertEquals(formatMojos(XCH_KEY, 10_000_000n), '0.00001');
    assertEquals(formatMojos(XCH_KEY, 0n), '0');
  });

  await t.step('formats CATs with 3 decimals', () => {
    assertEquals(formatMojos('cat:abcd', 1_000n), '1');
    assertEquals(formatMojos('cat:abcd', 1_500n), '1.5');
  });
});

Deno.test('combineOfferContents', async (t) => {
  await t.step('sums requested amounts across offers instead of deduping', () => {
    const a = emptyContents();
    a.requestedFungible.set(XCH_KEY, xch(1));
    const b = emptyContents();
    b.requestedFungible.set(XCH_KEY, xch(1));

    const combined = combineOfferContents([a, b]);
    assertEquals(combined.requestedFungible.length, 1);
    assertEquals(formatMojos(XCH_KEY, combined.requestedFungible[0].mojos), '2');
  });

  await t.step('reproduces the Sage-verified case: 0.9 + 0.1 XCH plus 10% royalty', () => {
    // Offer 1 asks for 0.1 XCH and pays a 0.00001 XCH maker fee.
    const first = emptyContents();
    first.requestedFungible.set(XCH_KEY, MOJOS_PER_XCH / 10n);
    first.fee = 10_000_000n;

    // Offer 2 offers a 10% royalty NFT for 0.9 XCH.
    const second = emptyContents();
    second.requestedFungible.set(XCH_KEY, (9n * MOJOS_PER_XCH) / 10n);
    second.offeredNfts.set('aa', nft('aa', 1000));

    const combined = combineOfferContents([first, second]);

    assertEquals(combined.requestedFungible.length, 1);
    assertEquals(formatMojos(XCH_KEY, combined.requestedFungible[0].mojos), '1.1');
    assertEquals(combined.offeredNfts.length, 1);
    assertEquals(combined.royalties.length, 1);
    assertEquals(formatMojos(XCH_KEY, combined.royalties[0].amounts[0].mojos), '0.1');
    assertEquals(formatMojos(XCH_KEY, combined.fee), '0.00001');
  });

  await t.step('nets an asset offered by one offer and requested by another', () => {
    const a = emptyContents();
    a.requestedFungible.set(XCH_KEY, xch(3));
    const b = emptyContents();
    b.offeredFungible.set(XCH_KEY, xch(1));

    const combined = combineOfferContents([a, b]);
    assertEquals(combined.requestedFungible.length, 1);
    assertEquals(formatMojos(XCH_KEY, combined.requestedFungible[0].mojos), '2');
    assertEquals(combined.offeredFungible.length, 0);
    assertEquals(formatMojos(XCH_KEY, combined.intermediateFungible[0].mojos), '1');
  });

  await t.step('reports an NFT on both sides as an intermediate', () => {
    const a = emptyContents();
    a.offeredNfts.set('mid', nft('mid', 500));
    const b = emptyContents();
    b.requestedNfts.set('mid', nft('mid', 500));

    const combined = combineOfferContents([a, b]);
    assertEquals(combined.offeredNfts.length, 0);
    assertEquals(combined.requestedNfts.length, 0);
    assertEquals(combined.intermediateNfts.length, 1);
    assertEquals(combined.intermediateNfts[0].launcherId, 'mid');
  });

  await t.step('splits the royalty base across multiple royalty NFTs', () => {
    const a = emptyContents();
    a.requestedFungible.set(XCH_KEY, xch(2));
    a.offeredNfts.set('one', nft('one', 1000));
    a.offeredNfts.set('two', nft('two', 1000));

    const combined = combineOfferContents([a]);
    // 10% of 1 XCH each, so 2.2 XCH total rather than 2.4.
    assertEquals(combined.royalties.length, 2);
    assertEquals(formatMojos(XCH_KEY, combined.royalties[0].amounts[0].mojos), '0.1');
    assertEquals(formatMojos(XCH_KEY, combined.requestedFungible[0].mojos), '2.2');
  });

  await t.step('charges no royalty when nothing fungible is requested', () => {
    const a = emptyContents();
    a.offeredNfts.set('one', nft('one', 1000));

    const combined = combineOfferContents([a]);
    assertEquals(combined.royalties.length, 0);
  });
});

Deno.test('buildCombinedPreview', async (t) => {
  const launcher = 'f5233640f9ad0e701bb07e25a65c7b00cd39472c01c2d153ac088a14ab2bc25d';

  await t.step('returns null when the offer resolves to nothing', () => {
    assertEquals(buildCombinedPreview(combineOfferContents([emptyContents()]), []), null);
  });

  await t.step('labels amounts and NFTs without any marketplace data', () => {
    const offer = emptyContents();
    offer.requestedFungible.set(XCH_KEY, MOJOS_PER_XCH);
    offer.offeredNfts.set(launcher, nft(launcher, 1000));

    const preview = buildCombinedPreview(combineOfferContents([offer]), []);
    assertEquals(preview !== null, true);
    assertEquals(preview!.requested.amounts[0].code, 'XCH');
    assertEquals(preview!.requested.amounts[0].amount, '1.1');
    assertEquals(preview!.offered.nfts[0].royaltyPercent, 10);
    // Falls back to a shortened bech32m id rather than dropping the NFT.
    assertEquals(preview!.offered.nfts[0].name.startsWith('NFT nft1'), true);
    assertEquals(preview!.offered.nfts[0].thumbnail, null);
  });

  await t.step('takes names and thumbnails from dexie when available', () => {
    const offer = emptyContents();
    offer.requestedFungible.set(XCH_KEY, MOJOS_PER_XCH);
    offer.offeredNfts.set(launcher, nft(launcher, 1000));

    // Same NFT as above, expressed the way dexie returns it.
    const nftId = 'nft1753nvs8e4588qxas0cj6vhrmqrxnj3evq8pdz5avpz9pf2etcfwsr4nmqg';
    const offers: Offer[] = [
      {
        id: '1',
        content: 'offer1a',
        isValid: true,
        dexieData: {
          success: true,
          rawResponse: null,
          summary: {
            offeredCount: 1,
            requestedCount: 0,
            offered: [
              {
                type: 'nft',
                name: 'Timeless Timber #423',
                nftId,
                collectionName: 'Timeless Timbers',
                collectionId: 'col1',
                thumbnail: 'https://example.test/thumb.png',
                royaltyPercent: 10,
              },
            ],
            requested: [],
          },
        },
      },
    ];

    const preview = buildCombinedPreview(combineOfferContents([offer]), offers);
    assertEquals(preview!.offered.nfts[0].name, 'Timeless Timber #423');
    assertEquals(preview!.offered.nfts[0].collectionName, 'Timeless Timbers');
    assertEquals(preview!.offered.nfts[0].thumbnail, 'https://example.test/thumb.png');
  });

  await t.step('labels CATs with the dexie code when known', () => {
    const assetId = 'ab'.repeat(32);
    const offer = emptyContents();
    offer.requestedFungible.set(`cat:${assetId}`, 5_000n);

    const offers: Offer[] = [
      {
        id: '1',
        content: 'offer1a',
        isValid: true,
        dexieData: {
          success: true,
          rawResponse: null,
          summary: {
            offeredCount: 0,
            requestedCount: 1,
            offered: [],
            requested: [{ type: 'asset', code: 'DBX', amount: 5, assetId }],
          },
        },
      },
    ];

    const preview = buildCombinedPreview(combineOfferContents([offer]), offers);
    assertEquals(preview!.requested.amounts[0].code, 'DBX');
    assertEquals(preview!.requested.amounts[0].amount, '5');

    const unlabeled = buildCombinedPreview(combineOfferContents([offer]), []);
    assertEquals(unlabeled!.requested.amounts[0].code.startsWith('CAT '), true);
  });

  await t.step('surfaces the maker fee only when non-zero', () => {
    const offer = emptyContents();
    offer.requestedFungible.set(XCH_KEY, MOJOS_PER_XCH);
    offer.fee = 10_000_000n;

    assertEquals(buildCombinedPreview(combineOfferContents([offer]), [])!.fee, '0.00001');

    const noFee = emptyContents();
    noFee.requestedFungible.set(XCH_KEY, MOJOS_PER_XCH);
    assertEquals(buildCombinedPreview(combineOfferContents([noFee]), [])!.fee, null);
  });
});

Deno.test('combinedOfferFileName', async (t) => {
  await t.step('uses offer plus the last ~12 characters with .offer extension', () => {
    assertEquals(
      combinedOfferFileName('offer1qqr83wcuu2rykcmqvpsrvl00n'),
      'offercmqvpsrvl00n.offer',
    );
  });

  await t.step('throws when the offer is empty so the UI can disable download', () => {
    assertThrows(
      () => combinedOfferFileName('   '),
      Error,
      'Cannot download an empty offer',
    );
  });
});
