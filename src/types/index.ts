// Core type definitions for Coffer

export interface AssetData {
  amount: string;
  asset: string;
  icon?: string;
}

export interface OfferData {
  requested?: AssetData[];
  offered?: AssetData[];
}

export interface Offer {
  id: string;
  content: string;
  isValid: boolean;
  error?: string;
  parsedData?: OfferData;
}

export interface LogEntry {
  id: string;
  message: string;
  timestamp: Date;
  type: 'error' | 'warning' | 'info';
}

export interface ToastData {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}
