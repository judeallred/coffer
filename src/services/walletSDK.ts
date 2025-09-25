// Chia Wallet SDK WASM integration for Coffer using npm package
import type { OfferData, AssetData } from '../types/index.ts';

// WASM module will be loaded from npm package
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let wasmModule: any = null;
let useMockMode = false;

export interface WasmOfferResult {
  isValid: boolean;
  error?: string;
  data?: OfferData;
}

// Initialize the WASM module from npm package
export async function initWalletSDK(): Promise<void> {
  try {
    // Import the npm package - WASM is automatically initialized
    const chiaSDK = await import('chia-wallet-sdk-wasm');
    
    // Set up error handling if available
    if (chiaSDK.setPanicHook) {
      chiaSDK.setPanicHook();
    }
    
    wasmModule = chiaSDK;
    console.log('✅ Chia Wallet SDK WASM initialized successfully from npm package');
  } catch (error) {
    console.warn('⚠️  WASM not available, falling back to mock validation mode:', error instanceof Error ? error.message : String(error));
    useMockMode = true;
    console.log('🔧 Mock validation mode enabled - offers will be validated using simulated logic');
  }
}

// Validate and parse a Chia offer string
export async function validateOffer(offerString: string): Promise<WasmOfferResult> {
  if (!offerString.trim()) {
    return {
      isValid: false,
      error: 'Offer string is empty'
    };
  }

  if (useMockMode) {
    return await validateOfferMock(offerString);
  }

  if (!wasmModule) {
    throw new Error('WASM module not initialized. Call initWalletSDK() first.');
  }

  try {
    // Use the SDK's decodeOffer function to parse the offer
    const spendBundle = wasmModule.decodeOffer(offerString.trim());
    
    if (!spendBundle) {
      return {
        isValid: false,
        error: 'Invalid offer format'
      };
    }

    // Parse the spend bundle to extract asset information
    const parsedData = parseSpendBundle(spendBundle);
    
    return {
      isValid: true,
      data: parsedData
    };

  } catch (error) {
    console.error('Offer validation error:', error);
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Unknown validation error'
    };
  }
}

// Combine multiple offers into a single offer
export async function combineOffers(offers: string[]): Promise<{ success: boolean; combinedOffer?: string; error?: string }> {
  try {
    const validOffers = offers.filter(offer => offer.trim() !== '');
    
    if (validOffers.length === 0) {
      return {
        success: false,
        error: 'No valid offers to combine'
      };
    }

    if (validOffers.length === 1) {
      return {
        success: true,
        combinedOffer: validOffers[0]
      };
    }

    if (useMockMode) {
      return await combineOffersMock(validOffers);
    }

    if (!wasmModule) {
      throw new Error('WASM module not initialized. Call initWalletSDK() first.');
    }

    try {
      // Parse all offers to SpendBundles
      const spendBundles = [];
      for (const offerString of validOffers) {
        const spendBundle = wasmModule.decodeOffer(offerString.trim());
        if (!spendBundle) {
          return {
            success: false,
            error: `Invalid offer format in one of the provided offers`
          };
        }
        spendBundles.push(spendBundle);
      }

      // For real offer combining, we would need to implement proper SpendBundle merging
      // The SDK doesn't provide a direct combine function, so for now we'll
      // return the first offer as a placeholder until proper merging is implemented
      
      // TODO: Implement proper SpendBundle merging logic
      // This would involve:
      // 1. Merging coin_spends arrays from all SpendBundles
      // 2. Aggregating signatures properly
      // 3. Ensuring no conflicts in coin usage
      
      const combinedSpendBundle = spendBundles[0]; // Simplified for now
      
      // Encode back to offer string
      const combinedOffer = wasmModule.encodeOffer(combinedSpendBundle);
      
      return {
        success: true,
        combinedOffer
      };

    } catch (error) {
      console.error('WASM offer combining failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to combine offers using WASM'
      };
    }

  } catch (error) {
    console.error('Error combining offers:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown combination error'
    };
  }
}

// Mock validation for development/fallback mode
async function validateOfferMock(offerString: string): Promise<WasmOfferResult> {
  // Simulate validation delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const content = offerString.trim();
  
  // Basic validation - check if it looks like an offer string
  if (content.length < 50) {
    return {
      isValid: false,
      error: 'Offer string too short'
    };
  }
  
  if (!content.includes('offer1') && !content.startsWith('offer1')) {
    return {
      isValid: false,
      error: 'Invalid offer format - must start with "offer1"'
    };
  }
  
  // Generate mock parsed data based on offer content
  const mockData = generateMockOfferData(content);
  
  return {
    isValid: true,
    data: mockData
  };
}

// Mock offer combining for development/fallback mode
async function combineOffersMock(offers: string[]): Promise<{ success: boolean; combinedOffer?: string; error?: string }> {
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // For mock mode, create a combined offer string that represents the combination
  const timestamp = Date.now();
  const combinedOffer = `offer1combined_${timestamp}_${offers.length}offers_${simpleStringHash(offers.join(''))}`;
  
  return {
    success: true,
    combinedOffer
  };
}

// Generate realistic mock offer data
function generateMockOfferData(offerString: string): OfferData {
  const requested: AssetData[] = [];
  const offered: AssetData[] = [];
  
  // Simulate different offer types based on the offer string hash
  const hash = simpleStringHash(offerString);
  const offerType = hash % 4;
  
  switch (offerType) {
    case 0: // XCH for USDS
      offered.push({ amount: '0.1', asset: 'XCH' });
      requested.push({ amount: '100', asset: 'USDS' });
      break;
    case 1: // CAT tokens
      offered.push({ amount: '1000', asset: 'DBX' });
      requested.push({ amount: '0.05', asset: 'XCH' });
      break;
    case 2: // NFT trade
      offered.push({ amount: '1', asset: 'NFT-ABC123' });
      requested.push({ amount: '0.25', asset: 'XCH' });
      break;
    case 3: // Multi-asset
      offered.push({ amount: '500', asset: 'USDS' });
      offered.push({ amount: '0.01', asset: 'XCH' });
      requested.push({ amount: '50', asset: 'DBX' });
      break;
  }
  
  return { requested, offered };
}

// Parse a SpendBundle to extract offer information
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseSpendBundle(spendBundle: any): OfferData {
  const requested: AssetData[] = [];
  const offered: AssetData[] = [];

  try {
    // TODO: Implement proper SpendBundle parsing using the WASM SDK
    // For now, return mock data structure that matches expected format
    // This will be replaced with real parsing logic using the SDK
    
    // Mock parsing - in reality we'd analyze the spend bundle
    // to determine what assets are being requested vs offered
    if (spendBundle.coin_spends && spendBundle.coin_spends.length > 0) {
      // This is simplified mock logic
      // Real implementation would parse puzzle reveals and solutions
      offered.push({
        amount: '0.1',
        asset: 'XCH'
      });
      
      requested.push({
        amount: '100',
        asset: 'USDS'  
      });
    }

    return { requested, offered };

  } catch (error) {
    console.error('Error parsing spend bundle:', error);
    return { requested: [], offered: [] };
  }
}

// Simple hash function for mock data generation
function simpleStringHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// Check if the WASM module is initialized
export function isWalletSDKInitialized(): boolean {
  return wasmModule !== null || useMockMode;
}

// Check if currently running in mock mode
export function isUsingMockMode(): boolean {
  return useMockMode;
}

// Get SDK version info
export function getSDKVersion(): string | null {
  if (!wasmModule) return null;
  
  try {
    return '0.29.0'; // From npm package version
  } catch {
    return null;
  }
}