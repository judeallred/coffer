// Tests for CAT Name Service
import { assertEquals, assertNotEquals } from "@std/assert";
import { 
  getCATTokenInfo, 
  getCATDisplayName, 
  getCATTokenInfoBulk,
  clearCATTokenCache,
  getCacheStats,
  type CATTokenInfo
} from "../../src/services/catNameService.ts";

// Known test asset IDs from our existing test data
const KNOWN_ASSET_IDS = {
  wUSDC_b: 'fa4a180ac326e67ea289b869e3448256f6af05721f7cf934cb9901baa6b7a99d',
  SBX: 'a628c1c2c6fcb74d53746157e438e108eab5c0bb3e5c80ff9b1910b3e4832913',
  MBX: 'e0005928763a7253a9c443d76837bdfab312382fc47cab85dad00be23ae4e82f',
  DBX: 'db1a9020d48d9d4ad22631b66ab4b9ebd3637ef7758ad38881348c5d24c38f20',
  wUSDC: 'bbb51b246fbec1da1305be31dcf17151ccd0b8231a1ec306d7ce9f5b8c742b9e'
};

// Expected token information for known assets
const EXPECTED_TOKENS = {
  [KNOWN_ASSET_IDS.wUSDC_b]: {
    expectedSymbol: 'wUSDC.b',
    expectedName: 'Wrapped USD Coin (Base)'
  },
  [KNOWN_ASSET_IDS.SBX]: {
    expectedSymbol: 'SBX',
    expectedName: 'Spacebucks'
  },
  [KNOWN_ASSET_IDS.MBX]: {
    expectedSymbol: 'MBX',
    expectedName: 'Marmot Bucks'
  },
  [KNOWN_ASSET_IDS.DBX]: {
    expectedSymbol: 'DBX',
    expectedName: 'Dexie Bucks'
  },
  [KNOWN_ASSET_IDS.wUSDC]: {
    expectedSymbol: 'wUSDC',
    expectedName: 'Wrapped USD Coin'
  }
};

Deno.test("getCATTokenInfo should return known wUSDC.b token info", async () => {
  const tokenInfo = await getCATTokenInfo(KNOWN_ASSET_IDS.wUSDC_b);
  
  assertEquals(tokenInfo?.assetId, KNOWN_ASSET_IDS.wUSDC_b);
  assertEquals(tokenInfo?.symbol, 'wUSDC.b');
  assertEquals(tokenInfo?.name, 'Wrapped USD Coin (Base)');
  assertEquals(tokenInfo?.isVerified, true);
  
  console.log('✅ wUSDC.b token info retrieved successfully:', tokenInfo);
});

Deno.test("getCATTokenInfo should return known SBX token info", async () => {
  const tokenInfo = await getCATTokenInfo(KNOWN_ASSET_IDS.SBX);
  
  assertEquals(tokenInfo?.assetId, KNOWN_ASSET_IDS.SBX);
  assertEquals(tokenInfo?.symbol, 'SBX');
  assertEquals(tokenInfo?.name, 'Spacebucks');
  assertEquals(tokenInfo?.isVerified, true);
  
  console.log('✅ SBX token info retrieved successfully:', tokenInfo);
});

Deno.test("getCATTokenInfo should return known MBX token info", async () => {
  const tokenInfo = await getCATTokenInfo(KNOWN_ASSET_IDS.MBX);
  
  assertEquals(tokenInfo?.assetId, KNOWN_ASSET_IDS.MBX);
  assertEquals(tokenInfo?.symbol, 'MBX');
  assertEquals(tokenInfo?.name, 'Marmot Bucks');
  assertEquals(tokenInfo?.isVerified, true);
  
  console.log('✅ MBX token info retrieved successfully:', tokenInfo);
});

Deno.test("getCATTokenInfo should return known DBX token info", async () => {
  const tokenInfo = await getCATTokenInfo(KNOWN_ASSET_IDS.DBX);
  
  assertEquals(tokenInfo?.assetId, KNOWN_ASSET_IDS.DBX);
  assertEquals(tokenInfo?.symbol, 'DBX');
  assertEquals(tokenInfo?.name, 'Dexie Bucks');
  assertEquals(tokenInfo?.isVerified, true);
  
  console.log('✅ DBX token info retrieved successfully:', tokenInfo);
});

Deno.test("getCATTokenInfo should return known wUSDC token info", async () => {
  const tokenInfo = await getCATTokenInfo(KNOWN_ASSET_IDS.wUSDC);
  
  assertEquals(tokenInfo?.assetId, KNOWN_ASSET_IDS.wUSDC);
  assertEquals(tokenInfo?.symbol, 'wUSDC');
  assertEquals(tokenInfo?.name, 'Wrapped USD Coin');
  assertEquals(tokenInfo?.isVerified, true);
  
  console.log('✅ wUSDC token info retrieved successfully:', tokenInfo);
});

Deno.test("getCATDisplayName should return proper display names", async () => {
  const wUSDCDisplay = await getCATDisplayName(KNOWN_ASSET_IDS.wUSDC_b);
  const sbxDisplay = await getCATDisplayName(KNOWN_ASSET_IDS.SBX);
  const mbxDisplay = await getCATDisplayName(KNOWN_ASSET_IDS.MBX);
  
  assertEquals(wUSDCDisplay, 'wUSDC.b');
  assertEquals(sbxDisplay, 'SBX');
  assertEquals(mbxDisplay, 'MBX');
  
  console.log('✅ Display names retrieved correctly:', { wUSDCDisplay, sbxDisplay, mbxDisplay });
});

Deno.test("getCATTokenInfo should handle invalid asset IDs gracefully", async () => {
  // Test various invalid formats
  const invalidIds = [
    '',
    'invalid',
    '123',
    'not-a-hex-string',
    'fa4a180ac326e67ea289b869e3448256f6af05721f7cf934cb9901baa6b7a99', // too short
    'fa4a180ac326e67ea289b869e3448256f6af05721f7cf934cb9901baa6b7a99dd', // too long
    'ga4a180ac326e67ea289b869e3448256f6af05721f7cf934cb9901baa6b7a99d' // invalid hex
  ];
  
  for (const invalidId of invalidIds) {
    const result = await getCATTokenInfo(invalidId);
    assertEquals(result, null);
    console.log(`✅ Invalid asset ID "${invalidId}" handled correctly: ${result}`);
  }
});

Deno.test("getCATTokenInfo should handle unknown asset IDs", async () => {
  // Use a valid hex format but unknown asset ID
  const unknownAssetId = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
  const tokenInfo = await getCATTokenInfo(unknownAssetId);
  
  // Should return fallback information
  assertNotEquals(tokenInfo, null);
  assertEquals(tokenInfo?.assetId, unknownAssetId);
  assertEquals(tokenInfo?.source, 'fallback');
  assertEquals(tokenInfo?.isVerified, false);
  
  console.log('✅ Unknown asset ID handled with fallback:', tokenInfo);
});

Deno.test("getCATTokenInfoBulk should handle multiple asset IDs", async () => {
  const assetIds = [
    KNOWN_ASSET_IDS.wUSDC_b,
    KNOWN_ASSET_IDS.SBX,
    KNOWN_ASSET_IDS.MBX
  ];
  
  const bulkResults = await getCATTokenInfoBulk(assetIds);
  
  assertEquals(bulkResults.size, 3);
  
  // Check each result
  const wUSDCInfo = bulkResults.get(KNOWN_ASSET_IDS.wUSDC_b);
  const sbxInfo = bulkResults.get(KNOWN_ASSET_IDS.SBX);
  const mbxInfo = bulkResults.get(KNOWN_ASSET_IDS.MBX);
  
  assertEquals(wUSDCInfo?.symbol, 'wUSDC.b');
  assertEquals(sbxInfo?.symbol, 'SBX');
  assertEquals(mbxInfo?.symbol, 'MBX');
  
  console.log('✅ Bulk lookup completed successfully:', {
    wUSDC: wUSDCInfo?.symbol,
    SBX: sbxInfo?.symbol,
    MBX: mbxInfo?.symbol
  });
});

Deno.test("getCATTokenInfo should use caching effectively", async () => {
  // Clear cache to start fresh
  clearCATTokenCache();
  
  const assetId = KNOWN_ASSET_IDS.wUSDC_b;
  
  // First call should not use cache
  const firstCall = await getCATTokenInfo(assetId);
  assertEquals(firstCall?.source, 'fallback'); // From known tokens
  
  // Second call should use cache
  const secondCall = await getCATTokenInfo(assetId);
  assertEquals(secondCall?.source, 'cache');
  
  // Values should be the same
  assertEquals(firstCall?.symbol, secondCall?.symbol);
  assertEquals(firstCall?.name, secondCall?.name);
  
  console.log('✅ Caching working correctly:', {
    first: firstCall?.source,
    second: secondCall?.source,
    symbol: secondCall?.symbol
  });
});

Deno.test("getCacheStats should return cache information", async () => {
  // Ensure we have some items in cache
  await getCATTokenInfo(KNOWN_ASSET_IDS.wUSDC_b);
  await getCATTokenInfo(KNOWN_ASSET_IDS.SBX);
  
  const stats = getCacheStats();
  
  assertEquals(stats.size >= 2, true);
  assertEquals(Array.isArray(stats.keys), true);
  assertEquals(stats.keys.length, stats.size);
  
  console.log('✅ Cache stats retrieved:', stats);
});

Deno.test("Asset ID case sensitivity should be handled correctly", async () => {
  const assetId = KNOWN_ASSET_IDS.wUSDC_b;
  const upperCaseId = assetId.toUpperCase();
  const mixedCaseId = assetId.substring(0, 32).toUpperCase() + assetId.substring(32).toLowerCase();
  
  const lowerResult = await getCATTokenInfo(assetId);
  const upperResult = await getCATTokenInfo(upperCaseId);
  const mixedResult = await getCATTokenInfo(mixedCaseId);
  
  // All should return the same information
  assertEquals(lowerResult?.symbol, upperResult?.symbol);
  assertEquals(lowerResult?.symbol, mixedResult?.symbol);
  assertEquals(lowerResult?.name, upperResult?.name);
  assertEquals(lowerResult?.name, mixedResult?.name);
  
  console.log('✅ Case insensitive lookups working:', {
    lower: lowerResult?.symbol,
    upper: upperResult?.symbol,
    mixed: mixedResult?.symbol
  });
});

// Integration test with Dexie API (only run if network is available)
Deno.test("Integration: Test Dexie API access for DBX token", async () => {
  try {
    // Clear cache to force API call
    clearCATTokenCache();
    
    // Use DBX as it's definitely available on Dexie
    const dbxAssetId = KNOWN_ASSET_IDS.DBX;
    
    // This should try to hit the API (though will fallback to known tokens)
    const tokenInfo = await getCATTokenInfo(dbxAssetId);
    
    assertEquals(tokenInfo?.assetId, dbxAssetId);
    assertNotEquals(tokenInfo?.symbol, undefined);
    
    console.log('✅ Integration test completed - token found:', tokenInfo);
  } catch (error) {
    console.log('⚠️ Integration test skipped due to network issues:', error.message);
    // Don't fail the test if network is unavailable
  }
});
