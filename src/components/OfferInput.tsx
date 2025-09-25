import { useState, useEffect } from 'preact/hooks';
import type { Offer, OfferData } from '../types/index.ts';
import { OfferPreview } from './OfferPreview.tsx';
import { ErrorBox } from './ErrorBox.tsx';

interface OfferInputProps {
  offer: Offer;
  index: number;
  onUpdateContent: (content: string) => void;
  onValidationResult: (isValid: boolean, error?: string, parsedData?: OfferData) => void;
  onLogError: (message: string, type?: 'error' | 'warning' | 'info') => void;
}

export function OfferInput({ 
  offer, 
  index, 
  onUpdateContent, 
  onValidationResult, 
  onLogError 
}: OfferInputProps): JSX.Element {
  const [isValidating, setIsValidating] = useState(false);
  const [validationTimeout, setValidationTimeout] = useState<number | null>(null);

  const getStatusIndicator = (): { status: 'idle' | 'validating' | 'valid' | 'error'; icon: string; className: string } => {
    if (isValidating) return { status: 'validating', icon: '⏳', className: 'status-validating' };
    if (offer.error) return { status: 'error', icon: '✗', className: 'status-error' };
    if (offer.isValid && offer.content.trim()) return { status: 'valid', icon: '✓', className: 'status-valid' };
    return { status: 'idle', icon: index.toString(), className: 'status-idle' };
  };

  const validateOffer = async (content: string): Promise<void> => {
    if (!content.trim()) {
      onValidationResult(false);
      return;
    }

    setIsValidating(true);
    onLogError(`Validating offer ${index}...`, 'info');

    try {
      // Use Chia Wallet SDK WASM for real validation
      const { validateOffer } = await import('../services/walletSDK.ts');
      const result = await validateOffer(content);
      
      if (result.isValid && result.data) {
        onValidationResult(true, undefined, result.data);
        onLogError(`Offer ${index} validated successfully`, 'info');
      } else {
        onValidationResult(false, result.error || 'Invalid offer format');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown validation error';
      onValidationResult(false, errorMessage);
      onLogError(`Offer ${index} validation error: ${errorMessage}`, 'error');
    } finally {
      setIsValidating(false);
    }
  };

  const handleInputChange = (e: Event): void => {
    const target = e.target as HTMLTextAreaElement;
    const content = target.value;
    onUpdateContent(content);

    // Clear any existing timeout
    if (validationTimeout) {
      clearTimeout(validationTimeout);
    }

    // Set new timeout for validation (debounce)
    const timeout = setTimeout(() => {
      validateOffer(content);
    }, 800);

    setValidationTimeout(timeout);
  };

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (validationTimeout) {
        clearTimeout(validationTimeout);
      }
    };
  }, [validationTimeout]);

  const { status, icon, className } = getStatusIndicator();

  return (
    <div className="offer-input-container">
      <div className="offer-input-field">
        <label htmlFor={`offer-${offer.id}`} className="offer-input-label">
          Offer {index}
        </label>
        <textarea
          id={`offer-${offer.id}`}
          value={offer.content}
          onChange={handleInputChange}
          placeholder="Paste your Chia offer string here..."
          className={`offer-input-textarea ${
            offer.error ? 'has-error' : 
            offer.isValid && offer.content.trim() ? 'is-valid' : ''
          }`}
          disabled={isValidating}
        />
        <div className={`offer-status-indicator ${className}`}>
          {icon}
        </div>
      </div>

      {offer.error && <ErrorBox message={offer.error} />}
      
      {offer.isValid && offer.parsedData && (
        <OfferPreview data={offer.parsedData} />
      )}
    </div>
  );
}
