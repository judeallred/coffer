import { useState, useEffect } from 'preact/hooks';
import type { Offer, AssetData } from '../types/index.ts';

type ButtonState = 'idle' | 'loading' | 'success' | 'error';

interface CombinedPreviewProps {
  offers: Offer[];
  combinedOffer: string;
  onLogError: (message: string, type?: 'error' | 'warning' | 'info') => void;
  onCombinedOfferUpdate?: (combinedOffer: string) => void;
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
  onLogError,
  onCombinedOfferUpdate
}: CombinedPreviewProps): JSX.Element {
  const [_isGenerating, _setIsGenerating] = useState(false);
  const [copyButtonState, setCopyButtonState] = useState<ButtonState>('idle');
  const [downloadButtonState, setDownloadButtonState] = useState<ButtonState>('idle');
  const [currentCombinedOffer, setCurrentCombinedOffer] = useState<string>('');
  
  const getButtonContent = (state: ButtonState, idleText: string, idleIcon: string) => {
    switch (state) {
      case 'loading':
        return { text: 'Processing...', icon: '⏳' };
      case 'success':
        return { text: 'Success!', icon: '✅' };
      case 'error':
        return { text: 'Failed', icon: '❌' };
      default:
        return { text: idleText, icon: idleIcon };
    }
  };

  const validOffers = offers.filter(offer => offer.isValid && offer.parsedData);
  
  // Update combined offer when valid offers change
  useEffect(() => {
    const updateCombinedOffer = async () => {
      if (validOffers.length > 0) {
        const combined = await generateCombinedOffer();
        const combinedString = combined || '';
        setCurrentCombinedOffer(combinedString);
        onCombinedOfferUpdate?.(combinedString);
      } else {
        setCurrentCombinedOffer('');
        onCombinedOfferUpdate?.('');
      }
    };
    updateCombinedOffer();
  }, [validOffers.length, validOffers.map(o => o.content).join(','), onCombinedOfferUpdate]);
  
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

  const copyToClipboardFallback = (text: string): boolean => {
    try {
      // Create a temporary textarea element
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'absolute';
      textarea.style.left = '-9999px';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      
      // Select and copy the text
      textarea.select();
      textarea.setSelectionRange(0, 99999); // For mobile devices
      const successful = document.execCommand('copy');
      
      // Clean up
      document.body.removeChild(textarea);
      
      return successful;
    } catch (error) {
      console.error('Fallback copy failed:', error);
      return false;
    }
  };

  const handleCopyToClipboard = async (): Promise<void> => {
    if (copyButtonState !== 'idle') return; // Prevent multiple clicks
    
    setCopyButtonState('loading');
    
    try {
      // First, generate the combined offer if not already done
      const combined = await generateCombinedOffer();
      if (!combined) {
        setCopyButtonState('error');
        onLogError('No valid offers to combine', 'warning');
        setTimeout(() => setCopyButtonState('idle'), 2000);
        return;
      }

      console.log('🔍 Attempting to copy offer:', combined.substring(0, 50) + '...');
      
      let copySuccessful = false;
      
      // Try modern clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
          await navigator.clipboard.writeText(combined);
          // Verify it was actually copied by reading it back
          const clipboardText = await navigator.clipboard.readText();
          if (clipboardText === combined) {
            copySuccessful = true;
            console.log('✅ Modern clipboard API successful');
          } else {
            console.log('⚠️ Modern clipboard API wrote but verification failed');
          }
        } catch (clipError) {
          console.log('⚠️ Modern clipboard API failed:', clipError);
        }
      }
      
      // If modern API failed, try fallback method
      if (!copySuccessful) {
        console.log('🔄 Trying fallback copy method...');
        copySuccessful = copyToClipboardFallback(combined);
        if (copySuccessful) {
          console.log('✅ Fallback copy method successful');
        }
      }
      
      if (copySuccessful) {
        setCopyButtonState('success');
        onLogError('Combined offer copied to clipboard', 'info');
        
        // Show toast notification
        const { showToast } = await import('./ToastContainer.tsx');
        showToast('Combined offer copied to clipboard!', 'success');
      } else {
        throw new Error('Both clipboard methods failed');
      }
      
      // Reset button state after 2 seconds
      setTimeout(() => setCopyButtonState('idle'), 2000);
      
    } catch (error) {
      setCopyButtonState('error');
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      onLogError(`Failed to copy to clipboard: ${errorMessage}`, 'error');
      
      const { showToast } = await import('./ToastContainer.tsx');
      showToast('Copy failed - use the text box below to copy manually', 'error');
      
      // Reset button state after 2 seconds
      setTimeout(() => setCopyButtonState('idle'), 2000);
    }
  };

  const handleDownload = async (): Promise<void> => {
    if (downloadButtonState !== 'idle') return; // Prevent multiple clicks
    
    setDownloadButtonState('loading');
    
    try {
      // First, generate the combined offer if not already done
      const combined = await generateCombinedOffer();
      if (!combined) {
        setDownloadButtonState('error');
        onLogError('No valid offers to combine', 'warning');
        setTimeout(() => setDownloadButtonState('idle'), 2000);
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

      setDownloadButtonState('success');
      onLogError('Combined offer downloaded', 'info');
      
      // Show toast notification
      const { showToast } = await import('./ToastContainer.tsx');
      showToast('Combined offer downloaded successfully!', 'success');
      
      // Reset button state after 2 seconds
      setTimeout(() => setDownloadButtonState('idle'), 2000);
      
    } catch (error) {
      setDownloadButtonState('error');
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      onLogError(`Error downloading offer: ${errorMessage}`, 'error');
      
      const { showToast } = await import('./ToastContainer.tsx');
      showToast('Failed to download offer', 'error');
      
      // Reset button state after 2 seconds
      setTimeout(() => setDownloadButtonState('idle'), 2000);
    }
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
                    {asset.isNFT && asset.nftImageUrl ? (
                      <img 
                        src={asset.nftImageUrl} 
                        alt={asset.nftName || asset.asset}
                        className="asset-nft-thumbnail"
                        onError={(e) => {
                          // Fallback to generic icon if image fails to load
                          (e.target as HTMLImageElement).style.display = 'none';
                          const fallback = document.createElement('div');
                          fallback.className = 'asset-icon';
                          fallback.textContent = '🖼️';
                          (e.target as HTMLImageElement).parentNode?.appendChild(fallback);
                        }}
                      />
                    ) : (
                      <div className="asset-icon">{getAssetIcon(asset.asset)}</div>
                    )}
                    <div className="asset-details">
                      {asset.isNFT ? (
                        <>
                          <div className="asset-amount">{asset.nftName || asset.asset}</div>
                          <div className="asset-symbol">NFT</div>
                        </>
                      ) : asset.amount === "TBD" && (asset as any).isImplicit ? (
                        <>
                          <div className="asset-amount">Payment in {asset.asset}</div>
                          <div className="asset-symbol">(amount to be determined)</div>
                        </>
                      ) : (
                        <>
                          <div className="asset-amount">{asset.amount}</div>
                          <div className="asset-symbol">{asset.asset}</div>
                        </>
                      )}
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
                    {asset.isNFT && asset.nftImageUrl ? (
                      <img 
                        src={asset.nftImageUrl} 
                        alt={asset.nftName || asset.asset}
                        className="asset-nft-thumbnail"
                        onError={(e) => {
                          // Fallback to generic icon if image fails to load
                          (e.target as HTMLImageElement).style.display = 'none';
                          const fallback = document.createElement('div');
                          fallback.className = 'asset-icon';
                          fallback.textContent = '🖼️';
                          (e.target as HTMLImageElement).parentNode?.appendChild(fallback);
                        }}
                      />
                    ) : (
                      <div className="asset-icon">{getAssetIcon(asset.asset)}</div>
                    )}
                    <div className="asset-details">
                      {asset.isNFT ? (
                        <>
                          <div className="asset-amount">{asset.nftName || asset.asset}</div>
                          <div className="asset-symbol">NFT</div>
                        </>
                      ) : asset.amount === "TBD" && (asset as any).isImplicit ? (
                        <>
                          <div className="asset-amount">Payment in {asset.asset}</div>
                          <div className="asset-symbol">(amount to be determined)</div>
                        </>
                      ) : (
                        <>
                          <div className="asset-amount">{asset.amount}</div>
                          <div className="asset-symbol">{asset.asset}</div>
                        </>
                      )}
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
            disabled={validOffers.length === 0 || copyButtonState !== 'idle'}
            className={`action-button primary ${copyButtonState !== 'idle' ? copyButtonState : ''}`}
          >
            {(() => {
              const content = getButtonContent(copyButtonState, 'Copy to Clipboard', '📋');
              return `${content.icon} ${content.text}`;
            })()}
          </button>
          <button 
            onClick={() => handleDownload()}
            disabled={validOffers.length === 0 || downloadButtonState !== 'idle'}
            className={`action-button secondary ${downloadButtonState !== 'idle' ? downloadButtonState : ''}`}
          >
            {(() => {
              const content = getButtonContent(downloadButtonState, 'Download .offer File', '💾');
              return `${content.icon} ${content.text}`;
            })()}
          </button>
        </div>
        
        {currentCombinedOffer && (
          <div className="combined-offer-output">
            <label htmlFor="combined-offer-text" className="combined-offer-label">
              Combined Offer String:
            </label>
            <input
              id="combined-offer-text"
              type="text"
              value={currentCombinedOffer}
              readOnly
              className="combined-offer-textbox"
              placeholder="Combined offer will appear here..."
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <p className="combined-offer-hint">
              Click the text field above to select all and copy manually if needed
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
