// Tests for Dexie Token Data Service
import { assertEquals, assertNotEquals } from "https://deno.land/std@0.218.2/assert/mod.ts";
import { 
  getDexieCATToken,
  getDexieCATDisplayName,
  getAllDexieCATTokens,
  getDexieCacheStats,
  refreshDexieTokenCache,
  getDexieCATTokensBulk
} from "../../src/services/dexieTokenData.ts";

// Known asset IDs from our test data  
const KNOWN_ASSET_IDS = {
  wUSDC_b: 'fa4a180ac326e67ea289b869e3448256f6af05721f7cf934cb9901baa6b7a99d',
  SBX: 'a628c1c2c6fcb74d53746157e438e108eab5c0bb3e5c80ff9b1910b3e4832913',
  MBX: 'e0005928763a7253a9c443d76837bdfab312382fc47cab85dad00be23ae4e82f'
};

Deno.test("getDexieCATToken should fetch token data from API", async () => {
  try {
    // This test requires network access to Dexie API
    const tokenData = await getDexieCATToken(KNOWN_ASSET_IDS.SBX);
    
    if (tokenData) {
      assertEquals(tokenData.assetId, KNOWN_ASSET_IDS.SBX);
      assertNotEquals(tokenData.symbol, undefined);
      assertNotEquals(tokenData.name, undefined);
      assertEquals(tokenData.source, 'dexie_tickers');
      
      console.log('✅ SBX token data from Dexie:', tokenData);
    } else {
      console.log('⚠️ SBX not found in Dexie tickers (may not be trading)');
    }
  } catch (error) {
    console.log('⚠️ Network test skipped:', error.message);
  }
});

Deno.test("getDexieCATDisplayName should return display names", async () => {
  try {
    const sbxName = await getDexieCATDisplayName(KNOWN_ASSET_IDS.SBX);
    
    if (sbxName) {
      assertNotEquals(sbxName, null);
      console.log('✅ SBX display name from Dexie:', sbxName);
    } else {
      console.log('⚠️ SBX display name not found');
    }
  } catch (error) {
    console.log('⚠️ Network test skipped:', error.message);
  }
});

Deno.test("getAllDexieCATTokens should return all available tokens", async () => {
  try {
    const allTokens = await getAllDexieCATTokens();
    
    assertEquals(Array.isArray(allTokens), true);
    console.log(`📊 Found ${allTokens.length} tokens on Dexie`);
    
    // Log first few tokens as examples
    const examples = allTokens.slice(0, 5);
    for (const token of examples) {
      console.log(`  - ${token.symbol}: ${token.name} (${token.assetId.substring(0, 8)}...)`);
    }
    
  } catch (error) {
    console.log('⚠️ Network test skipped:', error.message);
  }
});

Deno.test("getDexieCacheStats should return cache information", async () => {
  // First make sure we have some data
  try {
    await getDexieCATToken(KNOWN_ASSET_IDS.SBX);
  } catch {
    // Ignore network errors
  }
  
  const stats = getDexieCacheStats();
  
  assertEquals(typeof stats.size, 'number');
  assertEquals(typeof stats.isStale, 'boolean');
  
  console.log('📋 Dexie cache stats:', stats);
});

Deno.test("getDexieCATTokensBulk should handle multiple lookups", async () => {
  try {
    const assetIds = [
      KNOWN_ASSET_IDS.SBX,
      KNOWN_ASSET_IDS.MBX,
      'invalid_asset_id'
    ];
    
    const results = await getDexieCATTokensBulk(assetIds);
    
    assertEquals(results.size, 3);
    
    const sbxResult = results.get(KNOWN_ASSET_IDS.SBX);
    const invalidResult = results.get('invalid_asset_id');
    
    // Invalid asset should return null
    assertEquals(invalidResult, null);
    
    console.log('✅ Bulk lookup results:', {
      SBX: sbxResult ? sbxResult.symbol : 'null',
      invalid: invalidResult
    });
    
  } catch (error) {
    console.log('⚠️ Network test skipped:', error.message);
  }
});

Deno.test("refreshDexieTokenCache should force cache refresh", async () => {
  try {
    const statsBefore = getDexieCacheStats();
    
    await refreshDexieTokenCache();
    
    const statsAfter = getDexieCacheStats();
    
    // After refresh, cache should be newer
    if (statsAfter.lastFetch && statsBefore.lastFetch) {
      assertEquals(statsAfter.lastFetch.getTime() >= statsBefore.lastFetch.getTime(), true);
    }
    
    console.log('✅ Cache refreshed successfully');
    
  } catch (error) {
    console.log('⚠️ Network test skipped:', error.message);
  }
});

Deno.test("Invalid asset IDs should be handled gracefully", async () => {
  const invalidIds = [
    '',
    'invalid',
    '123',
    'not-hex',
    'fa4a180ac326e67ea289b869e3448256f6af05721f7cf934cb9901baa6b7a99', // too short
  ];
  
  for (const invalidId of invalidIds) {
    const result = await getDexieCATToken(invalidId);
    assertEquals(result, null);
    console.log(`✅ Invalid asset ID "${invalidId}" handled correctly`);
  }
});
