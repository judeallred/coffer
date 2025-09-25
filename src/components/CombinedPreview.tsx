import { useState } from 'preact/hooks';
import styled from 'styled-components';
import type { Offer, AssetData } from '../types/index.ts';

const Container = styled.section`
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--spacing-md);
`;

const Title = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
`;

const ValidOffersCount = styled.span`
  background-color: var(--color-primary);
  color: white;
  padding: var(--spacing-xs) var(--spacing-sm);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 600;
`;

const PreviewCard = styled.div`
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--spacing-xl);
  box-shadow: var(--shadow-md);
`;

const PreviewGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: var(--spacing-xl);
  align-items: flex-start;

  @media (max-width: 767px) {
    grid-template-columns: 1fr;
    gap: var(--spacing-lg);
    text-align: center;
  }
`;

const Column = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
`;

const ColumnHeader = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-light);
  margin: 0 0 var(--spacing-sm) 0;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const AssetList = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
`;

const AssetItem = styled.div`
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-md);
  background-color: var(--color-background);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
`;

const AssetIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-hover));
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1rem;
  font-weight: 600;
`;

const AssetDetails = styled.div`
  flex: 1;
`;

const AssetAmount = styled.div`
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--color-text);
`;

const AssetSymbol = styled.div`
  font-size: 0.875rem;
  color: var(--color-text-light);
  margin-top: 2px;
`;

const Arrow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  color: var(--color-primary);

  @media (max-width: 767px) {
    transform: rotate(90deg);
    font-size: 1.5rem;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: var(--spacing-2xl);
  color: var(--color-text-light);
`;

const EmptyIcon = styled.div`
  font-size: 3rem;
  margin-bottom: var(--spacing-md);
`;

const EmptyText = styled.p`
  font-size: 1.125rem;
  margin: 0 0 var(--spacing-sm) 0;
`;

const EmptySubtext = styled.p`
  font-size: 0.875rem;
  margin: 0;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: var(--spacing-md);
  justify-content: center;
  margin-top: var(--spacing-lg);
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  padding: var(--spacing-md) var(--spacing-lg);
  border-radius: var(--radius-md);
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid;

  ${props => props.$variant === 'primary' ? `
    background-color: var(--color-primary);
    border-color: var(--color-primary);
    color: white;

    &:hover:not(:disabled) {
      background-color: var(--color-primary-hover);
      border-color: var(--color-primary-hover);
    }
  ` : `
    background-color: var(--color-surface);
    border-color: var(--color-border);
    color: var(--color-text);

    &:hover:not(:disabled) {
      background-color: var(--color-background);
    }
  `}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }
`;

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
      <Container>
        <Header>
          <Title>Combined Offer Preview</Title>
          <ValidOffersCount>0 valid offers</ValidOffersCount>
        </Header>

        <PreviewCard>
          <EmptyState>
            <EmptyIcon>📝</EmptyIcon>
            <EmptyText>No valid offers yet</EmptyText>
            <EmptySubtext>
              Paste and validate Chia offers above to see the combined preview
            </EmptySubtext>
          </EmptyState>
        </PreviewCard>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>Combined Offer Preview</Title>
        <ValidOffersCount>{validOffers.length} valid offers</ValidOffersCount>
      </Header>

      <PreviewCard>
        <PreviewGrid>
          <Column>
            <ColumnHeader>Requested</ColumnHeader>
            <AssetList>
              {combinedRequested.length === 0 ? (
                <AssetItem>
                  <AssetIcon>—</AssetIcon>
                  <AssetDetails>
                    <AssetAmount>No assets requested</AssetAmount>
                  </AssetDetails>
                </AssetItem>
              ) : (
                combinedRequested.map((asset, index) => (
                  <AssetItem key={index}>
                    <AssetIcon>{getAssetIcon(asset.asset)}</AssetIcon>
                    <AssetDetails>
                      <AssetAmount>{asset.amount}</AssetAmount>
                      <AssetSymbol>{asset.asset}</AssetSymbol>
                    </AssetDetails>
                  </AssetItem>
                ))
              )}
            </AssetList>
          </Column>

          <Arrow>⇄</Arrow>

          <Column>
            <ColumnHeader>Offered</ColumnHeader>
            <AssetList>
              {combinedOffered.length === 0 ? (
                <AssetItem>
                  <AssetIcon>—</AssetIcon>
                  <AssetDetails>
                    <AssetAmount>No assets offered</AssetAmount>
                  </AssetDetails>
                </AssetItem>
              ) : (
                combinedOffered.map((asset, index) => (
                  <AssetItem key={index}>
                    <AssetIcon>{getAssetIcon(asset.asset)}</AssetIcon>
                    <AssetDetails>
                      <AssetAmount>{asset.amount}</AssetAmount>
                      <AssetSymbol>{asset.asset}</AssetSymbol>
                    </AssetDetails>
                  </AssetItem>
                ))
              )}
            </AssetList>
          </Column>
        </PreviewGrid>

        <ActionButtons>
          <Button 
            onClick={handleCopyToClipboard}
            disabled={validOffers.length === 0}
            $variant="primary"
          >
            📋 Copy to Clipboard
          </Button>
          <Button 
            onClick={() => handleDownload()}
            disabled={validOffers.length === 0}
            $variant="secondary"
          >
            💾 Download .offer File
          </Button>
        </ActionButtons>
      </PreviewCard>
    </Container>
  );
}
