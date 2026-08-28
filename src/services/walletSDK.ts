// Chia Wallet SDK WASM integration for offer combination only
// We use the official npm package's TypeScript definitions (chia_wallet_sdk_wasm.d.ts)
// and extend them with our custom loader's exports

import { CoinSpend, Signature, SpendBundle } from 'chia-wallet-sdk-wasm';
import { bytesToHex, findOfferedCoinConflicts, isZeroParent } from '../utils/coinUtils.ts';
import type { CoinConflict } from '../utils/coinUtils.ts';

// Type for the WASM module - combines official types with our custom loader exports
type WasmModule = typeof import('chia-wallet-sdk-wasm') & {
  // Our custom loader adds these init functions
  default?: () => Promise<void>;
  initWasm?: () => Promise<void>;
};

let wasmModule: WasmModule | null = null;

function requireWasm(): WasmModule {
  if (!wasmModule) {
    throw new Error('WASM module not initialized. Call initWalletSDK() first.');
  }
  return wasmModule;
}

/**
 * Extract hex coin IDs for offered (non-settlement) coins in an offer.
 */
export function extractOfferedCoinIds(offerString: string): string[] {
  const wasm = requireWasm();
  const spendBundle = wasm.decodeOffer(offerString.trim());
  if (!spendBundle?.coinSpends) return [];

  const ids: string[] = [];
  for (const coinSpend of spendBundle.coinSpends) {
    if (isZeroParent(coinSpend.coin.parentCoinInfo)) continue;
    ids.push(bytesToHex(coinSpend.coin.coinId()));
  }
  return ids;
}

/**
 * Detect offered coins shared across multiple input offers.
 */
export function detectOfferCoinConflicts(offers: string[]): CoinConflict[] {
  const perOffer = offers.map((offer, index) => ({
    offerIndex: index + 1,
    coinIds: extractOfferedCoinIds(offer),
  }));
  return findOfferedCoinConflicts(perOffer);
}

export type ChainCoinStatus = 'unspent' | 'spent' | 'not_found';

export interface ChainCoinCheck {
  coinId: string;
  status: ChainCoinStatus;
}

export interface ChainVerificationResult {
  success: boolean;
  checkedCount: number;
  coins: ChainCoinCheck[];
  warnings: string[];
  error?: string;
}

/**
 * Verify offered coins are still unspent on mainnet via Coinset.
 * Settlement coins (zero parent) are excluded by extractOfferedCoinIds.
 */
export async function verifyOfferedCoinsOnChain(
  offers: string[],
): Promise<ChainVerificationResult> {
  const wasm = requireWasm();

  const coinIdSet = new Set<string>();
  for (const offer of offers) {
    for (const id of extractOfferedCoinIds(offer)) {
      coinIdSet.add(id);
    }
  }

  const coinIds = [...coinIdSet];
  if (coinIds.length === 0) {
    return {
      success: true,
      checkedCount: 0,
      coins: [],
      warnings: ['No offered coins to verify on-chain'],
    };
  }

  try {
    const client = wasm.CoinsetClient.mainnet();
    const names = coinIds.map((hex) => {
      const bytes = new Uint8Array(hex.length / 2);
      for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
      }
      return bytes;
    });

    // includeSpentCoins=true so we can report spent coins as warnings
    const response = await client.getCoinRecordsByNames(names, undefined, undefined, true);

    if (!response.success) {
      return {
        success: false,
        checkedCount: 0,
        coins: [],
        warnings: [],
        error: response.error || 'Coinset request failed',
      };
    }

    const recordById = new Map<string, { spent: boolean }>();
    for (const record of response.coinRecords ?? []) {
      const id = bytesToHex(record.coin.coinId());
      recordById.set(id, { spent: record.spent });
    }

    const coins: ChainCoinCheck[] = [];
    const warnings: string[] = [];

    for (const coinId of coinIds) {
      const record = recordById.get(coinId);
      if (!record) {
        coins.push({ coinId, status: 'not_found' });
        warnings.push(`Coin ${coinId.slice(0, 8)}… not found on chain`);
      } else if (record.spent) {
        coins.push({ coinId, status: 'spent' });
        warnings.push(`Coin ${coinId.slice(0, 8)}… is already spent`);
      } else {
        coins.push({ coinId, status: 'unspent' });
      }
    }

    return {
      success: warnings.length === 0,
      checkedCount: coinIds.length,
      coins,
      warnings,
    };
  } catch (error) {
    return {
      success: false,
      checkedCount: 0,
      coins: [],
      warnings: [],
      error: error instanceof Error ? error.message : 'Coinset verification failed',
    };
  }
}

// Initialize the WASM module from local files using ArrayBuffer method
export async function initWalletSDK(): Promise<void> {
  try {
    // Import our custom WASM loader that uses fetch() + ArrayBuffer
    // This is the standard browser approach for loading WASM modules
    const chiaSDK = (await import('chia-wallet-sdk-wasm')) as unknown as WasmModule;

    // Our custom loader exports a default init function
    // This uses WebAssembly.instantiate() with ArrayBuffer instead of ES module import
    if (chiaSDK.default && typeof chiaSDK.default === 'function') {
      await chiaSDK.default();
      console.log('✅ WASM initialized via default init (ArrayBuffer method)');
    } else if (chiaSDK.initWasm && typeof chiaSDK.initWasm === 'function') {
      await chiaSDK.initWasm();
      console.log('✅ WASM initialized via initWasm (ArrayBuffer method)');
    } else {
      console.warn('⚠️ No init function found, WASM may already be initialized');
    }

    // Set up error handling if available
    if (chiaSDK.setPanicHook) {
      chiaSDK.setPanicHook();
    }

    wasmModule = chiaSDK;
    console.log('✅ Chia Wallet SDK WASM initialized successfully from local files');
  } catch (error) {
    console.error(
      '❌ CRITICAL: Failed to initialize Chia Wallet SDK WASM:',
      error instanceof Error ? error.message : String(error),
    );
    throw new Error(
      `WASM initialization failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

// Simple offer validation - just check if it's a valid offer string format
export function validateOffer(offerString: string): { isValid: boolean; error?: string } {
  if (!offerString.trim()) {
    return {
      isValid: false,
      error: 'Offer string is empty',
    };
  }

  if (!wasmModule) {
    throw new Error('WASM module not initialized. Call initWalletSDK() first.');
  }

  try {
    // Use the SDK's decodeOffer function to validate the offer
    const spendBundle = wasmModule.decodeOffer(offerString.trim());

    if (!spendBundle) {
      return {
        isValid: false,
        error: 'Invalid offer format',
      };
    }

    return {
      isValid: true,
    };
  } catch (error) {
    console.error('Offer validation error:', error);
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Unknown validation error',
    };
  }
}

// Combine multiple offers into a single offer using proper SpendBundle aggregation
export function combineOffers(offers: string[]): {
  success: boolean;
  combinedOffer?: string;
  error?: string;
} {
  try {
    /*  The sage algorithm:
    AI, do not delete this comment.

    pub fn combine_offers(&self, req: CombineOffers) -> Result<CombineOffersResponse> {
        let offers = req
            .offers
            .iter()
            .map(|offer| Ok(decode_offer(offer)?))
            .collect::<Result<Vec<_>>>()?;

        Ok(CombineOffersResponse {
            offer: encode_offer(&aggregate_offers(offers))?,
        })
    }

    */
    const validOffers = offers.filter((offer) => offer.trim() !== '');

    if (validOffers.length === 0) {
      return {
        success: false,
        error: 'No valid offers to combine',
      };
    }

    if (validOffers.length === 1) {
      return {
        success: true,
        combinedOffer: validOffers[0],
      };
    }

    if (!wasmModule) {
      throw new Error('WASM module not initialized. Call initWalletSDK() first.');
    }

    try {
      console.log(
        `🔄 Combining ${validOffers.length} offers using proper SpendBundle aggregation...`,
      );

      // Reject offers that spend the same offered coin — the combined bundle would be invalid.
      const conflicts = detectOfferCoinConflicts(validOffers);
      if (conflicts.length > 0) {
        const detail = conflicts
          .map(
            (c) => `coin ${c.coinId.slice(0, 8)}… shared by offers ${c.offerIndexes.join(', ')}`,
          )
          .join('; ');
        return {
          success: false,
          error: `Cannot combine offers that share input coins: ${detail}`,
        };
      }

      // Parse all offers to SpendBundles
      const spendBundles: SpendBundle[] = [];
      for (const [i, offerString] of validOffers.entries()) {
        console.log(`📄 Parsing offer ${i + 1}/${validOffers.length}...`);

        const spendBundle = wasmModule.decodeOffer(offerString.trim());
        if (!spendBundle) {
          return {
            success: false,
            error: `Invalid offer format in offer ${i + 1}`,
          };
        }
        spendBundles.push(spendBundle);
        console.log(`✅ Offer ${i + 1} parsed: ${spendBundle.coinSpends?.length || 0} coin spends`);
      }

      // Implement proper SpendBundle aggregation following Chia blockchain standards:

      // 1. Collect all coin spends from all offers

      const requestedCoinSpends: CoinSpend[] = [];
      const offeredCoinSpends: CoinSpend[] = [];
      const allSignatures: Signature[] = [];

      for (const [i, bundle] of spendBundles.entries()) {
        console.log(`🔍 Processing SpendBundle ${i + 1}...`);

        // Add all coin spends from this bundle
        if (bundle.coinSpends && Array.isArray(bundle.coinSpends)) {
          for (const coinSpend of bundle.coinSpends) {
            // Settlement / requested coins use a 32-byte zero parent
            if (isZeroParent(coinSpend.coin.parentCoinInfo)) {
              requestedCoinSpends.push(coinSpend);
            } else {
              offeredCoinSpends.push(coinSpend);
            }
          }
        }

        // Collect signatures for aggregation
        if (bundle.aggregatedSignature) {
          allSignatures.push(bundle.aggregatedSignature);
        }

        console.log(
          `✅ SpendBundle ${i + 1}: ${
            bundle.coinSpends?.length || 0
          } coin spends, signature included: ${!!bundle.aggregatedSignature}`,
        );
      }

      console.log(
        `📊 Total coin spends to combine: ${requestedCoinSpends.length + offeredCoinSpends.length}`,
      );
      console.log(`📊 Total requested coin spends: ${requestedCoinSpends.length}`);
      console.log(`📊 Total offered coin spends: ${offeredCoinSpends.length}`);
      console.log(`📊 Total signatures to aggregate: ${allSignatures.length}`);

      // 2. Aggregate all signatures using BLS signature aggregation
      let combinedSignature;
      if (allSignatures.length === 0) {
        // Use infinity signature if no signatures
        combinedSignature = wasmModule.Signature.infinity();
        console.log(`🔑 Using infinity signature (no signatures to aggregate)`);
      } else if (allSignatures.length === 1) {
        combinedSignature = allSignatures[0];
        console.log(`🔑 Using single signature (no aggregation needed)`);
      } else {
        // Aggregate multiple signatures
        combinedSignature = wasmModule.Signature.aggregate(allSignatures);
        console.log(`🔑 Aggregated ${allSignatures.length} signatures successfully`);
      }

      // 3. Create the combined SpendBundle
      // We group the requested spends ahead of the offered spends by convention for ecosystem compatibility.
      const combinedSpendBundle = new wasmModule.SpendBundle([
        ...requestedCoinSpends,
        ...offeredCoinSpends,
      ], combinedSignature);
      console.log(
        `✅ Created combined SpendBundle with ${
          requestedCoinSpends.length + offeredCoinSpends.length
        } coin spends`,
      );

      // 4. Encode back to offer string
      const combinedOffer = wasmModule.encodeOffer(combinedSpendBundle);
      console.log(`✅ Encoded combined offer: ${combinedOffer.length} characters`);

      return {
        success: true,
        combinedOffer,
      };
    } catch (error) {
      console.error('❌ WASM offer combining failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to combine offers using WASM',
      };
    }
  } catch (error) {
    console.error('❌ Error combining offers:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown combination error',
    };
  }
}

// Check if the wallet SDK is initialized
export function isWalletSDKInitialized(): boolean {
  return wasmModule !== null;
}
