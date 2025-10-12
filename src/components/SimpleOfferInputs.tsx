import { useEffect, useState } from 'preact/hooks';
import type { Offer } from '../types/index.ts';
import { extractOfferIdFromUrl, fetchOfferFromIdCached, isOfferId } from '../utils/offerUtils.ts';

interface SimpleOfferInputsProps {
  offers: Offer[];
  onAddOffer: (content: string) => Promise<void>;
  onDeleteOffer: (id: string) => Promise<void>;
  onClearAll: () => void;
  disabled?: boolean;
}

export function SimpleOfferInputs({
  offers,
  onAddOffer,
  onDeleteOffer,
  onClearAll,
  disabled = false,
}: SimpleOfferInputsProps): JSX.Element {
  const [inputValues, setInputValues] = useState<string[]>(['']);

  // Initialize input values when offers change
  useEffect(() => {
    if (offers.length === 0) {
      setInputValues(['']);
    } else {
      // Update input values to match offers
      const newInputValues = offers.map((offer) => offer.content);
      setInputValues([...newInputValues, '']); // Add empty input at the end
    }
  }, [offers]);

  const handleInputChange = (index: number, value: string) => {
    // Just update the input value - paste events are handled by onPaste
    const newValues = [...inputValues];
    newValues[index] = value;
    setInputValues(newValues);
  };

  const handleInputBlur = async (index: number) => {
    const value = inputValues[index]?.trim();
    if (!value) return;

    // Check if this offer was already added (to avoid duplicate processing)
    const alreadyAdded = offers.some((o) => o.content === value);
    if (alreadyAdded) return;

    try {
      let offerToAdd = value;

      // Check if it's a URL with an offer ID
      const offerIdFromUrl = extractOfferIdFromUrl(value);
      const offerIdToFetch = offerIdFromUrl || (isOfferId(value) ? value : null);

      // Check if it's an offer ID or URL and fetch it
      if (offerIdToFetch) {
        const fetchedOffer = await fetchOfferFromIdCached(offerIdToFetch);
        if (fetchedOffer) {
          offerToAdd = fetchedOffer;
          setInputValues((prev) => {
            const newValues = [...prev];
            newValues[index] = fetchedOffer;
            return newValues;
          });
        }
      }

      await onAddOffer(offerToAdd);
      // useEffect will handle adding new empty input
    } catch (error) {
      console.error('Failed to add offer:', error);
    }
  };

  const handleKeyPress = (_index: number, e: KeyboardEvent): void => {
    if (e.key === 'Enter') {
      const input = e.target as HTMLInputElement;
      input.blur();
    }
  };

  const handlePaste = async (index: number, e: ClipboardEvent) => {
    e.preventDefault();

    const pastedText = e.clipboardData?.getData('text') || '';
    const trimmedValue = pastedText.trim();

    if (!trimmedValue) return;

    // Update input value
    setInputValues((prev) => {
      const newValues = [...prev];
      newValues[index] = trimmedValue;
      return newValues;
    });

    try {
      let offerToAdd = trimmedValue;

      // Check if it's a URL with an offer ID
      const offerIdFromUrl = extractOfferIdFromUrl(trimmedValue);
      const offerIdToFetch = offerIdFromUrl || (isOfferId(trimmedValue) ? trimmedValue : null);

      // Check if it's an offer ID or URL and fetch it
      if (offerIdToFetch) {
        const fetchedOffer = await fetchOfferFromIdCached(offerIdToFetch);
        if (fetchedOffer) {
          offerToAdd = fetchedOffer;
          setInputValues((prev) => {
            const newValues = [...prev];
            newValues[index] = fetchedOffer;
            return newValues;
          });
        }
      }

      // Add the offer (this will trigger validation)
      await onAddOffer(offerToAdd);
      // useEffect will handle adding new empty input
    } catch (error) {
      console.error('Failed to process pasted offer:', error);
    }
  };

  const getInputStatus = (index: number): 'valid' | 'invalid' | 'empty' => {
    const value = inputValues[index]?.trim();
    if (!value) return 'empty';

    const offer = offers.find((o) => o.content === value);
    if (!offer) return 'empty';

    return offer.isValid ? 'valid' : 'invalid';
  };

  const getStatusIcon = (status: string): string => {
    switch (status) {
      case 'valid':
        return '✅';
      case 'invalid':
        return '☹️';
      default:
        return '';
    }
  };

  const getOfferError = (index: number): string | null => {
    const value = inputValues[index]?.trim();
    if (!value) return null;

    const offer = offers.find((o) => o.content === value);
    return offer?.error || null;
  };

  return (
    <div className='simple-offer-inputs'>
      <div className='input-instructions'>
        <div className='instructions-header'>
          <div className='instructions-text'>
            <h3>Paste Chia offers below</h3>
            <p>
              You can paste offers, offer ids, or Dexie/MintGarden offer page urls.
            </p>
            <p>Each offer will be automatically validated and combined</p>
          </div>
          {offers.length > 0 && (
            <div className='reset-button-container'>
              <button
                type='button'
                className='reset-button'
                onClick={onClearAll}
                title='Reset all offers'
              >
                ♻️ Reset
              </button>
            </div>
          )}
        </div>
      </div>

      <div className='offer-inputs-list'>
        {inputValues.map((value, index) => {
          const status = getInputStatus(index);
          const error = getOfferError(index);
          const isLastInput = index === inputValues.length - 1;

          return (
            <div key={index} className='offer-input-row'>
              <div className='input-container'>
                <input
                  type='text'
                  value={value}
                  onInput={(e) => handleInputChange(index, (e.target as HTMLInputElement).value)}
                  onPaste={(e) => handlePaste(index, e)}
                  onBlur={() => handleInputBlur(index)}
                  onKeyPress={(e) => handleKeyPress(index, e)}
                  placeholder={isLastInput ? 'Paste offer here...' : 'Offer string...'}
                  className={`offer-input ${status}`}
                  disabled={disabled}
                />
                <div className='input-status'>
                  {getStatusIcon(status)}
                </div>
                {!isLastInput && (
                  <button
                    type='button'
                    className='delete-button'
                    onClick={() => {
                      const offer = offers.find((o) => o.content === value);
                      if (offer) onDeleteOffer(offer.id);
                    }}
                    title='Remove this offer'
                  >
                    🗑️
                  </button>
                )}
              </div>

              {error && (
                <div className='input-error'>
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
