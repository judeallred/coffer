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

export interface ToastData {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}
