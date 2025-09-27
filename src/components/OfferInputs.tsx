import { useState, useEffect } from 'preact/hooks';
import type { Offer } from '../types/index.ts';
import { OfferCard } from './OfferCard.tsx';

interface OfferInputsProps {
  offers: Offer[];
  onDeleteOffer: (id: string) => void;
}

export function OfferInputs({ 
  offers,
  onDeleteOffer
}: OfferInputsProps): JSX.Element {
  const [newOfferIds, setNewOfferIds] = useState<Set<string>>(new Set());

  // Track new offers for animation
  useEffect(() => {
    if (offers.length > 0) {
      const latestOffer = offers[offers.length - 1];
      if (!newOfferIds.has(latestOffer.id)) {
        setNewOfferIds(prev => new Set([...prev, latestOffer.id]));
        
        // Remove the "new" status after animation completes
        setTimeout(() => {
          setNewOfferIds(prev => {
            const updated = new Set(prev);
            updated.delete(latestOffer.id);
            return updated;
          });
        }, 600); // Match animation duration
      }
    }
  }, [offers.length]);

  const validOffers = offers.filter(offer => offer.isValid && offer.content.trim());
  
  return (
    <section className="offer-inputs-container">
      
      <div className="offer-paste-instruction">
        <div className="paste-instruction-icon">📋</div>
        <div className="paste-instruction-content">
          <h3 className="paste-instruction-title">Paste an offer anywhere on this page to add it to the offers list</h3>
          <p className="paste-instruction-subtitle">
            Simply copy a Chia offer string (starts with 'offer1') and paste it anywhere on this page - it will be automatically detected and added.
          </p>
        </div>
      </div>

      {offers.length > 0 && (
        <div className="offer-cards-section">
          <div className="offer-cards-header">
            <h3 className="offer-cards-title">
              Added Offers ({validOffers.length} valid)
            </h3>
          </div>
          
          <div className="offer-cards-list">
            {offers.map((offer) => (
              <div
                key={offer.id}
                className={`offer-card-wrapper ${newOfferIds.has(offer.id) ? 'offer-card-new' : ''}`}
              >
                <OfferCard
                  offer={offer}
                  onDelete={onDeleteOffer}
                />
              </div>
            ))}
          </div>
        </div>
      )}
      
      {offers.length === 0 && (
        <div className="offer-empty-state">
          <div className="offer-empty-icon">📝</div>
          <p className="offer-empty-text">No offers added yet</p>
          <p className="offer-empty-subtext">
            Paste a Chia offer string anywhere on this page to get started
          </p>
        </div>
      )}
    </section>
  );
}
