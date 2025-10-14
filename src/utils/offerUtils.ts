// Utility functions for Chia offer handling and validation

import type {
  AssetItem,
  DexieApiResponse,
  DexieOfferItem,
  DexieOfferResponse,
  DexieOfferSummary,
  NFTItem,
} from '../types/index.ts';

// Base58 encoding utilities
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

// Bech32m encoding utilities
const BECH32_CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
const BECH32M_CONST = 0x2bc830a3;

/**
 * Bech32m polymod function for checksum calculation
 */
function bech32Polymod(values: number[]): number {
  const GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  let chk = 1;
  for (const value of values) {
    const top = chk >> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ value;
    for (let i = 0; i < 5; i++) {
      if ((top >> i) & 1) {
        chk ^= GEN[i];
      }
    }
  }
  return chk;
}

/**
 * Create bech32m checksum
 */
function bech32CreateChecksum(prefix: string, data: number[]): number[] {
  const values = [...prefix.split('').map((c) => c.charCodeAt(0) >> 5)]
    .concat([0])
    .concat(prefix.split('').map((c) => c.charCodeAt(0) & 31))
    .concat(data)
    .concat([0, 0, 0, 0, 0, 0]);
  const polymod = bech32Polymod(values) ^ BECH32M_CONST;
  const checksum: number[] = [];
  for (let i = 0; i < 6; i++) {
    checksum.push((polymod >> (5 * (5 - i))) & 31);
  }
  return checksum;
}

/**
 * Convert 8-bit bytes to 5-bit values
 */
function convertBits(
  data: Uint8Array,
  fromBits: number,
  toBits: number,
  pad: boolean,
): number[] | null {
  let acc = 0;
  let bits = 0;
  const result: number[] = [];
  const maxv = (1 << toBits) - 1;

  // Use index iteration to avoid iterator issues
  for (let i = 0; i < data.length; i++) {
    const value = data[i];
    acc = (acc << fromBits) | value;
    bits += fromBits;
    while (bits >= toBits) {
      bits -= toBits;
      result.push((acc >> bits) & maxv);
    }
  }

  if (pad) {
    if (bits > 0) {
      result.push((acc << (toBits - bits)) & maxv);
    }
  } else if (bits >= fromBits || (acc << (toBits - bits)) & maxv) {
    return null;
  }

  return result;
}

/**
 * Encode data to bech32m format
 */
function encodeBech32m(prefix: string, data: Uint8Array): string {
  const fiveBitData = convertBits(data, 8, 5, true);
  if (!fiveBitData) {
    throw new Error('Failed to convert bits');
  }
  const checksum = bech32CreateChecksum(prefix, fiveBitData);
  const combined = fiveBitData.concat(checksum);
  return prefix + '1' + combined.map((d) => BECH32_CHARSET[d]).join('');
}

/**
 * Convert hex string to bech32m encoded address
 * @param hexString The hex string (with or without 0x prefix)
 * @param prefix The bech32m prefix (e.g., 'nft', 'col')
 * @returns Bech32m encoded string
 */
function hexToBech32m(hexString: string, prefix: string): string {
  // Remove 0x prefix if present
  const hex = hexString.startsWith('0x') ? hexString.slice(2) : hexString;

  // Convert hex to bytes
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }

  return encodeBech32m(prefix, bytes);
}

/**
 * Encodes a Uint8Array to Base58 string
 * @param bytes The bytes to encode
 * @returns Base58 encoded string
 */
function encodeBase58(bytes: Uint8Array): string {
  if (bytes.length === 0) return '';

  // Convert bytes to a big integer
  let num = BigInt(0);
  for (let i = 0; i < bytes.length; i++) {
    num = num * BigInt(256) + BigInt(bytes[i]);
  }

  // Convert to base58
  let result = '';
  while (num > BigInt(0)) {
    const remainder = Number(num % BigInt(58));
    result = BASE58_ALPHABET[remainder] + result;
    num = num / BigInt(58);
  }

  // Add leading '1's for leading zero bytes
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] === 0) {
      result = '1' + result;
    } else {
      break;
    }
  }

  return result;
}

/**
 * Converts an offer string to its ID
 * @param offerString The bech32-encoded offer string (starts with 'offer1')
 * @returns The Base58-encoded offer ID, or null if conversion fails
 */
export async function offerStringToId(offerString: string): Promise<string | null> {
  try {
    // Validate that it's an offer string
    if (!offerString || !offerString.toLowerCase().startsWith('offer1')) {
      return null;
    }

    // Normalize to lowercase (bech32 standard)
    const normalizedOffer = offerString.toLowerCase();

    // Convert the offer string to UTF-8 bytes
    const encoder = new TextEncoder();
    const offerBytes = encoder.encode(normalizedOffer);

    // Hash the bytes with SHA256
    const hashBuffer = await crypto.subtle.digest('SHA-256', offerBytes);
    const hashArray = new Uint8Array(hashBuffer);

    // Encode the hash in Base58
    const offerId = encodeBase58(hashArray);

    return offerId;
  } catch (error) {
    console.error('Error converting offer string to ID:', error);
    return null;
  }
}

/**
 * Checks if a string is a 44-character base64 offer ID
 * @param value The string to check
 * @returns True if the value is a valid offer ID format
 */
export function isOfferId(value: string): boolean {
  return value.length === 44 && !value.startsWith('offer1') && /^[A-Za-z0-9+/]+$/.test(value);
}

/**
 * Extracts offer ID from MintGarden or Dexie URL
 * @param url The URL to parse
 * @returns The extracted offer ID or null if not found
 */
export function extractOfferIdFromUrl(url: string): string | null {
  try {
    // Match URLs like:
    // https://mintgarden.io/offers/AqtaxKUF7UV4WKAYGr24frVMzt6xWWahTc4Xwc8EmhiK
    // https://dexie.space/offers/AqtaxKUF7UV4WKAYGr24frVMzt6xWWahTc4Xwc8EmhiK
    const urlPattern = /^https?:\/\/(mintgarden\.io|dexie\.space)\/offers\/([A-Za-z0-9+/]{44})$/;
    const match = url.match(urlPattern);

    if (match && match[2]) {
      return match[2];
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Fetches full offer string from offer ID using Dexie and MintGarden APIs
 * @param offerId The 44-character offer ID
 * @param timeoutMs Request timeout in milliseconds (default: 10000)
 * @returns The full offer string or null if fetch fails
 */
export async function fetchOfferFromId(offerId: string, timeoutMs = 10000): Promise<string | null> {
  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // Try Dexie API first
    try {
      const dexieResponse = await fetch(`https://api.dexie.space/v1/offers/${offerId}`, {
        signal: controller.signal,
      });
      if (dexieResponse.ok) {
        const data = await dexieResponse.json();
        if (data.success && data.offer && data.offer.offer) {
          return data.offer.offer;
        }
      }
    } catch (error) {
      console.warn('Dexie API failed:', error);
    }

    // Try MintGarden API as fallback
    try {
      const mintgardenResponse = await fetch(`https://api.mintgarden.io/offers/${offerId}/bech32`, {
        signal: controller.signal,
      });
      if (mintgardenResponse.ok) {
        const offerString = await mintgardenResponse.text();
        // Remove quotes if present
        const cleanedOffer = offerString.replace(/^"|"$/g, '');
        if (cleanedOffer.startsWith('offer1')) {
          return cleanedOffer;
        }
      }
    } catch (error) {
      console.warn('MintGarden API failed:', error);
    }

    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Cache for fetched offers to prevent duplicate API calls
 */
const offerCache = new Map<string, { offer: string; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Fetches offer from ID with caching support
 * @param offerId The 44-character offer ID
 * @param timeoutMs Request timeout in milliseconds (default: 10000)
 * @returns The full offer string or null if fetch fails
 */
export async function fetchOfferFromIdCached(
  offerId: string,
  timeoutMs = 10000,
): Promise<string | null> {
  // Check cache first
  const cached = offerCache.get(offerId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.offer;
  }

  // Fetch and cache
  const offer = await fetchOfferFromId(offerId, timeoutMs);
  if (offer) {
    offerCache.set(offerId, { offer, timestamp: Date.now() });
  }

  return offer;
}

/**
 * Clears the offer cache
 */
export function clearOfferCache(): void {
  offerCache.clear();
}

/**
 * Cache for Dexie API offer details to prevent duplicate requests
 */
const dexieOfferCache = new Map<string, { data: DexieOfferResponse; timestamp: number }>();
const DEXIE_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Clears the Dexie offer cache
 */
export function clearDexieOfferCache(): void {
  dexieOfferCache.clear();
}

/**
 * Parses offer items (offered or requested) from Dexie API format
 * @param items Array of DexieOfferItem from the API
 * @returns Parsed array of NFTItem or AssetItem
 */
function parseOfferItems(items: DexieOfferItem[]): Array<NFTItem | AssetItem> {
  return items.map((item) => {
    if (item['is_nft']) {
      // Convert hex IDs to bech32m format for MintGarden URLs
      let nftId: string | null = null;
      let collectionId: string | null = null;

      try {
        if (item.id) {
          nftId = hexToBech32m(item.id, 'nft');
        }
      } catch (error) {
        console.error('Failed to encode NFT ID:', item.id, error);
        // Keep nftId as null - UI will handle missing link gracefully
        // Future enhancement: Could add a flag to NFTItem to indicate encoding failure
      }

      try {
        if (item.collection?.id) {
          collectionId = hexToBech32m(item.collection.id, 'col');
        }
      } catch (error) {
        console.error('Failed to encode collection ID:', item.collection?.id, error);
        // Keep collectionId as null - UI will display name without link
      }

      return {
        type: 'nft' as const,
        name: item.name || 'Unknown NFT',
        nftId,
        collectionName: item.collection?.name || 'Unknown Collection',
        collectionId,
        thumbnail: item.preview?.medium || null,
        royaltyPercent: item['nft_data']?.royalty ? item['nft_data'].royalty / 100 : 0,
      };
    }
    return {
      type: 'asset' as const,
      code: item.code || item.id || 'UNKNOWN',
      amount: item.amount || 0,
    };
  });
}

/**
 * Extracts simplified summary from Dexie API response
 * @param data The raw Dexie API response
 * @returns DexieOfferSummary with offered and requested items
 */
function extractOfferSummary(data: DexieApiResponse): DexieOfferSummary {
  const offered = data.offer?.offered ? parseOfferItems(data.offer.offered) : [];
  const requested = data.offer?.requested ? parseOfferItems(data.offer.requested) : [];

  return {
    offeredCount: offered.length,
    requestedCount: requested.length,
    offered,
    requested,
  };
}

/**
 * Fetches offer details from Dexie API and returns simplified metadata
 *
 * @param offerId The 44-character Base58-encoded offer ID
 * @param timeoutMs Request timeout in milliseconds (default: 10000)
 * @returns DexieOfferResponse with:
 *   - success: boolean indicating if the request succeeded
 *   - error: error message if success is false
 *   - summary: simplified metadata including:
 *     - offeredCount/requestedCount: number of items
 *     - offered/requested: arrays of NFTItem or AssetItem
 *       - NFT items include royaltyPercent as a percentage (5 = 5%, not 500 basis points)
 *       - thumbnail may be null if not available
 *   - rawResponse: complete API response for advanced usage
 *
 * @example
 * ```typescript
 * const result = await fetchDexieOfferDetails('HR7aHbCXsJto7iS9uBkiiGJx6iGySxoNqUGQvrZfnj6B');
 * if (result.success) {
 *   console.log(`Offered: ${result.summary.offeredCount} items`);
 *   for (const item of result.summary.offered) {
 *     if (item.type === 'nft') {
 *       console.log(`NFT: ${item.name} - Royalty: ${item.royaltyPercent}%`);
 *     } else {
 *       console.log(`${item.amount} ${item.code}`);
 *     }
 *   }
 * }
 * ```
 */
export async function fetchDexieOfferDetails(
  offerId: string,
  timeoutMs = 10000,
): Promise<DexieOfferResponse> {
  // Validate offer ID format
  if (!offerId || offerId.length !== 44) {
    return {
      success: false,
      error: 'Invalid offer ID format (expected 44-character Base58 string)',
      rawResponse: null,
    };
  }

  // Check cache first
  const cached = dexieOfferCache.get(offerId);
  if (cached && Date.now() - cached.timestamp < DEXIE_CACHE_TTL_MS) {
    return cached.data;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`https://api.dexie.space/v1/offers/${offerId}`, {
      signal: controller.signal,
    });

    // Handle non-200 responses
    if (!response.ok) {
      const errorText = await response.text();
      const errorResponse: DexieOfferResponse = {
        success: false,
        error: `HTTP ${response.status}: ${errorText || response.statusText}`,
        rawResponse: { status: response.status, statusText: response.statusText },
      };
      return errorResponse;
    }

    // Parse JSON with error handling
    let data: DexieApiResponse;
    try {
      data = await response.json();
    } catch (_jsonError) {
      return {
        success: false,
        error: 'Invalid JSON response from Dexie API',
        rawResponse: null,
      };
    }

    // Handle 200 response with success: false
    if (!data.success) {
      const errorResponse: DexieOfferResponse = {
        success: false,
        error: data['error_message'] || 'Unknown error from Dexie API',
        rawResponse: data,
      };
      return errorResponse;
    }

    // Extract summary from successful response
    const summary = extractOfferSummary(data);

    const successResponse: DexieOfferResponse = {
      success: true,
      summary,
      rawResponse: data,
      offerId,
    };

    // Log raw response to console for debugging
    console.log(`Dexie offer data for ${offerId}:`, data);

    // Cache successful response
    dexieOfferCache.set(offerId, { data: successResponse, timestamp: Date.now() });

    return successResponse;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: false,
        error: `Request timeout after ${timeoutMs}ms`,
        rawResponse: null,
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      rawResponse: null,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
