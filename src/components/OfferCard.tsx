import type { Offer } from '../types/index.ts';

interface OfferCardProps {
  offer: Offer;
  onDelete: (id: string) => void;
}

export function OfferCard({ offer, onDelete }: OfferCardProps): JSX.Element {
  const getOfferSummary = (offer: Offer): string => {
    if (!offer.isValid || !offer.parsedData) {
      return 'Invalid offer';
    }

    const { requested, offered } = offer.parsedData;
    
    // Get summary of what's requested
    const requestedSummary = requested && requested.length > 0
      ? requested.map(asset => {
          if (asset.amount === "TBD" && (asset as any).isImplicit) {
            return `Payment in ${asset.asset}`;
          }
          return `${asset.amount} ${asset.asset}`;
        }).join(', ')
      : 'Nothing';
    
    // Get summary of what's offered
    const offeredSummary = offered && offered.length > 0
      ? offered.map(asset => {
          if (asset.isNFT) {
            return asset.nftName || 'NFT';
          }
          return `${asset.amount} ${asset.asset}`;
        }).join(', ')
      : 'Nothing';
    
    return `Requesting: ${requestedSummary} ⇄ Offering: ${offeredSummary}`;
  };

  const getOfferPreview = (): string => {
    const content = offer.content.trim();
    if (content.length <= 100) return content;
    return `${content.substring(0, 50)}...${content.substring(content.length - 50)}`;
  };

  return (
    <div className={`offer-card ${offer.isValid ? 'offer-card-valid' : 'offer-card-invalid'}`}>
      <div className="offer-card-header">
        <div className="offer-card-title">
          <span className="offer-card-label">Offer {offer.id}</span>
          <span className={`offer-card-status ${offer.isValid ? 'status-valid' : 'status-invalid'}`}>
            {offer.isValid ? '✅' : '❌'}
          </span>
        </div>
        <button 
          className="offer-card-delete"
          onClick={() => onDelete(offer.id)}
          title="Remove this offer"
          aria-label={`Remove offer ${offer.id}`}
        >
          ✕
        </button>
      </div>
      
      <div className="offer-card-content">
        <div className="offer-card-summary">
          {getOfferSummary(offer)}
        </div>
        
        {offer.error && (
          <div className="offer-card-error">
            Error: {offer.error}
          </div>
        )}
        
        <details className="offer-card-details">
          <summary className="offer-card-details-toggle">Show offer string</summary>
          <div className="offer-card-offer-string">
            <code>{getOfferPreview()}</code>
          </div>
        </details>
      </div>
    </div>
  );
}
