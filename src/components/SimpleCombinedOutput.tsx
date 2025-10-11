import { useState, useEffect } from 'preact/hooks';
import type { Offer } from '../types/index.ts';

interface SimpleCombinedOutputProps {
  offers: Offer[];
  onLogError: (message: string, type?: 'error' | 'warning' | 'info') => void;
}

export function SimpleCombinedOutput({ 
  offers,
  onLogError
}: SimpleCombinedOutputProps): JSX.Element {
  const [combinedOffer, setCombinedOffer] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  const validOffers = offers.filter(offer => offer.isValid && offer.content.trim());

  // Update combined offer when valid offers change
  useEffect(() => {
    const updateCombinedOffer = async () => {
      if (validOffers.length === 0) {
        setCombinedOffer('');
        return;
      }

      setIsGenerating(true);
      
      try {
        const { combineOffers } = await import('../services/walletSDK.ts');
        const offerStrings = validOffers.map(offer => offer.content);
        const result = await combineOffers(offerStrings);
        
        if (result.success && result.combinedOffer) {
          setCombinedOffer(result.combinedOffer);
        } else {
          setCombinedOffer('');
          onLogError(result.error || 'Failed to combine offers', 'error');
        }
      } catch (error) {
        setCombinedOffer('');
        onLogError(`Error combining offers: ${error}`, 'error');
      } finally {
        setIsGenerating(false);
      }
    };

    updateCombinedOffer();
  }, [validOffers.length, validOffers.map(o => o.content).join(','), onLogError]);

  const handleCopyToClipboard = async () => {
    if (!combinedOffer) return;

    try {
      await navigator.clipboard.writeText(combinedOffer);
      onLogError('Combined offer copied to clipboard', 'info');
      
      // Show toast notification
      const { showToast } = await import('./ToastContainer.tsx');
      showToast('Combined offer copied!', 'success');
    } catch (error) {
      onLogError(`Failed to copy to clipboard: ${error}`, 'error');
      
      const { showToast } = await import('./ToastContainer.tsx');
      showToast('Copy failed - select text manually', 'error');
    }
  };

  return (
    <div className="simple-combined-output">
      <div className="output-header">
        <h3>Combined Offer</h3>
        <div className="output-status">
          {isGenerating ? (
            <span className="generating">⏳ Generating...</span>
          ) : validOffers.length > 0 ? (
            <span className="ready">✅ Ready ({validOffers.length} offers)</span>
          ) : (
            <span className="empty">No valid offers</span>
          )}
        </div>
      </div>
      
      <div className="output-container">
        <div className="output-field">
          <input
            type="text"
            value={combinedOffer}
            readOnly
            className="combined-offer-input"
            placeholder="Combined offer will appear here..."
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
          {combinedOffer && (
            <button
              className="copy-button"
              onClick={handleCopyToClipboard}
              title="Copy to clipboard"
            >
              📋
            </button>
          )}
        </div>
        
        {combinedOffer && (
          <p className="output-hint">
            Click the text field above to select all and copy manually if needed
          </p>
        )}
      </div>
    </div>
  );
}

