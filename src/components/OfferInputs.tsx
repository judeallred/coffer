import styled from 'styled-components';
import type { Offer, OfferData } from '../types/index.ts';
import { OfferInput } from './OfferInput.tsx';

const Container = styled.section`
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
`;

const Title = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
`;

const Description = styled.p`
  color: var(--color-text-light);
  margin: var(--spacing-sm) 0 0 0;
  line-height: 1.5;
`;

const InputList = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
`;

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
    <Container>
      <div>
        <Title>Chia Offers</Title>
        <Description>
          Paste your Chia offer strings below. The app will automatically validate each offer and combine them into a single offer.
        </Description>
      </div>
      
      <InputList>
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
      </InputList>
    </Container>
  );
}
