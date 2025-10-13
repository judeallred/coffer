// Utility functions for Chia offer handling and validation

// Base58 encoding utilities
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

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
export async function fetchOfferFromId(
  offerId: string,
  timeoutMs = 10000,
): Promise<string | null> {
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
      const mintgardenResponse = await fetch(
        `https://api.mintgarden.io/offers/${offerId}/bech32`,
        {
          signal: controller.signal,
        },
      );
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
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
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
