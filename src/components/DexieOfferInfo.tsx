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

  const formatItem = (item: typeof summary.offered[0]): string => {
    if (item.type === 'nft') {
      return item.name;
    }
    return `${item.amount} ${item.code}`;
  };

  return (
    <div className='dexie-offer-info success'>
      <div className='dexie-info-header' onClick={() => setIsExpanded(!isExpanded)}>
        <div className='dexie-info-left'>
          <img src={dexieDuckLogo} alt='dexie' className='dexie-logo' />
          <div className='dexie-info-details'>
            {summary && summary.offered.length > 0 && (
              <div className='dexie-items-section'>
                <span className='dexie-section-label'>Offered:</span>
                {summary.offered.map((item, idx) => (
                  <div key={idx} className='dexie-item'>• {formatItem(item)}</div>
                ))}
              </div>
            )}
            {summary && summary.requested.length > 0 && (
              <div className='dexie-items-section'>
                <span className='dexie-section-label'>Requested:</span>
                {summary.requested.map((item, idx) => (
                  <div key={idx} className='dexie-item'>• {formatItem(item)}</div>
                ))}
              </div>
            )}
          </div>
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
