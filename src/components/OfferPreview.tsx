import type { OfferData } from '../types/index.ts';


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

  const formatAssetList = (assets: typeof requested): JSX.Element[] => {
    if (assets.length === 0) return [<span key="nothing">Nothing</span>];
    
    return assets.map((asset, index) => {
      if (asset.isNFT && asset.nftImageUrl && asset.nftName) {
        return (
          <span key={index} className="nft-asset">
            <img 
              src={asset.nftImageUrl} 
              alt={asset.nftName}
              className="nft-thumbnail"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <span className="nft-name">{asset.nftName}</span>
          </span>
        );
      } else {
        return (
          <span key={index} className="regular-asset">
            {asset.amount} {asset.asset}
          </span>
        );
      }
    });
  };

  return (
    <div className="offer-preview-container">
      <div className="offer-preview-inline">
        <div className="offer-preview-section">
          <span className="offer-preview-label">Requesting:</span>
          <div className="offer-preview-assets">
            {formatAssetList(requested).map((asset, i) => (
              <span key={i}>
                {asset}
                {i < formatAssetList(requested).length - 1 && ", "}
              </span>
            ))}
          </div>
        </div>
        
        <span className="offer-preview-arrow-inline">⇄</span>
        
        <div className="offer-preview-section">
          <span className="offer-preview-label">Offering:</span>
          <div className="offer-preview-assets">
            {formatAssetList(offered).map((asset, i) => (
              <span key={i}>
                {asset}
                {i < formatAssetList(offered).length - 1 && ", "}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
