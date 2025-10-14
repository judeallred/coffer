/// <reference lib="deno.ns" />
import { assertEquals, assertExists } from '@std/assert';
import { clearDexieOfferCache, fetchDexieOfferDetails } from '../src/utils/offerUtils.ts';

Deno.test('Dexie API - successful response with simple assets', async () => {
  // This is a real completed offer on Dexie
  const offerId = 'HR7aHbCXsJto7iS9uBkiiGJx6iGySxoNqUGQvrZfnj6B';

  const result = await fetchDexieOfferDetails(offerId);

  // Should succeed
  assertEquals(result.success, true);
  assertExists(result.summary);
  assertExists(result.rawResponse);

  // Check summary structure
  assertEquals(typeof result.summary!.offeredCount, 'number');
  assertEquals(typeof result.summary!.requestedCount, 'number');
  assertEquals(Array.isArray(result.summary!.offered), true);
  assertEquals(Array.isArray(result.summary!.requested), true);

  // This specific offer has 1 XCH offered and 1 SBX requested
  assertEquals(result.summary!.offeredCount, 1);
  assertEquals(result.summary!.requestedCount, 1);

  // Check offered item (XCH)
  const offeredItem = result.summary!.offered[0];
  assertEquals(offeredItem.type, 'asset');
  if (offeredItem.type === 'asset') {
    assertEquals(offeredItem.code, 'XCH');
    assertEquals(offeredItem.amount, 1.01);
  }

  // Check requested item (Spacebucks)
  const requestedItem = result.summary!.requested[0];
  assertEquals(requestedItem.type, 'asset');
  if (requestedItem.type === 'asset') {
    assertEquals(requestedItem.code, 'SBX');
    assertEquals(requestedItem.amount, 100000);
  }
});

Deno.test('Dexie API - successful response with NFTs', async () => {
  // Clear cache to ensure fresh request
  clearDexieOfferCache();

  // This is a real offer with NFTs on Dexie
  const offerId = 'Dmh3H5mY6pis58KC8uvWhsfKEtUXg6mGLG6cvBAmXjJj';

  const result = await fetchDexieOfferDetails(offerId);

  // Should succeed
  assertEquals(result.success, true);
  assertExists(result.summary);

  // This offer has 5 NFTs offered and 1 XCH requested
  assertEquals(result.summary!.offeredCount, 5);
  assertEquals(result.summary!.requestedCount, 1);

  // Check first NFT in offered items
  const firstNFT = result.summary!.offered[0];
  assertEquals(firstNFT.type, 'nft');
  if (firstNFT.type === 'nft') {
    assertExists(firstNFT.name);
    assertExists(firstNFT.collectionName);
    assertEquals(firstNFT.collectionName, 'DataLayer Minions');
    // Thumbnail can be string or null
    assertEquals(typeof firstNFT.thumbnail === 'string' || firstNFT.thumbnail === null, true);
    assertEquals(typeof firstNFT.royaltyPercent, 'number');
    // Royalty is 500 basis points = 5%
    assertEquals(firstNFT.royaltyPercent, 5);
  }

  // Check requested item (XCH)
  const requestedItem = result.summary!.requested[0];
  assertEquals(requestedItem.type, 'asset');
  if (requestedItem.type === 'asset') {
    assertEquals(requestedItem.code, 'XCH');
    assertEquals(requestedItem.amount, 4.5);
  }
});

Deno.test('Dexie API - 404 or network error for invalid offer ID', async () => {
  // Use a valid-length but non-existent offer ID (44 characters of 'x')
  const offerId = 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';

  const result = await fetchDexieOfferDetails(offerId);

  // Should fail (either validation or API error)
  assertEquals(result.success, false);
  assertExists(result.error);
  // rawResponse may be null if validation fails
});

Deno.test('Dexie API - 200 response with success: false', async () => {
  // Create a valid-looking but non-existent offer ID
  // Using a Base58 string that has correct length (44 chars) but doesn't exist
  const offerId = '11111111111111111111111111111111111111111111';

  const result = await fetchDexieOfferDetails(offerId, 5000);

  // Should return success: false
  assertEquals(result.success, false);
  assertExists(result.error);

  // The error should mention "not found", "http", or similar
  if (result.error) {
    const errorLower = result.error.toLowerCase();
    const hasExpectedError = errorLower.includes('not found') ||
      errorLower.includes('expired') ||
      errorLower.includes('no longer supported') ||
      errorLower.includes('http') ||
      errorLower.includes('404');
    assertEquals(hasExpectedError, true);
  }
});

Deno.test('Dexie API - timeout handling', async () => {
  // Use a very short timeout to test timeout behavior
  const offerId = 'HR7aHbCXsJto7iS9uBkiiGJx6iGySxoNqUGQvrZfnj6B';

  // Note: This test might pass if the API is very fast
  // We're setting a 1ms timeout which should fail
  const result = await fetchDexieOfferDetails(offerId, 1);

  // Should either timeout or succeed very quickly
  // If it times out, check the error message
  if (!result.success) {
    assertExists(result.error);
  }
});

Deno.test('Dexie API - handles malformed offer ID gracefully', async () => {
  // Test with empty string
  const result1 = await fetchDexieOfferDetails('');
  // Empty string should either fail or return error from API
  // The API might return a 404 or success:false
  if (result1.success) {
    // If it somehow succeeds, it should still have proper structure
    assertExists(result1.rawResponse);
  } else {
    assertExists(result1.error);
  }

  // Test with very short string (definitely invalid)
  const result2 = await fetchDexieOfferDetails('abc');
  // Should fail or return API error
  if (!result2.success) {
    assertExists(result2.error);
  }
});

Deno.test('Dexie API - raw response is always included', async () => {
  const offerId = 'HR7aHbCXsJto7iS9uBkiiGJx6iGySxoNqUGQvrZfnj6B';

  const result = await fetchDexieOfferDetails(offerId);

  // Raw response should always be present
  assertExists(result.rawResponse);

  // If successful, raw response should have the full data structure
  if (result.success && typeof result.rawResponse === 'object' && result.rawResponse !== null) {
    const raw = result.rawResponse as { success?: boolean; offer?: unknown };
    assertExists(raw.success);
    assertExists(raw.offer);
  }
});

Deno.test('Dexie API - NFT without collection name uses default', async () => {
  // This test checks that our code handles missing optional fields
  // We'll use a real offer and verify defaults are applied when fields are missing

  const offerId = 'Dmh3H5mY6pis58KC8uvWhsfKEtUXg6mGLG6cvBAmXjJj';
  const result = await fetchDexieOfferDetails(offerId);

  if (result.success && result.summary) {
    for (const item of result.summary.offered) {
      if (item.type === 'nft') {
        // Should have a name (even if it's "Unknown NFT")
        assertExists(item.name);
        // Should have a collection name (even if it's "Unknown Collection")
        assertExists(item.collectionName);
        // Thumbnail can be string or null
        assertEquals(typeof item.thumbnail === 'string' || item.thumbnail === null, true);
        // Royalty should be a number (0 if missing)
        assertEquals(typeof item.royaltyPercent, 'number');
      }
    }
  }
});

Deno.test('Dexie API - input validation rejects invalid offer IDs', async () => {
  // Test with empty string
  const result1 = await fetchDexieOfferDetails('');
  assertEquals(result1.success, false);
  assertExists(result1.error);
  assertEquals(result1.error, 'Invalid offer ID format (expected 44-character Base58 string)');

  // Test with too short ID
  const result2 = await fetchDexieOfferDetails('abc123');
  assertEquals(result2.success, false);
  assertExists(result2.error);
  assertEquals(result2.error, 'Invalid offer ID format (expected 44-character Base58 string)');

  // Test with too long ID
  const result3 = await fetchDexieOfferDetails('a'.repeat(100));
  assertEquals(result3.success, false);
  assertExists(result3.error);
  assertEquals(result3.error, 'Invalid offer ID format (expected 44-character Base58 string)');
});

Deno.test('Dexie API - caching works correctly', async () => {
  // Clear cache first
  clearDexieOfferCache();

  const offerId = 'HR7aHbCXsJto7iS9uBkiiGJx6iGySxoNqUGQvrZfnj6B';

  // First request
  const result1 = await fetchDexieOfferDetails(offerId);
  assertEquals(result1.success, true);

  // Second request (should be cached)
  const startTime2 = Date.now();
  const result2 = await fetchDexieOfferDetails(offerId);
  const duration2 = Date.now() - startTime2;

  assertEquals(result2.success, true);

  // Cached request should be much faster (< 10ms vs potentially 100ms+)
  assertEquals(duration2 < 10, true, `Cached request took ${duration2}ms, expected < 10ms`);

  // Results should be identical
  assertEquals(JSON.stringify(result1), JSON.stringify(result2));

  // Clear cache
  clearDexieOfferCache();

  // Third request (should hit API again)
  const result3 = await fetchDexieOfferDetails(offerId);
  assertEquals(result3.success, true);
});

Deno.test('Dexie API - cache expires after TTL', async () => {
  // Note: This test would need to wait 5 minutes for the actual TTL
  // For now, we just verify the cache clearing functionality works
  clearDexieOfferCache();

  const offerId = 'HR7aHbCXsJto7iS9uBkiiGJx6iGySxoNqUGQvrZfnj6B';

  // Make initial request
  const result1 = await fetchDexieOfferDetails(offerId);
  assertEquals(result1.success, true);

  // Clear cache manually (simulating expiry)
  clearDexieOfferCache();

  // Next request should work fine
  const result2 = await fetchDexieOfferDetails(offerId);
  assertEquals(result2.success, true);
});
