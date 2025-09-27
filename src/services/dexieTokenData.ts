// Dexie Token Data Utility
// Fetches and caches CAT token information from Dexie API

export interface DexieTickerData {
  ticker_id: string;
  base_currency: string; // Asset ID
  target_currency: string;
  base_code: string; // Symbol/emoji
  target_code: string;
  base_name: string; // Full name
  target_name: string;
  last_price: string;
  // ... other price data we ignore
}

export interface DexieTickersResponse {
  success: boolean;
  tickers: DexieTickerData[];
}

export interface CATTokenData {
  assetId: string;
  symbol: string;
  name: string;
  source: 'dexie_tickers';
}

// Cache for token data
let tokenDataCache: Map<string, CATTokenData> | null = null;
let lastFetchTime: number = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Fetches token data from Dexie tickers API
 */
async function fetchDexieTokenData(): Promise<Map<string, CATTokenData>> {
  console.log('🌐 Fetching CAT token data from Dexie API...');
  
  try {
    const response = await fetch('https://api.dexie.space/v3/prices/tickers');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data: DexieTickersResponse = await response.json();
    
    if (!data.success || !Array.isArray(data.tickers)) {
      throw new Error('Invalid response format from Dexie API');
    }
    
    console.log(`📊 Processing ${data.tickers.length} tickers from Dexie...`);
    
    const tokenMap = new Map<string, CATTokenData>();
    
    for (const ticker of data.tickers) {
      // Only process tickers that are trading against XCH
      if (ticker.target_currency === 'xch' && ticker.base_currency) {
        const assetId = ticker.base_currency.toLowerCase();
        
        // Skip if asset ID doesn't look like a valid CAT asset ID (64 hex chars)
        if (!/^[a-f0-9]{64}$/.test(assetId)) {
          continue;
        }
        
        const tokenData: CATTokenData = {
          assetId,
          symbol: ticker.base_code || `CAT_${assetId.substring(0, 6)}`,
          name: ticker.base_name || `CAT ${assetId.substring(0, 8)}...`,
          source: 'dexie_tickers'
        };
        
        tokenMap.set(assetId, tokenData);
      }
    }
    
    console.log(`✅ Processed ${tokenMap.size} CAT tokens from Dexie tickers`);
    return tokenMap;
    
  } catch (error) {
    console.error('❌ Failed to fetch Dexie token data:', error);
    throw error;
  }
}

/**
 * Gets token data with caching (24 hour cache)
 */
async function getCachedTokenData(): Promise<Map<string, CATTokenData>> {
  const now = Date.now();
  
  // Return cached data if it's fresh
  if (tokenDataCache && (now - lastFetchTime) < CACHE_DURATION) {
    console.log('📋 Using cached Dexie token data');
    return tokenDataCache;
  }
  
  // Fetch fresh data
  try {
    tokenDataCache = await fetchDexieTokenData();
    lastFetchTime = now;
    return tokenDataCache;
  } catch (error) {
    // If we have stale cached data, use it as fallback
    if (tokenDataCache) {
      console.warn('⚠️ Using stale cached data due to fetch error:', error);
      return tokenDataCache;
    }
    
    // No cache available, return empty map
    console.error('❌ No cached data available, returning empty token map');
    return new Map<string, CATTokenData>();
  }
}

/**
 * Looks up a CAT token by asset ID
 */
export async function getDexieCATToken(assetId: string): Promise<CATTokenData | null> {
  if (!assetId || !/^[a-fA-F0-9]{64}$/.test(assetId)) {
    return null;
  }
  
  const normalizedAssetId = assetId.toLowerCase();
  const tokenData = await getCachedTokenData();
  
  return tokenData.get(normalizedAssetId) || null;
}

/**
 * Gets display name for a CAT token (prefers symbol over name)
 */
export async function getDexieCATDisplayName(assetId: string): Promise<string | null> {
  const tokenData = await getDexieCATToken(assetId);
  
  if (!tokenData) {
    return null;
  }
  
  // Prefer symbol, but fallback to name if symbol is generic
  if (tokenData.symbol && !tokenData.symbol.startsWith('CAT_')) {
    return tokenData.symbol;
  }
  
  return tokenData.name;
}

/**
 * Gets all available CAT tokens (for debugging/exploration)
 */
export async function getAllDexieCATTokens(): Promise<CATTokenData[]> {
  const tokenData = await getCachedTokenData();
  return Array.from(tokenData.values());
}

/**
 * Forces a refresh of the token data cache
 */
export async function refreshDexieTokenCache(): Promise<void> {
  console.log('🔄 Force refreshing Dexie token cache...');
  tokenDataCache = await fetchDexieTokenData();
  lastFetchTime = Date.now();
}

/**
 * Gets cache statistics
 */
export function getDexieCacheStats(): { size: number; lastFetch: Date | null; isStale: boolean } {
  const now = Date.now();
  const isStale = lastFetchTime > 0 && (now - lastFetchTime) > CACHE_DURATION;
  
  return {
    size: tokenDataCache ? tokenDataCache.size : 0,
    lastFetch: lastFetchTime > 0 ? new Date(lastFetchTime) : null,
    isStale
  };
}

/**
 * Bulk lookup for multiple asset IDs
 */
export async function getDexieCATTokensBulk(assetIds: string[]): Promise<Map<string, CATTokenData | null>> {
  const tokenData = await getCachedTokenData();
  const results = new Map<string, CATTokenData | null>();
  
  for (const assetId of assetIds) {
    const normalizedId = assetId.toLowerCase();
    results.set(normalizedId, tokenData.get(normalizedId) || null);
  }
  
  return results;
}
