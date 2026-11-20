/// <reference lib="deno.ns" />
/**
 * Royalty-sensitive NFT offer combinations, mirroring the `test_aggregate_*`
 * cases in chia-wallet-sdk's `offers/royalty/tests.rs`.
 *
 * Each case builds real maker offers on the SDK simulator, combines them with
 * Coffer's `combineOffers`, and checks that:
 *   1. Coffer's own royalty preview (`parseOfferContents`) charges each NFT on
 *      the trade price its maker committed to,
 *   2. the SDK's `Offer.requestedRoyaltyAmounts` agrees on the combined offer,
 *   3. the combined offer can actually be taken on chain, paying each royalty
 *      address exactly what the NFT's transfer program asserts.
 */
import { assertEquals } from '@std/assert';
import {
  Action,
  AssetInfo,
  BlsPair,
  calculateTradePriceAmounts,
  calculateTradePrices,
  Cat,
  CatAssetInfo,
  catPuzzleHash,
  Clvm,
  Coin,
  CoinSpend,
  Constants,
  decodeOffer,
  encodeOffer,
  Id,
  Nft,
  NftAssetInfo,
  NotarizedPayment,
  Offer,
  payableTradePrices,
  Payment,
  Relation,
  RequestedPayments,
  Signature,
  Simulator,
  SpendBundle,
  Spends,
  standardPuzzleHash,
  TransferNftById,
} from 'chia-wallet-sdk-wasm';
import { combineOffers, initWalletSDK, parseOfferContents } from '../../src/services/walletSDK.ts';
import { bytesToHex } from '../../src/utils/coinUtils.ts';
import { XCH_KEY } from '../../src/utils/offerContents.ts';

const ROYALTY_A = new Uint8Array(32).fill(1);
const ROYALTY_B = new Uint8Array(32).fill(2);
const ROYALTY_C = new Uint8Array(32).fill(3);

interface Wallet {
  pair: BlsPair;
  puzzleHash: Uint8Array;
}

/** What a maker asks for: XCH and/or CATs keyed by hex asset id. */
interface Price {
  xch?: bigint;
  cats?: Record<string, bigint>;
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/** Royalty totals keyed by `<royalty puzzle hash>|<asset key>`. */
type RoyaltyTotals = Record<string, bigint>;

function royaltyKey(puzzleHash: Uint8Array, assetKey: string): string {
  return `${bytesToHex(puzzleHash)}|${assetKey}`;
}

class Tester {
  readonly sim = new Simulator();
  readonly settlement = Constants.settlementPaymentHash();
  private seed = 0n;
  private readonly keys: BlsPair[] = [];

  wallet(): Wallet {
    const pair = BlsPair.fromSeed(this.seed++);
    this.keys.push(pair);
    return { pair, puzzleHash: standardPuzzleHash(pair.pk) };
  }

  fund(owner: Wallet, amount: bigint): Coin {
    return this.sim.newCoin(owner.puzzleHash, amount);
  }

  balance(puzzleHash: Uint8Array): bigint {
    return this.sim.unspentCoins(puzzleHash, false).reduce((sum, coin) => sum + coin.amount, 0n);
  }

  catBalance(assetId: Uint8Array, p2PuzzleHash: Uint8Array): bigint {
    return this.balance(catPuzzleHash(assetId, p2PuzzleHash));
  }

  /** Applies actions to the spends and signs every pending spend with the owner's key. */
  private build(
    clvm: Clvm,
    owner: Wallet,
    spends: Spends,
    actions: Action[],
    relation: Relation,
  ): { outputs: ReturnType<ReturnType<Spends['prepare']>['spend']>; coinSpends: CoinSpend[] } {
    const finished = spends.prepare(spends.apply(actions), relation);
    for (const pending of finished.pendingSpends()) {
      finished.insert(
        pending.coin().coinId(),
        clvm.standardSpend(owner.pair.pk, clvm.delegatedSpend(pending.conditions())),
      );
    }
    const outputs = finished.spend();
    return { outputs, coinSpends: clvm.coinSpends() };
  }

  private submit(coinSpends: CoinSpend[], owner: Wallet): void {
    this.sim.spendCoins(coinSpends, [owner.pair.sk]);
  }

  mintNft(owner: Wallet, royaltyPuzzleHash: Uint8Array, royaltyBasisPoints: number): Nft {
    const clvm = new Clvm();
    const spends = new Spends(clvm, owner.puzzleHash);
    spends.addXch(this.fund(owner, 1n));
    const { outputs, coinSpends } = this.build(clvm, owner, spends, [
      Action.mintNft(
        clvm,
        clvm.nil(),
        Constants.nftMetadataUpdaterDefaultHash(),
        royaltyPuzzleHash,
        royaltyBasisPoints,
        1n,
      ),
    ], Relation.Unrelated);
    this.submit(coinSpends, owner);
    return outputs.nft(Id.new(0n));
  }

  issueCat(owner: Wallet, amount: bigint): Cat {
    const clvm = new Clvm();
    const spends = new Spends(clvm, owner.puzzleHash);
    spends.addXch(this.fund(owner, amount));
    const { outputs, coinSpends } = this.build(clvm, owner, spends, [
      Action.singleIssueCat(undefined, amount),
      Action.send(Id.new(0n), owner.puzzleHash, amount),
    ], Relation.Unrelated);
    this.submit(coinSpends, owner);
    const cat = outputs.cat(Id.new(0n)).find((cat) =>
      bytesToHex(cat.info.p2PuzzleHash) === bytesToHex(owner.puzzleHash) &&
      cat.coin.amount === amount
    );
    if (!cat) throw new Error('issued CAT not found');
    return cat;
  }

  private requestedPayments(
    clvm: Clvm,
    maker: Wallet,
    nonce: Uint8Array,
    price: Price,
  ): { requested: RequestedPayments; assetInfo: AssetInfo } {
    const requested = new RequestedPayments(clvm);
    const assetInfo = new AssetInfo(clvm);
    if (price.xch) {
      requested.addXch(new NotarizedPayment(nonce, [new Payment(maker.puzzleHash, price.xch)]));
    }
    for (const [assetHex, amount] of Object.entries(price.cats ?? {})) {
      const assetId = hexToBytes(assetHex);
      requested.addCat(
        assetId,
        new NotarizedPayment(nonce, [new Payment(maker.puzzleHash, amount)]),
      );
      assetInfo.insertCat(assetId, new CatAssetInfo());
    }
    return { requested, assetInfo };
  }

  private finishOffer(
    clvm: Clvm,
    coinSpends: CoinSpend[],
    requested: RequestedPayments,
    assetInfo: AssetInfo,
  ): string {
    // Signatures are supplied when the combined offer is taken on the simulator.
    const offer = Offer.fromInputSpendBundle(
      clvm,
      new SpendBundle(coinSpends, Signature.infinity()),
      requested,
      assetInfo,
    );
    return encodeOffer(offer.toSpendBundle());
  }

  /** Sells the NFTs for `price`, each committing to payable trade prices like a wallet would. */
  sellNfts(maker: Wallet, nfts: Nft[], price: Price): string {
    const clvm = new Clvm();
    const nonce = Offer.nonce(nfts.map((nft) => nft.coin.coinId()));
    const { requested, assetInfo } = this.requestedPayments(clvm, maker, nonce, price);
    const royaltyNftCount = nfts.filter((nft) => nft.info.royaltyBasisPoints > 0).length;

    const spends = new Spends(clvm, maker.puzzleHash);
    const actions: Action[] = [];
    for (const nft of nfts) {
      const id = Id.existing(nft.info.launcherId);
      const tradePrices = payableTradePrices(
        calculateTradePrices(
          calculateTradePriceAmounts(requested.amounts(), royaltyNftCount),
          assetInfo,
        ),
        nft.info.royaltyBasisPoints,
      );
      spends.addNft(nft);
      actions.push(Action.updateNft(id, [], new TransferNftById(undefined, tradePrices)));
      actions.push(Action.send(id, this.settlement, 1n));
    }
    for (const assertion of requested.assertions(assetInfo)) {
      spends.addRequiredCondition(assertion);
    }

    const { coinSpends } = this.build(clvm, maker, spends, actions, Relation.AssertConcurrent);
    return this.finishOffer(clvm, coinSpends, requested, assetInfo);
  }

  /** Offers one NFT for another with nothing fungible, so no trade price is committed. */
  swapNfts(maker: Wallet, offered: Nft, wanted: Nft): string {
    const clvm = new Clvm();
    const nonce = Offer.nonce([offered.coin.coinId()]);
    const requested = new RequestedPayments(clvm);
    requested.addNft(
      wanted.info.launcherId,
      new NotarizedPayment(nonce, [new Payment(maker.puzzleHash, 1n)]),
    );
    const assetInfo = new AssetInfo(clvm);
    assetInfo.insertNft(
      wanted.info.launcherId,
      new NftAssetInfo(
        wanted.info.metadata,
        wanted.info.metadataUpdaterPuzzleHash,
        wanted.info.royaltyPuzzleHash,
        wanted.info.royaltyBasisPoints,
      ),
    );

    const spends = new Spends(clvm, maker.puzzleHash);
    spends.addNft(offered);
    for (const assertion of requested.assertions(assetInfo)) {
      spends.addRequiredCondition(assertion);
    }
    const id = Id.existing(offered.info.launcherId);
    const { coinSpends } = this.build(clvm, maker, spends, [
      Action.updateNft(id, [], new TransferNftById(undefined, [])),
      Action.send(id, this.settlement, 1n),
    ], Relation.AssertConcurrent);
    return this.finishOffer(clvm, coinSpends, requested, assetInfo);
  }

  tradeXchForCat(maker: Wallet, offered: bigint, assetId: Uint8Array, wanted: bigint): string {
    const clvm = new Clvm();
    const coin = this.fund(maker, offered);
    const { requested, assetInfo } = this.requestedPayments(clvm, maker, coin.coinId(), {
      cats: { [bytesToHex(assetId)]: wanted },
    });
    const spends = new Spends(clvm, maker.puzzleHash);
    spends.addXch(coin);
    for (const assertion of requested.assertions(assetInfo)) {
      spends.addRequiredCondition(assertion);
    }
    const { coinSpends } = this.build(clvm, maker, spends, [
      Action.send(Id.xch(), this.settlement, offered),
    ], Relation.AssertConcurrent);
    return this.finishOffer(clvm, coinSpends, requested, assetInfo);
  }

  /** What the SDK says a taker owes in royalties for the combined offer. */
  sdkRequestedRoyalties(combinedOffer: string): { xch: bigint; cat: (id: Uint8Array) => bigint } {
    const amounts = Offer.fromSpendBundle(new Clvm(), decodeOffer(combinedOffer))
      .requestedRoyaltyAmounts();
    return { xch: amounts.xch(), cat: (id) => amounts.cat(id) };
  }

  /** Takes the combined offer the way a wallet would, then confirms it on the simulator. */
  take(
    taker: Wallet,
    combinedOffer: string,
    add: { xch?: Coin[]; cats?: Cat[]; nfts?: Nft[] },
  ): void {
    const clvm = new Clvm();
    const offer = Offer.fromSpendBundle(clvm, decodeOffer(combinedOffer));

    const spends = new Spends(clvm, taker.puzzleHash);
    spends.addOfferedCoins(offer);
    for (const coin of add.xch ?? []) spends.addXch(coin);
    for (const cat of add.cats ?? []) spends.addCat(cat);
    for (const nft of add.nfts ?? []) spends.addNft(nft);

    const offeredNfts = new Set(offer.offeredNftLauncherIds().map(bytesToHex));
    const actions: Action[] = [];
    for (const launcherId of offer.requestedPayments().nftLauncherIds()) {
      if (offeredNfts.has(bytesToHex(launcherId))) continue;
      actions.push(Action.updateNft(
        Id.existing(launcherId),
        [],
        new TransferNftById(undefined, offer.requestedNftTradePrices(launcherId)),
      ));
    }
    actions.push(...offer.requestedPayments().actions());
    actions.push(...offer.requestedRoyaltyPayments().actions());

    const { coinSpends } = this.build(clvm, taker, spends, actions, Relation.AssertConcurrent);
    const transaction = offer.take(new SpendBundle(coinSpends, Signature.infinity()));
    this.sim.spendCoins(transaction.coinSpends, this.keys.map((pair) => pair.sk));
  }
}

/** Combines the offers with Coffer and returns the combined offer plus Coffer's royalty totals. */
function combineWithCoffer(offers: string[]): { combined: string; royalties: RoyaltyTotals } {
  const result = combineOffers(offers);
  assertEquals(result.success, true, result.error);
  const combined = result.combinedOffer!;

  const royalties: RoyaltyTotals = {};
  for (const charge of parseOfferContents(combined).royalties) {
    for (const amount of charge.amounts) {
      const key = `${charge.nft.royaltyPuzzleHash}|${amount.key}`;
      royalties[key] = (royalties[key] ?? 0n) + amount.mojos;
    }
  }
  return { combined, royalties };
}

function catKey(assetId: Uint8Array): string {
  return `cat:${bytesToHex(assetId)}`;
}

Deno.test('Combined NFT offers charge royalties per committed trade price', async (t) => {
  await initWalletSDK();

  await t.step('same price, different royalties', () => {
    const s = new Tester();
    const [alice, bob, carol] = [s.wallet(), s.wallet(), s.wallet()];
    const aliceNft = s.mintNft(alice, ROYALTY_A, 500);
    const bobNft = s.mintNft(bob, ROYALTY_B, 1000);

    const { combined, royalties } = combineWithCoffer([
      s.sellNfts(alice, [aliceNft], { xch: 10_000n }),
      s.sellNfts(bob, [bobNft], { xch: 10_000n }),
    ]);

    assertEquals(royalties, {
      [royaltyKey(ROYALTY_A, XCH_KEY)]: 500n,
      [royaltyKey(ROYALTY_B, XCH_KEY)]: 1000n,
    });
    assertEquals(s.sdkRequestedRoyalties(combined).xch, 1500n);

    s.take(carol, combined, { xch: [s.fund(carol, 21_500n)] });
    assertEquals(s.balance(ROYALTY_A), 500n);
    assertEquals(s.balance(ROYALTY_B), 1000n);
    assertEquals(s.balance(carol.puzzleHash), 0n);
  });

  await t.step('different prices, different royalties', () => {
    const s = new Tester();
    const [alice, bob, carol] = [s.wallet(), s.wallet(), s.wallet()];
    const aliceNft = s.mintNft(alice, ROYALTY_A, 500);
    const bobNft = s.mintNft(bob, ROYALTY_B, 1000);

    const { combined, royalties } = combineWithCoffer([
      s.sellNfts(alice, [aliceNft], { xch: 10_000n }),
      s.sellNfts(bob, [bobNft], { xch: 30_000n }),
    ]);

    assertEquals(royalties, {
      [royaltyKey(ROYALTY_A, XCH_KEY)]: 500n,
      [royaltyKey(ROYALTY_B, XCH_KEY)]: 3000n,
    });
    assertEquals(s.sdkRequestedRoyalties(combined).xch, 3500n);

    s.take(carol, combined, { xch: [s.fund(carol, 43_500n)] });
    assertEquals(s.balance(ROYALTY_A), 500n);
    assertEquals(s.balance(ROYALTY_B), 3000n);
    assertEquals(s.balance(carol.puzzleHash), 0n);
  });

  await t.step('different prices, same royalty rate', () => {
    const s = new Tester();
    const [alice, bob, carol] = [s.wallet(), s.wallet(), s.wallet()];
    const aliceNft = s.mintNft(alice, ROYALTY_A, 500);
    const bobNft = s.mintNft(bob, ROYALTY_B, 500);

    const { combined, royalties } = combineWithCoffer([
      s.sellNfts(alice, [aliceNft], { xch: 10_000n }),
      s.sellNfts(bob, [bobNft], { xch: 30_000n }),
    ]);

    assertEquals(royalties, {
      [royaltyKey(ROYALTY_A, XCH_KEY)]: 500n,
      [royaltyKey(ROYALTY_B, XCH_KEY)]: 1500n,
    });
    assertEquals(s.sdkRequestedRoyalties(combined).xch, 2000n);

    s.take(carol, combined, { xch: [s.fund(carol, 42_000n)] });
    assertEquals(s.balance(ROYALTY_A), 500n);
    assertEquals(s.balance(ROYALTY_B), 1500n);
    assertEquals(s.balance(carol.puzzleHash), 0n);
  });

  await t.step('identical royalties for different NFTs are both paid', () => {
    const s = new Tester();
    const [alice, bob, carol] = [s.wallet(), s.wallet(), s.wallet()];
    const aliceNft = s.mintNft(alice, ROYALTY_A, 500);
    const bobNft = s.mintNft(bob, ROYALTY_A, 500);

    const { combined, royalties } = combineWithCoffer([
      s.sellNfts(alice, [aliceNft], { xch: 10_000n }),
      s.sellNfts(bob, [bobNft], { xch: 10_000n }),
    ]);

    assertEquals(royalties, { [royaltyKey(ROYALTY_A, XCH_KEY)]: 1000n });
    assertEquals(s.sdkRequestedRoyalties(combined).xch, 1000n);

    s.take(carol, combined, { xch: [s.fund(carol, 21_000n)] });
    assertEquals(s.balance(ROYALTY_A), 1000n);
    assertEquals(s.balance(carol.puzzleHash), 0n);
  });

  await t.step('multi-NFT offer combined with a single-NFT offer', () => {
    const s = new Tester();
    const [alice, bob, carol] = [s.wallet(), s.wallet(), s.wallet()];
    const first = s.mintNft(alice, ROYALTY_A, 500);
    const second = s.mintNft(alice, ROYALTY_B, 500);
    const bobNft = s.mintNft(bob, ROYALTY_C, 500);

    const { combined, royalties } = combineWithCoffer([
      s.sellNfts(alice, [first, second], { xch: 30_000n }),
      s.sellNfts(bob, [bobNft], { xch: 10_000n }),
    ]);

    // Alice's two NFTs split her 30,000 price, so each commits to 15,000.
    assertEquals(royalties, {
      [royaltyKey(ROYALTY_A, XCH_KEY)]: 750n,
      [royaltyKey(ROYALTY_B, XCH_KEY)]: 750n,
      [royaltyKey(ROYALTY_C, XCH_KEY)]: 500n,
    });
    assertEquals(s.sdkRequestedRoyalties(combined).xch, 2000n);

    s.take(carol, combined, { xch: [s.fund(carol, 42_000n)] });
    assertEquals(s.balance(ROYALTY_A), 750n);
    assertEquals(s.balance(ROYALTY_B), 750n);
    assertEquals(s.balance(ROYALTY_C), 500n);
    assertEquals(s.balance(carol.puzzleHash), 0n);
  });

  await t.step('NFTs sold for different assets pay royalties in their own asset', () => {
    const s = new Tester();
    const [alice, bob, carol] = [s.wallet(), s.wallet(), s.wallet()];
    const carolCat = s.issueCat(carol, 10_500n);
    const assetId = carolCat.info.assetId;
    const aliceNft = s.mintNft(alice, ROYALTY_A, 500);
    const bobNft = s.mintNft(bob, ROYALTY_B, 500);

    const { combined, royalties } = combineWithCoffer([
      s.sellNfts(alice, [aliceNft], { xch: 10_000n }),
      s.sellNfts(bob, [bobNft], { cats: { [bytesToHex(assetId)]: 10_000n } }),
    ]);

    assertEquals(royalties, {
      [royaltyKey(ROYALTY_A, XCH_KEY)]: 500n,
      [royaltyKey(ROYALTY_B, catKey(assetId))]: 500n,
    });
    const sdk = s.sdkRequestedRoyalties(combined);
    assertEquals(sdk.xch, 500n);
    assertEquals(sdk.cat(assetId), 500n);

    s.take(carol, combined, { xch: [s.fund(carol, 10_500n)], cats: [carolCat] });
    assertEquals(s.balance(ROYALTY_A), 500n);
    assertEquals(s.catBalance(assetId, ROYALTY_A), 0n);
    assertEquals(s.balance(ROYALTY_B), 0n);
    assertEquals(s.catBalance(assetId, ROYALTY_B), 500n);
    assertEquals(s.balance(carol.puzzleHash), 0n);
    assertEquals(s.catBalance(assetId, carol.puzzleHash), 0n);
  });

  await t.step('NFT sale combined with an unrelated CAT trade', () => {
    const s = new Tester();
    const [alice, bob, carol] = [s.wallet(), s.wallet(), s.wallet()];
    const carolCat = s.issueCat(carol, 21_000n);
    const assetId = carolCat.info.assetId;
    const nft = s.mintNft(alice, ROYALTY_A, 500);

    const { combined, royalties } = combineWithCoffer([
      s.sellNfts(alice, [nft], { xch: 10_000n }),
      s.tradeXchForCat(bob, 5000n, assetId, 20_000n),
    ]);

    // The CAT trade's request must not inflate the NFT's royalty.
    assertEquals(royalties, { [royaltyKey(ROYALTY_A, XCH_KEY)]: 500n });
    assertEquals(s.sdkRequestedRoyalties(combined).xch, 500n);

    s.take(carol, combined, { xch: [s.fund(carol, 5500n)], cats: [carolCat] });
    assertEquals(s.balance(ROYALTY_A), 500n);
    assertEquals(s.catBalance(assetId, ROYALTY_A), 0n);
    assertEquals(s.balance(carol.puzzleHash), 0n);
    assertEquals(s.catBalance(assetId, carol.puzzleHash), 1000n);
  });

  await t.step('NFT-for-NFT swap combined with an NFT sale', () => {
    const s = new Tester();
    const [alice, bob, carol] = [s.wallet(), s.wallet(), s.wallet()];
    const nftA = s.mintNft(alice, ROYALTY_A, 300);
    const nftB = s.mintNft(bob, ROYALTY_B, 300);
    const nftC = s.mintNft(carol, ROYALTY_C, 300);

    const { combined, royalties } = combineWithCoffer([
      s.swapNfts(alice, nftA, nftC),
      s.sellNfts(bob, [nftB], { xch: 1000n }),
    ]);

    // Alice's NFT commits to no trade price, so only Bob's NFT is owed a royalty.
    assertEquals(royalties, { [royaltyKey(ROYALTY_B, XCH_KEY)]: 30n });
    assertEquals(s.sdkRequestedRoyalties(combined).xch, 30n);

    s.take(carol, combined, { xch: [s.fund(carol, 1030n)], nfts: [nftC] });
    assertEquals(s.balance(bob.puzzleHash), 1000n);
    assertEquals(s.balance(ROYALTY_A), 0n);
    assertEquals(s.balance(ROYALTY_B), 30n);
    assertEquals(s.balance(ROYALTY_C), 0n);
  });
});
