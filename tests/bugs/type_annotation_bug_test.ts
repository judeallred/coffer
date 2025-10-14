/// <reference lib="deno.ns" />

/**
 * Test to verify that DexieOfferInfo types compile correctly
 *
 * Bug: Type annotation `(typeof summary.offered)[0]` references summary before it's in scope
 * This test verifies the type is correctly defined
 */

import { assert, assertExists } from 'https://deno.land/std@0.208.0/testing/asserts.ts';

// Import the types to verify they're correct
import type { AssetItem, DexieOfferResponse, NFTItem } from '../../src/types/index.ts';

Deno.test({
  name: 'Bug Test: DexieOfferInfo types should be properly defined',
  fn: () => {
    // Test that the types exist and are properly structured
    const mockNFTItem: NFTItem = {
      type: 'nft',
      name: 'Test NFT',
      nftId: 'nft1test',
      collectionName: 'Test Collection',
      collectionId: 'col1test',
      thumbnail: 'https://example.com/image.png',
      royaltyPercent: 5,
    };

    const mockAssetItem: AssetItem = {
      type: 'asset',
      code: 'XCH',
      amount: 1000000,
    };

    assertExists(mockNFTItem);
    assertExists(mockAssetItem);
    assert(mockNFTItem.type === 'nft');
    assert(mockAssetItem.type === 'asset');

    // Test the union type
    const items: Array<NFTItem | AssetItem> = [mockNFTItem, mockAssetItem];
    assert(items.length === 2);

    console.log('✅ DexieOfferInfo types are properly defined');
  },
});

Deno.test({
  name: 'Bug Test: DexieOfferResponse summary types should be correct',
  fn: () => {
    // Create a mock DexieOfferResponse to verify structure
    const mockResponse: DexieOfferResponse = {
      success: true,
      summary: {
        offeredCount: 1,
        requestedCount: 1,
        offered: [{
          type: 'nft',
          name: 'Test NFT',
          nftId: 'nft1test',
          collectionName: 'Test Collection',
          collectionId: 'col1test',
          thumbnail: null,
          royaltyPercent: 5,
        }],
        requested: [{
          type: 'asset',
          code: 'XCH',
          amount: 1000000,
        }],
      },
      rawResponse: null,
      offerId: 'test123',
    };

    assertExists(mockResponse.summary);
    assert(mockResponse.summary.offered.length === 1);
    assert(mockResponse.summary.requested.length === 1);

    // Verify we can iterate over items with correct typing
    for (const item of mockResponse.summary.offered) {
      if (item.type === 'nft') {
        assertExists(item.name);
        assertExists(item.royaltyPercent);
      }
    }

    console.log('✅ DexieOfferResponse summary types work correctly');
  },
});

// Test that TypeScript compilation works correctly
Deno.test({
  name: 'Bug Test: TypeScript should compile DexieOfferInfo without errors',
  fn: async () => {
    const checkCmd = new Deno.Command('deno', {
      args: [
        'check',
        'src/components/DexieOfferInfo.tsx',
      ],
      cwd: Deno.cwd(),
    });

    const result = await checkCmd.output();
    const stderr = new TextDecoder().decode(result.stderr);

    if (!result.success) {
      console.error('❌ TypeScript compilation errors:');
      console.error(stderr);
    }

    assert(
      result.success,
      `DexieOfferInfo.tsx should compile without TypeScript errors. Errors: ${stderr}`,
    );

    console.log('✅ DexieOfferInfo.tsx compiles successfully');
  },
});
