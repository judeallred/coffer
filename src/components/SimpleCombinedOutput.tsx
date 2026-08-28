import { useEffect, useState } from 'preact/hooks';
import type { AssetItem, NFTItem, Offer } from '../types/index.ts';
import type { ChainVerificationResult } from '../services/walletSDK.ts';
import { buildCombinedPreview } from '../utils/combinedOfferPreview.ts';
import dexieDuckLogo from '../assets/dexie-duck.svg';

interface SimpleCombinedOutputProps {
  offers: Offer[];
  onLogError: (message: string, type?: 'error' | 'warning' | 'info') => void;
  disabled?: boolean;
}

type VerificationUiState =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'verified'; checkedCount: number }
  | { kind: 'warning'; details: string[] }
  | { kind: 'error'; message: string };

function renderPreviewItem(item: NFTItem | AssetItem, idx: number): JSX.Element {
  if (item.type === 'nft') {
    return (
      <div key={idx} className='dexie-item dexie-nft-item'>
        {item.thumbnail && (
          <img src={item.thumbnail} alt={item.name} className='dexie-nft-thumbnail' />
        )}
        <div className='dexie-nft-details'>
          <div className='dexie-nft-name'>
            {item.nftId
              ? (
                <a
                  href={`https://mintgarden.io/nfts/${item.nftId}`}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='dexie-link'
                >
                  {item.name}
                </a>
              )
              : item.name}
          </div>
          <div className='dexie-nft-meta'>
            {item.collectionId
              ? (
                <a
                  href={`https://mintgarden.io/collections/${item.collectionId}`}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='dexie-link dexie-nft-collection'
                >
                  {item.collectionName}
                </a>
              )
              : <span className='dexie-nft-collection'>{item.collectionName}</span>}
            {item.royaltyPercent > 0 && (
              <span className='dexie-nft-royalty'>• {item.royaltyPercent}% royalty</span>
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
}

export function SimpleCombinedOutput({
  offers,
  onLogError,
  disabled = false,
}: SimpleCombinedOutputProps): JSX.Element {
  const [combinedOffer, setCombinedOffer] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [buttonAnimation, setButtonAnimation] = useState<'success' | 'error' | ''>('');
  const [buttonEmoji, setButtonEmoji] = useState<string>('📋');
  const [verification, setVerification] = useState<VerificationUiState>({ kind: 'idle' });
  const [detailsOpen, setDetailsOpen] = useState(false);

  const validOffers = offers.filter((offer) => offer.isValid && offer.content.trim());
  const preview = buildCombinedPreview(validOffers);

  // Update combined offer when valid offers change, then auto-verify on Coinset
  useEffect(() => {
    let cancelled = false;

    const updateCombinedOffer = async (): Promise<void> => {
      if (disabled || validOffers.length === 0) {
        setCombinedOffer('');
        setVerification({ kind: 'idle' });
        return;
      }

      setIsGenerating(true);
      setVerification({ kind: 'idle' });
      setDetailsOpen(false);

      try {
        const { combineOffers, verifyOfferedCoinsOnChain } = await import(
          '../services/walletSDK.ts'
        );
        const offerStrings = validOffers.map((offer) => offer.content);
        const result = combineOffers(offerStrings);

        if (cancelled) return;

        if (result.success && result.combinedOffer) {
          setCombinedOffer(result.combinedOffer);

          // Auto-verify offered coins on mainnet via Coinset after every successful combine
          setVerification({ kind: 'checking' });
          const chainResult: ChainVerificationResult = await verifyOfferedCoinsOnChain(
            offerStrings,
          );

          if (cancelled) return;

          if (chainResult.error) {
            setVerification({ kind: 'error', message: chainResult.error });
            onLogError(`Coinset verification failed: ${chainResult.error}`, 'warning');
          } else if (chainResult.warnings.length > 0) {
            setVerification({ kind: 'warning', details: chainResult.warnings });
            onLogError(
              `Combined offer chain check: ${chainResult.warnings.length} warning(s)`,
              'warning',
            );
          } else {
            setVerification({
              kind: 'verified',
              checkedCount: chainResult.checkedCount,
            });
          }
        } else {
          setCombinedOffer('');
          setVerification({ kind: 'idle' });
          onLogError(result.error || 'Failed to combine offers', 'error');
        }
      } catch (error) {
        if (cancelled) return;
        setCombinedOffer('');
        setVerification({ kind: 'idle' });
        onLogError(`Error combining offers: ${error}`, 'error');
      } finally {
        if (!cancelled) {
          setIsGenerating(false);
        }
      }
    };

    updateCombinedOffer();

    return () => {
      cancelled = true;
    };
  }, [disabled, validOffers.length, validOffers.map((o) => o.content).join(','), onLogError]);

  const handleCopyToClipboard = async (): Promise<void> => {
    if (!combinedOffer) return;

    try {
      await navigator.clipboard.writeText(combinedOffer);
      onLogError('Combined offer copied to clipboard', 'info');

      setButtonAnimation('success');
      setTimeout(() => setButtonEmoji('✅'), 100);
      setTimeout(() => {
        setButtonEmoji('📋');
        setButtonAnimation('');
      }, 400);
    } catch (error) {
      onLogError(`Failed to copy to clipboard: ${error}`, 'error');

      setButtonAnimation('error');
      setTimeout(() => setButtonEmoji('☹'), 100);
      setTimeout(() => {
        setButtonEmoji('📋');
        setButtonAnimation('');
      }, 400);
    }
  };

  const renderVerification = (): JSX.Element | null => {
    if (!combinedOffer || verification.kind === 'idle') return null;

    if (verification.kind === 'checking') {
      return (
        <div className='chain-verification checking'>
          <label className='chain-verification-label'>
            <input type='checkbox' disabled checked={false} />
            <span>Checking coins on Coinset…</span>
          </label>
        </div>
      );
    }

    if (verification.kind === 'verified') {
      return (
        <div className='chain-verification verified'>
          <label className='chain-verification-label'>
            <input type='checkbox' checked readOnly />
            <span>
              Verified — {verification.checkedCount} offered coin
              {verification.checkedCount === 1 ? '' : 's'} unspent on mainnet
            </span>
          </label>
        </div>
      );
    }

    if (verification.kind === 'error') {
      return (
        <div className='chain-verification warning'>
          <label className='chain-verification-label'>
            <input type='checkbox' checked={false} readOnly />
            <span>Warning — could not verify on Coinset</span>
            <button
              type='button'
              className='chain-verification-toggle'
              onClick={() => setDetailsOpen((open) => !open)}
            >
              {detailsOpen ? 'Hide details' : 'Details'}
            </button>
          </label>
          {detailsOpen && (
            <ul className='chain-verification-details'>
              <li>{verification.message}</li>
            </ul>
          )}
        </div>
      );
    }

    // warning
    return (
      <div className='chain-verification warning'>
        <label className='chain-verification-label'>
          <input type='checkbox' checked={false} readOnly />
          <span>
            Warning — {verification.details.length} issue
            {verification.details.length === 1 ? '' : 's'} found on-chain
          </span>
          <button
            type='button'
            className='chain-verification-toggle'
            onClick={() => setDetailsOpen((open) => !open)}
          >
            {detailsOpen ? 'Hide details' : 'Details'}
          </button>
        </label>
        {detailsOpen && (
          <ul className='chain-verification-details'>
            {verification.details.map((detail, idx) => <li key={idx}>{detail}</li>)}
          </ul>
        )}
      </div>
    );
  };

  return (
    <div className='simple-combined-output'>
      <div className='output-header'>
        <h3>Combined Offer</h3>
        <div className='output-status'>
          {isGenerating
            ? <span className='generating'>⏳ Generating...</span>
            : validOffers.length > 0
            ? <span className='ready'>✅ Ready ({validOffers.length} offers)</span>
            : <span className='empty'>No valid offers</span>}
        </div>
      </div>

      <div className='output-container'>
        <div className='output-field'>
          <input
            type='text'
            value={combinedOffer}
            readOnly
            className='combined-offer-input'
            placeholder='Combined offer will appear here...'
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
          <button
            type='button'
            className={`copy-button ${buttonAnimation} ${!combinedOffer ? 'hidden' : ''}`}
            onClick={handleCopyToClipboard}
            title='Copy to clipboard'
            disabled={!combinedOffer}
          >
            {buttonEmoji}
          </button>
        </div>

        {renderVerification()}

        {combinedOffer && preview && (
          <div className='combined-preview'>
            <div className='combined-preview-header'>
              <img src={dexieDuckLogo} alt='dexie' className='dexie-logo' />
              <span className='combined-preview-title'>Combined preview</span>
              <span className='combined-preview-note'>from input offers</span>
            </div>

            <div className='dexie-info-boxes'>
              {preview.requested.length > 0 && (
                <div className='dexie-info-box'>
                  <span className='dexie-section-label'>Requested:</span>
                  {preview.requested.map((item, idx) => renderPreviewItem(item, idx))}
                </div>
              )}
              {preview.offered.length > 0 && (
                <div className='dexie-info-box'>
                  <span className='dexie-section-label'>Offered:</span>
                  {preview.offered.map((item, idx) => renderPreviewItem(item, idx))}
                </div>
              )}
            </div>

            {preview.royaltyBreakdown.length > 0 && (
              <div className='royalty-breakdown'>
                <span className='dexie-section-label'>Royalty breakdown:</span>
                <ul className='royalty-breakdown-list'>
                  {preview.royaltyBreakdown.map((entry, idx) => (
                    <li key={idx}>
                      {entry.nftId
                        ? (
                          <a
                            href={`https://mintgarden.io/nfts/${entry.nftId}`}
                            target='_blank'
                            rel='noopener noreferrer'
                            className='dexie-link'
                          >
                            {entry.name}
                          </a>
                        )
                        : entry.name}
                      {' — '}
                      <strong>{entry.royaltyPercent}%</strong>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
