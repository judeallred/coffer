import { useState } from 'preact/hooks';
import type { Offer, AssetData } from '../types/index.ts';

interface CombinedPreviewProps {
  offers: Offer[];
  combinedOffer: string;
  onLogError: (message: string, type?: 'error' | 'warning' | 'info') => void;
}

const getAssetIcon = (asset: string): string => {
  const assetUpper = asset.toUpperCase();
  if (assetUpper === 'XCH') return '🌱';
  if (assetUpper === 'USDS') return '💵';
  if (assetUpper.includes('CAT') || assetUpper.includes('TOKEN')) return '🪙';
  return assetUpper.charAt(0);
};

export function CombinedPreview({ 
  offers, 
  combinedOffer: _combinedOffer, 
  onLogError 
}: CombinedPreviewProps): JSX.Element {
  const [_isGenerating, _setIsGenerating] = useState(false);

  const validOffers = offers.filter(offer => offer.isValid && offer.parsedData);
  
  // Combine all requested/offered assets from valid offers
  const combinedRequested: AssetData[] = [];
  const combinedOffered: AssetData[] = [];
  
  validOffers.forEach(offer => {
    if (offer.parsedData?.requested) {
      combinedRequested.push(...offer.parsedData.requested);
    }
    if (offer.parsedData?.offered) {
      combinedOffered.push(...offer.parsedData.offered);
    }
  });

  const handleCopyToClipboard = async (): Promise<void> => {
    // First, generate the combined offer if not already done
    const combined = await generateCombinedOffer();
    if (!combined) {
      onLogError('No valid offers to combine', 'warning');
      return;
    }

    try {
      await navigator.clipboard.writeText(combined);
      onLogError('Combined offer copied to clipboard', 'info');
      
      // Show toast notification
      const { showToast } = await import('./ToastContainer.tsx');
      showToast('Combined offer copied to clipboard!', 'success');
    } catch (_error) {
      onLogError('Failed to copy to clipboard', 'error');
      const { showToast } = await import('./ToastContainer.tsx');
      showToast('Failed to copy to clipboard', 'error');
    }
  };

  const handleDownload = async (): Promise<void> => {
    // First, generate the combined offer if not already done
    const combined = await generateCombinedOffer();
    if (!combined) {
      onLogError('No valid offers to combine', 'warning');
      return;
    }

    const blob = new Blob([combined], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `combined-offer-${Date.now()}.offer`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    onLogError('Combined offer downloaded', 'info');
    
    // Show toast notification
    const { showToast } = await import('./ToastContainer.tsx');
    showToast('Combined offer downloaded successfully!', 'success');
  };

  const generateCombinedOffer = async (): Promise<string | null> => {
    if (validOffers.length === 0) {
      return null;
    }

    try {
      const { combineOffers } = await import('../services/walletSDK.ts');
      const offerStrings = validOffers.map(offer => offer.content);
      const result = await combineOffers(offerStrings);
      
      if (result.success && result.combinedOffer) {
        return result.combinedOffer;
      } else {
        onLogError(result.error || 'Failed to combine offers', 'error');
        return null;
      }
    } catch (error) {
      onLogError(`Error combining offers: ${error}`, 'error');
      return null;
    }
  };

  if (validOffers.length === 0) {
    return (
      <section className="combined-preview-container">
        <div className="combined-preview-header">
          <h2 className="combined-preview-title">Combined Offer Preview</h2>
          <span className="valid-offers-count">0 valid offers</span>
        </div>

        <div className="preview-card">
          <div className="empty-state">
            <div className="empty-icon">📝</div>
            <p className="empty-text">No valid offers yet</p>
            <p className="empty-subtext">
              Paste and validate Chia offers above to see the combined preview
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="combined-preview-container">
      <div className="combined-preview-header">
        <h2 className="combined-preview-title">Combined Offer Preview</h2>
        <span className="valid-offers-count">{validOffers.length} valid offers</span>
      </div>

      <div className="preview-card">
        <div className="preview-grid">
          <div className="preview-column">
            <h3 className="column-header">Requested</h3>
            <div className="asset-list">
              {combinedRequested.length === 0 ? (
                <div className="asset-item">
                  <div className="asset-icon">—</div>
                  <div className="asset-details">
                    <div className="asset-amount">No assets requested</div>
                  </div>
                </div>
              ) : (
                combinedRequested.map((asset, index) => (
                  <div key={index} className="asset-item">
                    <div className="asset-icon">{getAssetIcon(asset.asset)}</div>
                    <div className="asset-details">
                      <div className="asset-amount">{asset.amount}</div>
                      <div className="asset-symbol">{asset.asset}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="preview-arrow">⇄</div>

          <div className="preview-column">
            <h3 className="column-header">Offered</h3>
            <div className="asset-list">
              {combinedOffered.length === 0 ? (
                <div className="asset-item">
                  <div className="asset-icon">—</div>
                  <div className="asset-details">
                    <div className="asset-amount">No assets offered</div>
                  </div>
                </div>
              ) : (
                combinedOffered.map((asset, index) => (
                  <div key={index} className="asset-item">
                    <div className="asset-icon">{getAssetIcon(asset.asset)}</div>
                    <div className="asset-details">
                      <div className="asset-amount">{asset.amount}</div>
                      <div className="asset-symbol">{asset.asset}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="action-buttons">
          <button 
            onClick={handleCopyToClipboard}
            disabled={validOffers.length === 0}
            className="action-button primary"
          >
            📋 Copy to Clipboard
          </button>
          <button 
            onClick={() => handleDownload()}
            disabled={validOffers.length === 0}
            className="action-button secondary"
          >
            💾 Download .offer File
          </button>
        </div>
      </div>
    </section>
  );
}
