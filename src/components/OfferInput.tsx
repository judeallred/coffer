import { useState, useEffect } from 'preact/hooks';
import styled from 'styled-components';
import type { Offer, OfferData } from '../types/index.ts';
import { OfferPreview } from './OfferPreview.tsx';
import { ErrorBox } from './ErrorBox.tsx';

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
`;

const InputContainer = styled.div`
  position: relative;
`;

const Label = styled.label`
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text);
  margin-bottom: var(--spacing-sm);
`;

const TextArea = styled.textarea<{ $isValid?: boolean; $hasError?: boolean }>`
  width: 100%;
  min-height: 120px;
  padding: var(--spacing-md);
  border: 2px solid ${props => 
    props.$hasError ? 'var(--color-error)' : 
    props.$isValid ? 'var(--color-success)' : 
    'var(--color-border)'
  };
  border-radius: var(--radius-md);
  font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
  font-size: 0.875rem;
  line-height: 1.4;
  resize: vertical;
  background-color: var(--color-surface);
  color: var(--color-text);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }

  &::placeholder {
    color: var(--color-text-light);
    opacity: 0.8;
  }

  &:disabled {
    background-color: var(--color-background);
    cursor: not-allowed;
    opacity: 0.6;
  }
`;

const StatusIndicator = styled.div<{ $status: 'idle' | 'validating' | 'valid' | 'error' }>`
  position: absolute;
  top: var(--spacing-md);
  right: var(--spacing-md);
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  
  ${props => {
    switch (props.$status) {
      case 'validating':
        return `
          background-color: var(--color-warning);
          color: white;
          animation: pulse 2s infinite;
        `;
      case 'valid':
        return `
          background-color: var(--color-success);
          color: white;
        `;
      case 'error':
        return `
          background-color: var(--color-error);
          color: white;
        `;
      default:
        return `
          background-color: var(--color-border);
          color: var(--color-text-light);
        `;
    }
  }}

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
`;

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

  const getStatusIndicator = (): { status: 'idle' | 'validating' | 'valid' | 'error'; icon: string } => {
    if (isValidating) return { status: 'validating', icon: '⏳' };
    if (offer.error) return { status: 'error', icon: '✗' };
    if (offer.isValid && offer.content.trim()) return { status: 'valid', icon: '✓' };
    return { status: 'idle', icon: index.toString() };
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

  const { status, icon } = getStatusIndicator();

  return (
    <Container>
      <InputContainer>
        <Label htmlFor={`offer-${offer.id}`}>
          Offer {index}
        </Label>
        <TextArea
          id={`offer-${offer.id}`}
          value={offer.content}
          onChange={handleInputChange}
          placeholder="Paste your Chia offer string here..."
          $isValid={offer.isValid && offer.content.trim() !== ''}
          $hasError={!!offer.error}
          disabled={isValidating}
        />
        <StatusIndicator $status={status}>
          {icon}
        </StatusIndicator>
      </InputContainer>

      {offer.error && <ErrorBox message={offer.error} />}
      
      {offer.isValid && offer.parsedData && (
        <OfferPreview data={offer.parsedData} />
      )}
    </Container>
  );
}
