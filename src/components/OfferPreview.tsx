import styled from 'styled-components';
import type { OfferData } from '../types/index.ts';

const Container = styled.div`
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--spacing-md);
  margin-top: var(--spacing-sm);
`;

const PreviewGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: var(--spacing-md);
  align-items: center;
`;

const Column = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
`;

const ColumnHeader = styled.h4`
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-light);
  margin: 0 0 var(--spacing-sm) 0;
`;

const AssetItem = styled.div`
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm);
  background-color: var(--color-background);
  border-radius: var(--radius-sm);
`;

const AssetIcon = styled.div`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--color-primary), var(--color-primary-hover));
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 0.75rem;
  font-weight: 600;
`;

const AssetInfo = styled.div`
  flex: 1;
`;

const AssetAmount = styled.span`
  font-weight: 600;
  color: var(--color-text);
  font-size: 0.875rem;
`;

const AssetSymbol = styled.span`
  color: var(--color-text-light);
  font-size: 0.75rem;
  margin-left: var(--spacing-xs);
`;

const Arrow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-light);
  font-size: 1.25rem;
`;


interface OfferPreviewProps {
  data: OfferData;
}

const getAssetIcon = (asset: string): string => {
  const assetUpper = asset.toUpperCase();
  if (assetUpper === 'XCH') return '🌱';
  if (assetUpper === 'USDS') return '💵';
  if (assetUpper.includes('CAT') || assetUpper.includes('TOKEN')) return '🪙';
  return assetUpper.charAt(0);
};

export function OfferPreview({ data }: OfferPreviewProps): JSX.Element {
  const requested = data.requested || [];
  const offered = data.offered || [];

  return (
    <Container>
      <PreviewGrid>
        <Column>
          <ColumnHeader>Requested</ColumnHeader>
          {requested.length === 0 ? (
            <AssetItem>
              <AssetIcon>—</AssetIcon>
              <AssetInfo>
                <AssetAmount>No assets requested</AssetAmount>
              </AssetInfo>
            </AssetItem>
          ) : (
            requested.map((asset, index) => (
              <AssetItem key={index}>
                <AssetIcon>{getAssetIcon(asset.asset)}</AssetIcon>
                <AssetInfo>
                  <AssetAmount>{asset.amount}</AssetAmount>
                  <AssetSymbol>{asset.asset}</AssetSymbol>
                </AssetInfo>
              </AssetItem>
            ))
          )}
        </Column>

        <Arrow>⇄</Arrow>

        <Column>
          <ColumnHeader>Offered</ColumnHeader>
          {offered.length === 0 ? (
            <AssetItem>
              <AssetIcon>—</AssetIcon>
              <AssetInfo>
                <AssetAmount>No assets offered</AssetAmount>
              </AssetInfo>
            </AssetItem>
          ) : (
            offered.map((asset, index) => (
              <AssetItem key={index}>
                <AssetIcon>{getAssetIcon(asset.asset)}</AssetIcon>
                <AssetInfo>
                  <AssetAmount>{asset.amount}</AssetAmount>
                  <AssetSymbol>{asset.asset}</AssetSymbol>
                </AssetInfo>
              </AssetItem>
            ))
          )}
        </Column>
      </PreviewGrid>
    </Container>
  );
}
