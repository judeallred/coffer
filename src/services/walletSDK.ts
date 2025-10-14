// Chia Wallet SDK WASM integration for offer combination only
// We use the official npm package's TypeScript definitions (chia_wallet_sdk_wasm.d.ts)
// and extend them with our custom loader's exports

// Type for the WASM module - combines official types with our custom loader exports
type WasmModule = typeof import('chia-wallet-sdk-wasm') & {
  // Our custom loader adds these init functions
  default?: () => Promise<void>;
  initWasm?: () => Promise<void>;
};

let wasmModule: WasmModule | null = null;

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

      // Parse all offers to SpendBundles
      const spendBundles = [];
      for (let i = 0; i < validOffers.length; i++) {
        const offerString = validOffers[i];
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
      const allCoinSpends = [];
      const allSignatures = [];

      for (let i = 0; i < spendBundles.length; i++) {
        const bundle = spendBundles[i];
        console.log(`🔍 Processing SpendBundle ${i + 1}...`);

        // Add all coin spends from this bundle
        if (bundle.coinSpends && Array.isArray(bundle.coinSpends)) {
          for (const coinSpend of bundle.coinSpends) {
            allCoinSpends.push(coinSpend);
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

      console.log(`📊 Total coin spends to combine: ${allCoinSpends.length}`);
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
      const combinedSpendBundle = new wasmModule.SpendBundle(allCoinSpends, combinedSignature);
      console.log(`✅ Created combined SpendBundle with ${allCoinSpends.length} coin spends`);

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
