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
  const offeredText = summary?.offered
    .map((item) => {
      if (item.type === 'nft') {
        return `${item.name}`;
      }
      return `${item.amount} ${item.code}`;
    })
    .join(', ');

  const requestedText = summary?.requested
    .map((item) => {
      if (item.type === 'nft') {
        return `${item.name}`;
      }
      return `${item.amount} ${item.code}`;
    })
    .join(', ');

  return (
    <div className='dexie-offer-info success'>
      <div className='dexie-info-header' onClick={() => setIsExpanded(!isExpanded)}>
        <div className='dexie-info-left'>
          <img src={dexieDuckLogo} alt='dexie' className='dexie-logo' />
          <span className='dexie-info-text'>
            {offeredText} ↔ {requestedText}
          </span>
        </div>
        <span className={`dexie-expand-icon ${isExpanded ? 'expanded' : ''}`}>▼</span>
      </div>

      {isExpanded && (
        <div className='dexie-info-content'>
          <pre className='dexie-json-display'>{JSON.stringify(dexieData.rawResponse, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
