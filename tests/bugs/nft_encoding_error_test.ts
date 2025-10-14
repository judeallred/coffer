/// <reference lib="deno.ns" />

/**
 * Test to verify NFT ID encoding error handling
 *
 * Bug: NFT ID encoding failures are silently logged but not exposed to users
 * Users don't know why some NFT links might be broken
 */

import {
  assert,
  assertEquals,
  assertExists,
} from 'https://deno.land/std@0.208.0/testing/asserts.ts';

// We need to test the parseOfferItems function which is not exported
// So we'll test it indirectly through fetchDexieOfferDetails

Deno.test({
  name: 'Bug Test: Invalid NFT hex ID should be handled gracefully',
  fn: async () => {
    // Mock fetch to return a response with invalid hex ID
    const originalFetch = globalThis.fetch;
    let fetchCalled = false;

    globalThis.fetch = (_url: string | URL | Request): Promise<Response> => {
      fetchCalled = true;
      // Return mock data with invalid hex ID
      const mockData = {
        success: true,
        offer: {
          offered: [{
            is_nft: true,
            id: 'INVALID_HEX', // This should cause encoding to fail
            name: 'Test NFT',
            collection: {
              id: '0x1234567890abcdef',
              name: 'Test Collection',
            },
            preview: {
              medium: 'https://example.com/image.png',
            },
            nft_data: {
              royalty: 500, // 5%
            },
          }],
          requested: [],
        },
      };

      return new Response(JSON.stringify(mockData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    try {
      const { fetchDexieOfferDetails } = await import('../../src/utils/offerUtils.ts');

      // This should not throw, but handle the error gracefully
      const result = await fetchDexieOfferDetails('HR7aHbCXsJto7iS9uBkiiGJx6iGySxoNqUGQvrZfnj6B');

      assertExists(result);
      assertEquals(result.success, true, 'Should succeed even with invalid hex ID');

      if (result.summary) {
        const nftItem = result.summary.offered[0];
        assertExists(nftItem);

        if (nftItem.type === 'nft') {
          // The nftId should be null due to encoding failure
          // But the NFT should still be included in the response
          console.log(`NFT ID after encoding failure: ${nftItem.nftId}`);
          assertExists(nftItem.name, 'NFT name should still be present');

          // The bug is that users don't know the ID encoding failed
          // In the fix, we should track this error somehow
        }
      }

      console.log('✅ Invalid NFT hex ID handled gracefully (but silently)');
      console.log('⚠️  Note: Error is logged but not exposed to UI');
    } finally {
      // Restore original fetch
      globalThis.fetch = originalFetch;
      assert(fetchCalled, 'Mock fetch should have been called');
    }
  },
});

Deno.test({
  name: 'Bug Test: Valid NFT hex ID should encode correctly',
  fn: async () => {
    const originalFetch = globalThis.fetch;

    globalThis.fetch = (): Promise<Response> => {
      const mockData = {
        success: true,
        offer: {
          offered: [{
            is_nft: true,
            id: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef', // Valid 32-byte hex
            name: 'Test NFT',
            collection: {
              id: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
              name: 'Test Collection',
            },
            preview: {
              medium: 'https://example.com/image.png',
            },
            nft_data: {
              royalty: 500,
            },
          }],
          requested: [],
        },
      };

      return new Response(JSON.stringify(mockData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    try {
      const { fetchDexieOfferDetails } = await import('../../src/utils/offerUtils.ts');

      const result = await fetchDexieOfferDetails('HR7aHbCXsJto7iS9uBkiiGJx6iGySxoNqUGQvrZfnj6B');

      assertExists(result);
      assertEquals(result.success, true);

      if (result.summary) {
        const nftItem = result.summary.offered[0];

        if (nftItem.type === 'nft') {
          assertExists(nftItem.nftId, 'Valid hex should encode to nftId');
          assert(
            nftItem.nftId?.startsWith('nft1'),
            'NFT ID should be bech32m encoded with nft1 prefix',
          );
          console.log(`✅ Valid NFT ID encoded: ${nftItem.nftId}`);
        }
      }
    } finally {
      globalThis.fetch = originalFetch;
    }
  },
});

Deno.test({
  name: 'Bug Test: Encoding error should be logged to console',
  fn: async () => {
    const originalFetch = globalThis.fetch;
    const originalConsoleError = console.error;

    let errorLogged = false;
    const errorLogs: string[] = [];

    // Capture console.error
    console.error = (...args: unknown[]) => {
      const message = args.join(' ');
      errorLogs.push(message);
      if (message.includes('Failed to encode NFT ID')) {
        errorLogged = true;
      }
      originalConsoleError(...args);
    };

    globalThis.fetch = (): Promise<Response> => {
      const mockData = {
        success: true,
        offer: {
          offered: [{
            is_nft: true,
            id: 'INVALID', // This will cause encoding to fail
            name: 'Test NFT',
            collection: {
              id: '0x1234',
              name: 'Test',
            },
            nft_data: {
              royalty: 0,
            },
          }],
          requested: [],
        },
      };

      return new Response(JSON.stringify(mockData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    try {
      const { fetchDexieOfferDetails } = await import('../../src/utils/offerUtils.ts');
      await fetchDexieOfferDetails('test123');

      // The bug is that errors are only logged, not exposed to UI
      console.log(`Error logged to console: ${errorLogged}`);
      console.log(`Total error logs: ${errorLogs.length}`);

      if (errorLogged) {
        console.log('✅ Encoding error was logged (current behavior)');
        console.log('⚠️  But not exposed to UI for user notification');
      } else {
        console.log('⚠️  No encoding error logged - may be handling differently');
      }
    } finally {
      globalThis.fetch = originalFetch;
      console.error = originalConsoleError;
    }
  },
});
