// TypeScript type definitions for Chia Wallet SDK WASM module

/**
 * Represents a coin in the Chia blockchain
 */
export interface Coin {
  coinName: Uint8Array;
  parentCoinInfo?: Uint8Array;
  puzzleHash?: Uint8Array;
  amount?: bigint;
}

/**
 * Represents a coin spend in a transaction
 */
export interface CoinSpend {
  coin: Coin;
  puzzleReveal?: Uint8Array;
  solution?: Uint8Array;
}

/**
 * BLS signature type
 */
export interface Signature {
  // The signature is typically represented as bytes
  toBytes(): Uint8Array;
}

/**
 * Static methods for Signature
 */
export interface SignatureConstructor {
  /**
   * Creates an infinity signature (used when no signatures are present)
   */
  infinity(): Signature;

  /**
   * Aggregates multiple BLS signatures into one
   */
  aggregate(signatures: Signature[]): Signature;
}

/**
 * Represents a spend bundle (collection of coin spends and aggregated signature)
 */
export interface SpendBundle {
  coinSpends: CoinSpend[];
  aggregatedSignature: Signature;
}

/**
 * Constructor for SpendBundle
 */
export interface SpendBundleConstructor {
  new (coinSpends: CoinSpend[], aggregatedSignature: Signature): SpendBundle;
}

/**
 * Main Chia Wallet SDK WASM module interface
 */
export interface ChiaWalletSDK {
  /**
   * Initializes the WASM module (if available as default export)
   * Uses fetch() + ArrayBuffer to avoid MIME type issues
   */
  default?: () => Promise<void>;

  /**
   * Alternative initialization method
   */
  init?: () => Promise<void>;

  /**
   * Custom initialization method using ArrayBuffer
   */
  initWasm?: () => Promise<void>;

  /**
   * Sets up panic hook for better error messages
   */
  setPanicHook?: () => void;

  /**
   * Decodes an offer string into a SpendBundle
   */
  decodeOffer(offerString: string): SpendBundle;

  /**
   * Encodes a SpendBundle back into an offer string
   */
  encodeOffer(spendBundle: SpendBundle): string;

  /**
   * Signature constructor
   */
  Signature: SignatureConstructor;

  /**
   * SpendBundle constructor
   */
  SpendBundle: SpendBundleConstructor;
}
