// Core type definitions for Coffer

export interface Offer {
  id: string;
  content: string;
  isValid: boolean;
  error?: string;
}

export interface LogEntry {
  id: string;
  message: string;
  timestamp: Date;
  type: 'error' | 'warning' | 'info';
}

// Dexie API types
export interface NFTItem {
  type: 'nft';
  name: string;
  collectionName: string;
  thumbnail: string;
  royaltyPercent: number;
}

export interface AssetItem {
  type: 'asset';
  code: string;
  amount: number;
}

export interface DexieOfferSummary {
  offeredCount: number;
  requestedCount: number;
  offered: Array<NFTItem | AssetItem>;
  requested: Array<NFTItem | AssetItem>;
}

export interface DexieOfferResponse {
  success: boolean;
  error?: string;
  summary?: DexieOfferSummary;
  rawResponse: unknown;
}
