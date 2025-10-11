import { useState, useEffect } from 'preact/hooks';
import type { Offer } from '../types/index.ts';

interface SimpleOfferInputsProps {
  offers: Offer[];
  onAddOffer: (content: string) => Promise<void>;
  onDeleteOffer: (id: string) => void;
  onClearAll: () => void;
}

export function SimpleOfferInputs({ 
  offers,
  onAddOffer,
  onDeleteOffer,
  onClearAll
}: SimpleOfferInputsProps): JSX.Element {
  const [inputValues, setInputValues] = useState<string[]>(['']);
  const [isValidating, setIsValidating] = useState<boolean[]>([]);

  // Initialize input values when offers change
  useEffect(() => {
    if (offers.length === 0) {
      setInputValues(['']);
      setIsValidating([]);
    } else {
      // Update input values to match offers
      const newInputValues = offers.map(offer => offer.content);
      setInputValues([...newInputValues, '']); // Add empty input at the end
      setIsValidating(new Array(newInputValues.length).fill(false));
    }
  }, [offers.length]);

  const handleInputChange = (index: number, value: string) => {
    const newValues = [...inputValues];
    newValues[index] = value;
    setInputValues(newValues);
  };

  const handleInputBlur = async (index: number) => {
    const value = inputValues[index]?.trim();
    if (!value) return;

    // Check if this offer already exists
    const existingOffer = offers.find(offer => offer.content === value);
    if (existingOffer) {
      return; // Don't add duplicate
    }

    setIsValidating(prev => {
      const newValidating = [...prev];
      newValidating[index] = true;
      return newValidating;
    });

    try {
      await onAddOffer(value);
      // Add a new empty input after successful addition
      setInputValues(prev => [...prev, '']);
      setIsValidating(prev => [...prev, false]);
    } catch (error) {
      console.error('Failed to add offer:', error);
    } finally {
      setIsValidating(prev => {
        const newValidating = [...prev];
        newValidating[index] = false;
        return newValidating;
      });
    }
  };

  const handleKeyPress = (index: number, e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      const input = e.target as HTMLInputElement;
      input.blur();
    }
  };

  const getInputStatus = (index: number): 'valid' | 'invalid' | 'validating' | 'empty' => {
    if (isValidating[index]) return 'validating';
    
    const value = inputValues[index]?.trim();
    if (!value) return 'empty';
    
    const offer = offers.find(o => o.content === value);
    if (!offer) return 'empty';
    
    return offer.isValid ? 'valid' : 'invalid';
  };

  const isInputReadOnly = (index: number): boolean => {
    const value = inputValues[index]?.trim();
    if (!value) return false;
    
    const offer = offers.find(o => o.content === value);
    return !!offer; // Read-only if this input corresponds to an added offer
  };

  const getStatusIcon = (status: string): string => {
    switch (status) {
      case 'valid': return '☑️';
      case 'invalid': return '☹️';
      case 'validating': return '⏳';
      default: return '';
    }
  };

  const getOfferError = (index: number): string | null => {
    const value = inputValues[index]?.trim();
    if (!value) return null;
    
    const offer = offers.find(o => o.content === value);
    return offer?.error || null;
  };

  return (
    <div className="simple-offer-inputs">
      <div className="input-instructions">
        <div className="instructions-header">
          <div className="instructions-text">
            <h3>Paste Chia offers below</h3>
            <p>Each offer will be automatically validated and combined</p>
          </div>
          {offers.length > 0 && (
            <button
              className="clear-all-button"
              onClick={onClearAll}
              title="Clear all offers"
            >
              🗑️ Clear All
            </button>
          )}
        </div>
      </div>
      
      <div className="offer-inputs-list">
        {inputValues.map((value, index) => {
          const status = getInputStatus(index);
          const error = getOfferError(index);
          const isLastInput = index === inputValues.length - 1;
          const isReadOnly = isInputReadOnly(index);
          
          return (
            <div key={index} className="offer-input-row">
              <div className="input-container">
                <input
                  type="text"
                  value={value}
                  onInput={isReadOnly ? undefined : (e) => handleInputChange(index, (e.target as HTMLInputElement).value)}
                  onBlur={isReadOnly ? undefined : () => handleInputBlur(index)}
                  onKeyPress={isReadOnly ? undefined : (e) => handleKeyPress(index, e)}
                  placeholder={isLastInput ? "Paste offer here..." : "Offer string..."}
                  className={`offer-input ${status} ${isReadOnly ? 'read-only' : ''}`}
                  disabled={isValidating[index]}
                  readOnly={isReadOnly}
                />
                <div className="input-status">
                  {getStatusIcon(status)}
                </div>
                {!isLastInput && (
                  <button
                    className="delete-button"
                    onClick={() => {
                      const offer = offers.find(o => o.content === value);
                      if (offer) onDeleteOffer(offer.id);
                    }}
                    title="Remove this offer"
                  >
                    🗑️
                  </button>
                )}
              </div>
              
              {error && (
                <div className="input-error">
                  {error}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

