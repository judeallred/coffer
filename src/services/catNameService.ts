// CAT Token Name Discovery Service using Dexie API
// Provides caching and fallback mechanisms for CAT token identification

import { getDexieCATToken, getDexieCATDisplayName } from './dexieTokenData.ts';

export interface CATTokenInfo {
  assetId: string;
  name?: string;
  symbol?: string;
  isVerified?: boolean;
  source: 'cache' | 'dexie_tickers' | 'fallback';
}

// Removed unused interfaces - now using dexieTokenData.ts

// In-memory cache for CAT token information
const catTokenCache = new Map<string, CATTokenInfo>();

// Known CAT tokens as fallback
const KNOWN_CATS: { [assetId: string]: CATTokenInfo } = {
  'fa4a180ac326e67ea289b869e3448256f6af05721f7cf934cb9901baa6b7a99d': {
    assetId: 'fa4a180ac326e67ea289b869e3448256f6af05721f7cf934cb9901baa6b7a99d',
    name: 'Wrapped USD Coin (Base)',
    symbol: 'wUSDC.b',
    isVerified: true,
    source: 'fallback'
  },
  'a628c1c2c6fcb74d53746157e438e108eab5c0bb3e5c80ff9b1910b3e4832913': {
    assetId: 'a628c1c2c6fcb74d53746157e438e108eab5c0bb3e5c80ff9b1910b3e4832913',
    name: 'Spacebucks',
    symbol: 'SBX',
    isVerified: true,
    source: 'fallback'
  },
  'e0005928763a7253a9c443d76837bdfab312382fc47cab85dad00be23ae4e82f': {
    assetId: 'e0005928763a7253a9c443d76837bdfab312382fc47cab85dad00be23ae4e82f',
    name: 'Marmot Bucks',
    symbol: 'MBX',
    isVerified: true,
    source: 'fallback'
  },
  'db1a9020d48d9d4ad22631b66ab4b9ebd3637ef7758ad38881348c5d24c38f20': {
    assetId: 'db1a9020d48d9d4ad22631b66ab4b9ebd3637ef7758ad38881348c5d24c38f20',
    name: 'Dexie Bucks',
    symbol: 'DBX',
    isVerified: true,
    source: 'fallback'
  },
  'bbb51b246fbec1da1305be31dcf17151ccd0b8231a1ec306d7ce9f5b8c742b9e': {
    assetId: 'bbb51b246fbec1da1305be31dcf17151ccd0b8231a1ec306d7ce9f5b8c742b9e',
    name: 'Wrapped USD Coin',
    symbol: 'wUSDC',
    isVerified: true,
    source: 'fallback'
  }
};

// Initialize cache with known tokens
for (const [assetId, info] of Object.entries(KNOWN_CATS)) {
  catTokenCache.set(assetId, info);
}

/**
 * Fetches CAT token information from Dexie tickers API
 */
async function fetchFromDexieTickers(assetId: string): Promise<CATTokenInfo | null> {
  try {
    const dexieToken = await getDexieCATToken(assetId);
    
    if (dexieToken) {
      return {
        assetId,
        name: dexieToken.name,
        symbol: dexieToken.symbol,
        isVerified: true, // Tokens on Dexie are considered verified
        source: 'dexie_tickers'
      };
    }
    
    return null;
  } catch (error) {
    console.warn(`Failed to fetch token info from Dexie tickers for ${assetId}:`, error);
    return null;
  }
}

/**
 * Gets CAT token information by asset ID with caching
 * 
 * @param assetId - The CAT token asset ID (hex string)
 * @returns Promise<CATTokenInfo | null> - Token information or null if not found
 */
export async function getCATTokenInfo(assetId: string): Promise<CATTokenInfo | null> {
  // Validate asset ID format
  if (!assetId || !/^[a-fA-F0-9]{64}$/.test(assetId)) {
    console.warn(`Invalid asset ID format: ${assetId}`);
    return null;
  }
  
  const normalizedAssetId = assetId.toLowerCase();
  
  // Check cache first
  if (catTokenCache.has(normalizedAssetId)) {
    const cached = catTokenCache.get(normalizedAssetId)!;
    console.log(`📋 Using cached CAT info for ${normalizedAssetId.substring(0, 8)}...: ${cached.symbol}`);
    return { ...cached, source: 'cache' };
  }
  
  console.log(`🔍 Discovering CAT token info for ${normalizedAssetId.substring(0, 8)}...`);
  
  // Try Dexie tickers API first
  let tokenInfo = await fetchFromDexieTickers(normalizedAssetId);
  
  // Cache the result (even if null, to avoid repeated failed requests)
  if (tokenInfo) {
    catTokenCache.set(normalizedAssetId, tokenInfo);
    console.log(`✅ Discovered CAT token: ${tokenInfo.symbol} (${tokenInfo.name}) via ${tokenInfo.source}`);
  } else {
    // Cache negative result with a generic entry
    const fallbackInfo: CATTokenInfo = {
      assetId: normalizedAssetId,
      name: `Unknown CAT ${normalizedAssetId.substring(0, 8)}...`,
      symbol: `CAT_${normalizedAssetId.substring(0, 6)}`,
      isVerified: false,
      source: 'fallback'
    };
    catTokenCache.set(normalizedAssetId, fallbackInfo);
    console.log(`❓ Unknown CAT token ${normalizedAssetId.substring(0, 8)}..., using fallback naming`);
    tokenInfo = fallbackInfo;
  }
  
  return tokenInfo;
}

/**
 * Gets the display name for a CAT token (symbol preferred, fallback to name)
 * 
 * @param assetId - The CAT token asset ID
 * @returns Promise<string> - The display name for the token
 */
export async function getCATDisplayName(assetId: string): Promise<string> {
  const tokenInfo = await getCATTokenInfo(assetId);
  
  if (!tokenInfo) {
    return `CAT ${assetId.substring(0, 8)}...`;
  }
  
  // Prefer symbol over name for display
  return tokenInfo.symbol || tokenInfo.name || `CAT ${assetId.substring(0, 8)}...`;
}

/**
 * Bulk lookup for multiple CAT tokens
 * 
 * @param assetIds - Array of CAT token asset IDs
 * @returns Promise<Map<string, CATTokenInfo | null>> - Map of asset ID to token info
 */
export async function getCATTokenInfoBulk(assetIds: string[]): Promise<Map<string, CATTokenInfo | null>> {
  const results = new Map<string, CATTokenInfo | null>();
  
  // Process in parallel for better performance
  const promises = assetIds.map(async (assetId) => {
    const info = await getCATTokenInfo(assetId);
    return { assetId, info };
  });
  
  const resolvedPromises = await Promise.all(promises);
  
  for (const { assetId, info } of resolvedPromises) {
    results.set(assetId.toLowerCase(), info);
  }
  
  return results;
}

/**
 * Clears the cache (useful for testing or if cache becomes stale)
 */
export function clearCATTokenCache(): void {
  catTokenCache.clear();
  
  // Re-initialize with known tokens
  for (const [assetId, info] of Object.entries(KNOWN_CATS)) {
    catTokenCache.set(assetId, info);
  }
  
  console.log('🗑️ CAT token cache cleared and re-initialized with known tokens');
}

/**
 * Gets current cache status for debugging
 */
export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: catTokenCache.size,
    keys: Array.from(catTokenCache.keys()).map(k => k.substring(0, 8) + '...')
  };
}
