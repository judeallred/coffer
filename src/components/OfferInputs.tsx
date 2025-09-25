import type { Offer, OfferData } from '../types/index.ts';
import { OfferInput } from './OfferInput.tsx';

interface OfferInputsProps {
  offers: Offer[];
  onUpdateOffer: (id: string, content: string) => void;
  onLogError: (message: string, type?: 'error' | 'warning' | 'info') => void;
  setOffers: (updater: (prev: Offer[]) => Offer[]) => void;
}

export function OfferInputs({ 
  offers, 
  onUpdateOffer, 
  onLogError, 
  setOffers 
}: OfferInputsProps): JSX.Element {
  
  const handleOfferValidation = (id: string, isValid: boolean, error?: string, parsedData?: OfferData): void => {
    setOffers(prev => prev.map(offer => 
      offer.id === id 
        ? { ...offer, isValid, error, parsedData }
        : offer
    ));

    if (!isValid && error) {
      onLogError(`Offer ${id} validation failed: ${error}`, 'error');
    }
  };

  return (
    <section className="offer-inputs-container">
      <div>
        <h2 className="offer-inputs-title">Chia Offers</h2>
        <p className="offer-inputs-description">
          Paste your Chia offer strings below. The app will automatically validate each offer and combine them into a single offer.
        </p>
      </div>
      
      <div className="offer-inputs-list">
        {offers.map((offer, index) => (
          <OfferInput
            key={offer.id}
            offer={offer}
            index={index + 1}
            onUpdateContent={(content: string) => onUpdateOffer(offer.id, content)}
            onValidationResult={(isValid: boolean, error?: string, parsedData?: OfferData) => 
              handleOfferValidation(offer.id, isValid, error, parsedData)
            }
            onLogError={onLogError}
          />
        ))}
      </div>
    </section>
  );
}
