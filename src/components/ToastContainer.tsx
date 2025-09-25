import { useState, useEffect } from 'preact/hooks';
import styled from 'styled-components';
import type { ToastData } from '../types/index.ts';

const Container = styled.div`
  position: fixed;
  top: var(--spacing-lg);
  right: var(--spacing-lg);
  z-index: 1100;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
`;

const Toast = styled.div<{ $type: 'success' | 'error' | 'info' | 'warning'; $isVisible: boolean }>`
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-sm);
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  max-width: 400px;
  border: 1px solid;
  transform: ${props => props.$isVisible ? 'translateX(0)' : 'translateX(100%)'};
  opacity: ${props => props.$isVisible ? 1 : 0};
  transition: all 0.3s ease;

  ${props => {
    switch (props.$type) {
      case 'success':
        return `
          background-color: #f0fdf4;
          border-color: #bbf7d0;
          color: #166534;
        `;
      case 'error':
        return `
          background-color: #fef2f2;
          border-color: #fecaca;
          color: #991b1b;
        `;
      case 'warning':
        return `
          background-color: #fefbf2;
          border-color: #fed7aa;
          color: #92400e;
        `;
      case 'info':
        return `
          background-color: #f0f9ff;
          border-color: #bfdbfe;
          color: #1e40af;
        `;
      default:
        return `
          background-color: var(--color-surface);
          border-color: var(--color-border);
          color: var(--color-text);
        `;
    }
  }}
`;

const ToastIcon = styled.div`
  font-size: 1.25rem;
  line-height: 1;
  flex-shrink: 0;
  margin-top: 1px;
`;

const ToastContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const ToastMessage = styled.div`
  font-size: 0.875rem;
  font-weight: 500;
  line-height: 1.4;
  word-break: break-word;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: currentColor;
  cursor: pointer;
  padding: var(--spacing-xs);
  border-radius: var(--radius-sm);
  font-size: 1rem;
  line-height: 1;
  opacity: 0.6;
  flex-shrink: 0;

  &:hover {
    opacity: 1;
  }

  &:focus {
    outline: none;
    opacity: 1;
  }
`;


interface ToastItemProps {
  toast: ToastData;
  onDismiss: (id: string) => void;
}

const getToastIcon = (type: 'success' | 'error' | 'info' | 'warning'): string => {
  switch (type) {
    case 'success': return '✅';
    case 'error': return '❌';
    case 'warning': return '⚠️';
    case 'info': return 'ℹ️';
    default: return '📝';
  }
};

function ToastItem({ toast, onDismiss }: ToastItemProps): JSX.Element {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show animation
    const showTimer = setTimeout(() => setIsVisible(true), 10);

    // Auto-dismiss after duration
    const dismissTimer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onDismiss(toast.id), 300);
    }, toast.duration || 5000);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(dismissTimer);
    };
  }, [toast.id, toast.duration, onDismiss]);

  const handleClose = (): void => {
    setIsVisible(false);
    setTimeout(() => onDismiss(toast.id), 300);
  };

  return (
    <Toast $type={toast.type} $isVisible={isVisible}>
      <ToastIcon>{getToastIcon(toast.type)}</ToastIcon>
      <ToastContent>
        <ToastMessage>{toast.message}</ToastMessage>
      </ToastContent>
      <CloseButton onClick={handleClose} aria-label="Dismiss">
        ×
      </CloseButton>
    </Toast>
  );
}

// Global toast state management
let toastId = 0;
const toastListeners: Set<(toasts: ToastData[]) => void> = new Set();
let toasts: ToastData[] = [];

const updateListeners = (): void => {
  toastListeners.forEach(listener => listener([...toasts]));
};

export const showToast = (message: string, type: ToastData['type'] = 'info', duration?: number): void => {
  const toast: ToastData = {
    id: (++toastId).toString(),
    message,
    type,
    duration,
  };
  
  toasts.push(toast);
  updateListeners();
};

export function ToastContainer(): JSX.Element {
  const [currentToasts, setCurrentToasts] = useState<ToastData[]>([]);

  useEffect(() => {
    const listener = (newToasts: ToastData[]): void => {
      setCurrentToasts(newToasts);
    };

    toastListeners.add(listener);
    return () => {
      toastListeners.delete(listener);
    };
  }, []);

  const handleDismiss = (id: string): void => {
    toasts = toasts.filter(toast => toast.id !== id);
    updateListeners();
  };

  return (
    <Container>
      {currentToasts.map(toast => (
        <ToastItem 
          key={toast.id}
          toast={toast} 
          onDismiss={handleDismiss}
        />
      ))}
    </Container>
  );
}
