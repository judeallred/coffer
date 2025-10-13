// Core type definitions for Coffer

export interface Offer {
  id: string;
  content: string;
  isValid: boolean;
  error?: string;
  dexieData?: DexieOfferResponse;
  dexieLoading?: boolean;
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
  thumbnail: string | null;
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

// Raw Dexie API response structure
export interface DexieOfferItem {
  'is_nft'?: boolean;
  name?: string;
  code?: string;
  id?: string;
  amount?: number;
  collection?: {
    name?: string;
    id?: string;
    website?: string;
    twitter?: string;
  };
  preview?: {
    tiny?: string;
    medium?: string;
  };
  'nft_data'?: {
    royalty?: number;
    'data_uris'?: string[];
    'metadata_uris'?: string[];
    'data_hash'?: string;
    'metadata_hash'?: string;
  };
}

export interface DexieApiResponse {
  success: boolean;
  'error_message'?: string;
  offer?: {
    id?: string;
    status?: number;
    offer?: string;
    offered?: DexieOfferItem[];
    requested?: DexieOfferItem[];
    price?: number;
    fees?: number;
    'date_found'?: string;
    'date_completed'?: string | null;
    'date_pending'?: string | null;
  };
}
