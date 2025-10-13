import { useState } from 'preact/hooks';
import type { DexieOfferResponse } from '../types/index.ts';
import dexieDuckLogo from '../assets/dexie-duck.svg';

interface DexieOfferInfoProps {
  dexieData?: DexieOfferResponse;
  loading?: boolean;
}

export function DexieOfferInfo({ dexieData, loading }: DexieOfferInfoProps): JSX.Element | null {
  const [isExpanded, setIsExpanded] = useState(false);

  // Don't render if no data and not loading
  if (!dexieData && !loading) {
    return null;
  }

  // Loading state
  if (loading) {
    return (
      <div className='dexie-offer-info loading'>
        <img src={dexieDuckLogo} alt='dexie' className='dexie-logo' />
        <span className='dexie-info-text'>Loading dexie data...</span>
      </div>
    );
  }

  // No data or failed to fetch
  if (!dexieData || !dexieData.success) {
    return (
      <div className='dexie-offer-info no-data'>
        <img src={dexieDuckLogo} alt='dexie' className='dexie-logo' />
        <span className='dexie-info-text'>No dexie data</span>
      </div>
    );
  }

  // Success - display summary
  const { summary } = dexieData;

  const renderItem = (item: typeof summary.offered[0], idx: number): JSX.Element => {
    if (item.type === 'nft') {
      return (
        <div key={idx} className='dexie-item dexie-nft-item'>
          {item.thumbnail && (
            <img src={item.thumbnail} alt={item.name} className='dexie-nft-thumbnail' />
          )}
          <div className='dexie-nft-details'>
            <div className='dexie-nft-name'>{item.name}</div>
            <div className='dexie-nft-meta'>
              <span className='dexie-nft-collection'>{item.collectionName}</span>
              {item.royaltyPercent > 0 && (
                <span className='dexie-nft-royalty'>• {item.royaltyPercent}% fee</span>
              )}
            </div>
          </div>
        </div>
      );
    }
    return (
      <div key={idx} className='dexie-item dexie-asset-item'>
        • {item.amount} {item.code}
      </div>
    );
  };

  return (
    <div className='dexie-offer-info success'>
      <div className='dexie-info-header'>
        <img
          src={dexieDuckLogo}
          alt='dexie'
          className='dexie-logo clickable'
          onClick={() => setIsExpanded(!isExpanded)}
          title='Click to view raw JSON'
        />
        <div className='dexie-info-boxes'>
          {summary && summary.requested.length > 0 && (
            <div className='dexie-info-box'>
              <span className='dexie-section-label'>Requested:</span>
              {summary.requested.map((item, idx) => renderItem(item, idx))}
            </div>
          )}
          {summary && summary.offered.length > 0 && (
            <div className='dexie-info-box'>
              <span className='dexie-section-label'>Offered:</span>
              {summary.offered.map((item, idx) => renderItem(item, idx))}
            </div>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className='dexie-info-content'>
          <pre className='dexie-json-display'>{JSON.stringify(dexieData.rawResponse, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
