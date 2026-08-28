/// <reference lib="deno.ns" />
import { assertEquals } from 'https://deno.land/std@0.208.0/testing/asserts.ts';
import { bytesToHex, findOfferedCoinConflicts, isZeroParent } from '../../src/utils/coinUtils.ts';
import { buildCombinedPreview } from '../../src/utils/combinedOfferPreview.ts';
import type { Offer } from '../../src/types/index.ts';

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

Deno.test('buildCombinedPreview', async (t) => {
  await t.step('returns null when no dexie data', () => {
    const offers: Offer[] = [
      { id: '1', content: 'offer1x', isValid: true },
    ];
    assertEquals(buildCombinedPreview(offers), null);
  });

  await t.step('unions offered/requested and builds royalty breakdown', () => {
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
            requestedCount: 1,
            offered: [
              {
                type: 'nft',
                name: 'Cool NFT',
                nftId: 'nft1',
                collectionName: 'Col',
                collectionId: 'col1',
                thumbnail: null,
                royaltyPercent: 5,
              },
            ],
            requested: [{ type: 'asset', code: 'XCH', amount: 1 }],
          },
        },
      },
      {
        id: '2',
        content: 'offer1b',
        isValid: true,
        dexieData: {
          success: true,
          rawResponse: null,
          summary: {
            offeredCount: 1,
            requestedCount: 1,
            offered: [{ type: 'asset', code: 'SBX', amount: 100 }],
            requested: [
              {
                type: 'nft',
                name: 'Cool NFT',
                nftId: 'nft1',
                collectionName: 'Col',
                collectionId: 'col1',
                thumbnail: null,
                royaltyPercent: 5,
              },
            ],
          },
        },
      },
    ];

    const preview = buildCombinedPreview(offers);
    assertEquals(preview !== null, true);
    assertEquals(preview!.offered.length, 2);
    assertEquals(preview!.requested.length, 2);
    assertEquals(preview!.royaltyBreakdown.length, 1);
    assertEquals(preview!.royaltyBreakdown[0].royaltyPercent, 5);
    assertEquals(preview!.royaltyBreakdown[0].name, 'Cool NFT');
  });
});
