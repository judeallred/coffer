import { useEffect, useState } from 'preact/hooks';
import type { Offer } from '../types/index.ts';
import type { ChainVerificationResult } from '../services/walletSDK.ts';
import { buildCombinedPreview, combinedOfferFileName } from '../utils/combinedOfferPreview.ts';
import type {
  CombinedPreview,
  PreviewAmount,
  PreviewNft,
  PreviewSide,
} from '../utils/combinedOfferPreview.ts';
import type { CombinedContents } from '../utils/offerContents.ts';
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

function renderPreviewNft(nft: PreviewNft, idx: number): JSX.Element {
  return (
    <div key={`nft-${idx}`} className='dexie-item dexie-nft-item'>
      {nft.thumbnail && <img src={nft.thumbnail} alt={nft.name} className='dexie-nft-thumbnail' />}
      <div className='dexie-nft-details'>
        <div className='dexie-nft-name'>
          {nft.nftId
            ? (
              <a
                href={`https://mintgarden.io/nfts/${nft.nftId}`}
                target='_blank'
                rel='noopener noreferrer'
                className='dexie-link'
              >
                {nft.name}
              </a>
            )
            : nft.name}
        </div>
        <div className='dexie-nft-meta'>
          {nft.collectionName &&
            (nft.collectionId
              ? (
                <a
                  href={`https://mintgarden.io/collections/${nft.collectionId}`}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='dexie-link dexie-nft-collection'
                >
                  {nft.collectionName}
                </a>
              )
              : <span className='dexie-nft-collection'>{nft.collectionName}</span>)}
          {nft.royaltyPercent > 0 && (
            <span className='dexie-nft-royalty'>• {nft.royaltyPercent}% royalty</span>
          )}
        </div>
      </div>
    </div>
  );
}

function renderPreviewAmount(amount: PreviewAmount, idx: number): JSX.Element {
  return (
    <div key={`amt-${idx}`} className='dexie-item dexie-asset-item'>
      • {amount.amount} {amount.code}
    </div>
  );
}

function renderSide(label: string, side: PreviewSide): JSX.Element | null {
  if (side.amounts.length === 0 && side.nfts.length === 0) return null;
  return (
    <div className='dexie-info-box'>
      <span className='dexie-section-label'>{label}</span>
      {side.amounts.map(renderPreviewAmount)}
      {side.nfts.map(renderPreviewNft)}
    </div>
  );
}

function amountListText(amounts: PreviewAmount[]): string {
  return amounts.map((amount) => `${amount.amount} ${amount.code}`).join(' + ');
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
  const [downloadAnimation, setDownloadAnimation] = useState<'success' | 'error' | ''>('');
  const [downloadEmoji, setDownloadEmoji] = useState<string>('💾');
  const [verification, setVerification] = useState<VerificationUiState>({ kind: 'idle' });
  const [detailsOpen, setDetailsOpen] = useState(false);

  const [preview, setPreview] = useState<CombinedPreview | null>(null);
  const [contents, setContents] = useState<CombinedContents | null>(null);

  const validOffers = offers.filter((offer) => offer.isValid && offer.content.trim());
  // dexie data arrives after an offer is added; rebuild the preview when it lands.
  const metadataKey = validOffers
    .map((offer) => (offer.dexieData?.success ? offer.dexieData.offerId ?? '1' : '0'))
    .join(',');

  // Update combined offer when valid offers change, then auto-verify on Coinset
  useEffect(() => {
    let cancelled = false;

    const updateCombinedOffer = async (): Promise<void> => {
      if (disabled || validOffers.length === 0) {
        setCombinedOffer('');
        setContents(null);
        setVerification({ kind: 'idle' });
        return;
      }

      setIsGenerating(true);
      setVerification({ kind: 'idle' });
      setDetailsOpen(false);

      try {
        const { combineOffers, parseOfferContents, verifyOfferedCoinsOnChain } = await import(
          '../services/walletSDK.ts'
        );
        const { combineOfferContents } = await import('../utils/offerContents.ts');
        const offerStrings = validOffers.map((offer) => offer.content);
        const result = combineOffers(offerStrings);

        if (cancelled) return;

        if (result.success && result.combinedOffer) {
          setCombinedOffer(result.combinedOffer);

          // Preview is derived from the offers' own coin spends so unlisted
          // offers still contribute to the totals.
          try {
            setContents(combineOfferContents(offerStrings.map(parseOfferContents)));
          } catch (error) {
            setContents(null);
            onLogError(`Could not build combined preview: ${error}`, 'warning');
          }

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
          setContents(null);
          setVerification({ kind: 'idle' });
          onLogError(result.error || 'Failed to combine offers', 'error');
        }
      } catch (error) {
        if (cancelled) return;
        setCombinedOffer('');
        setContents(null);
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

  // Re-label the preview when marketplace names/thumbnails arrive, without
  // re-combining or re-running the on-chain check.
  useEffect(() => {
    setPreview(contents ? buildCombinedPreview(contents, validOffers) : null);
  }, [contents, metadataKey]);

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

  const canDownload = combinedOffer.trim().length > 0;

  const handleDownloadOffer = (): void => {
    if (!canDownload) return;

    try {
      const filename = combinedOfferFileName(combinedOffer);
      const blob = new Blob([combinedOffer], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = globalThis.document.createElement('a');
      link.href = url;
      link.download = filename;
      globalThis.document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      onLogError(`Downloaded ${filename}`, 'info');
      setDownloadAnimation('success');
      setTimeout(() => setDownloadEmoji('✅'), 100);
      setTimeout(() => {
        setDownloadEmoji('💾');
        setDownloadAnimation('');
      }, 400);
    } catch (error) {
      onLogError(`Failed to download offer: ${error}`, 'error');
      setDownloadAnimation('error');
      setTimeout(() => setDownloadEmoji('☹'), 100);
      setTimeout(() => {
        setDownloadEmoji('💾');
        setDownloadAnimation('');
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
          <div className='output-actions'>
            <button
              type='button'
              className={`copy-button ${buttonAnimation} ${!combinedOffer ? 'hidden' : ''}`}
              onClick={handleCopyToClipboard}
              title='Copy to clipboard'
              disabled={!combinedOffer}
            >
              {buttonEmoji}
            </button>
            <button
              type='button'
              className={`copy-button ${downloadAnimation} ${!canDownload ? 'hidden' : ''}`}
              onClick={handleDownloadOffer}
              title='Download .offer file'
              disabled={!canDownload}
            >
              {downloadEmoji}
            </button>
          </div>
        </div>

        {renderVerification()}

        {combinedOffer && preview && (
          <div className='combined-preview'>
            <div className='combined-preview-header'>
              <img src={dexieDuckLogo} alt='dexie' className='dexie-logo' />
              <span className='combined-preview-title'>Combined preview</span>
              <span className='combined-preview-note'>from the combined offer</span>
            </div>

            <div className='dexie-info-boxes'>
              {renderSide('Requested:', preview.requested)}
              {renderSide('Offered:', preview.offered)}
            </div>

            {preview.royalties.length > 0 && (
              <div className='royalty-breakdown'>
                <span className='dexie-section-label'>Royalty breakdown:</span>
                <ul className='royalty-breakdown-list'>
                  {preview.royalties.map((entry, idx) => (
                    <li key={idx}>
                      {entry.nft.nftId
                        ? (
                          <a
                            href={`https://mintgarden.io/nfts/${entry.nft.nftId}`}
                            target='_blank'
                            rel='noopener noreferrer'
                            className='dexie-link'
                          >
                            {entry.nft.name}
                          </a>
                        )
                        : entry.nft.name}
                      {' — '}
                      <strong>{entry.nft.royaltyPercent}%</strong>
                      {' ('}
                      {amountListText(entry.amounts)}
                      {', included above)'}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {(preview.intermediates.amounts.length > 0 ||
              preview.intermediates.nfts.length > 0) && (
              <div className='royalty-breakdown'>
                <span className='dexie-section-label'>Cancels out between offers:</span>
                <ul className='royalty-breakdown-list'>
                  {preview.intermediates.amounts.map((amount, idx) => (
                    <li key={`i-amt-${idx}`}>
                      {amount.amount} {amount.code}
                    </li>
                  ))}
                  {preview.intermediates.nfts.map((nft, idx) => (
                    <li key={`i-nft-${idx}`}>
                      {nft.nftId
                        ? (
                          <a
                            href={`https://mintgarden.io/nfts/${nft.nftId}`}
                            target='_blank'
                            rel='noopener noreferrer'
                            className='dexie-link'
                          >
                            {nft.name}
                          </a>
                        )
                        : nft.name}
                    </li>
                  ))}
                </ul>
                <p className='combined-preview-note'>
                  Passes through the combined offer without reaching the taker.
                </p>
              </div>
            )}

            {preview.fee && <p className='combined-preview-note'>Maker fee: {preview.fee} XCH</p>}
          </div>
        )}
      </div>
    </div>
  );
}
