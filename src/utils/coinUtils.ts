// Coin identity helpers for offer conflict detection and on-chain checks

/**
 * Convert bytes to a lowercase hex string (no 0x prefix).
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Settlement / requested coins in an offer use a 32-byte zero parent coin id.
 */
export function isZeroParent(parentCoinInfo: Uint8Array): boolean {
  if (parentCoinInfo.length !== 32) return false;
  for (let i = 0; i < parentCoinInfo.length; i++) {
    if (parentCoinInfo[i] !== 0) return false;
  }
  return true;
}

export interface CoinConflict {
  coinId: string;
  offerIndexes: number[]; // 1-based offer positions that share this coin
}

/**
 * Find offered (non-settlement) coins that appear in more than one offer.
 * Settlement coins with a zero parent are ignored — they are synthetic.
 */
export function findOfferedCoinConflicts(
  offerCoinIds: Array<{ offerIndex: number; coinIds: string[] }>,
): CoinConflict[] {
  const coinToOffers = new Map<string, Set<number>>();

  for (const { offerIndex, coinIds } of offerCoinIds) {
    for (const coinId of coinIds) {
      const existing = coinToOffers.get(coinId) ?? new Set<number>();
      existing.add(offerIndex);
      coinToOffers.set(coinId, existing);
    }
  }

  const conflicts: CoinConflict[] = [];
  for (const [coinId, offers] of coinToOffers) {
    if (offers.size > 1) {
      conflicts.push({
        coinId,
        offerIndexes: [...offers].sort((a, b) => a - b),
      });
    }
  }

  return conflicts.sort((a, b) => a.coinId.localeCompare(b.coinId));
}
