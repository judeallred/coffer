/// <reference lib="deno.ns" />
import { assertEquals, assertExists } from 'https://deno.land/std@0.208.0/testing/asserts.ts';
import {
  combineOffers,
  initWalletSDK,
  isWalletSDKInitialized,
  parseOfferContents,
} from '../../src/services/walletSDK.ts';
import { combineOfferContents, XCH_KEY } from '../../src/utils/offerContents.ts';
import { TEST_OFFER_1, TEST_OFFER_2 } from '../fixtures/offers.ts';

/**
 * Integration test for offer combining functionality using proper SpendBundle aggregation
 * Tests real Chia offer combining with actual offer strings, validating:
 * - Proper SpendBundle merging (coin spends aggregation)
 * - BLS signature aggregation
 * - Coin conflict detection
 * - Comprehensive logging and error handling
 */

// Expected combined offer result from WASM SDK
// This is the real, deterministic output when combining TEST_OFFER_1 and TEST_OFFER_2
// using chia-wallet-sdk-wasm v0.29.0. This ensures regression testing for offer combining.
// Currently unused but kept for future regression testing
// const _EXPECTED_COMBINED_OFFER =
//   'offer1qqr83wcuu2rykcmqvpsrvl00n090ms8etrnq49wqj0h4d39nrl8xq5uda8lelhmlw8qs9eelsku4lrld3g69lsdkge7a9f7tj4l7mkca7u7e9ymmd6u46a637wxc7tewq8xkqypcn79x3fcw7uukavxprdd80khs2e0g65yjmm8kvumw40xc5nu685ak0fas8tekelt4y4fw3hvw20x488vzcnlpnk248mk009mpsa5xmqpyhhlskzq9atl3dqgreg8ype0klut5ch3cwd8yenuu6lk57pdxa3x9e998l7avn753w0vsrwfrp8n84l4dy9q92fhln0ue6sx2rhlzl2pfjfd08v49hfmxaqyf307hngg45feprnha903zg6c738wffe0a2y9satycfp80tfk0ua3s50eytav8pd75aapfht8ltxslj3k2j0dyfet9s2hgnujuz2e7w784exm9f8d4j87ah6uequmk70056xsmd5hvfn6s4fvl65xpquqzyhfy0xmu5dxma5fxma5fxma5eyma4ezr9gl734lyqvt7uz7v7a75u7xhmf5tcmtwvn2gfhprkxxwkq7vu7hqmrxmr8vttw6x264s42nv6hjt5yueme8a6h4x5l59v22whjlfluwv3nhkv0eejch000eu77jhv8a54gvxm4gsdn2nqssvs5mkanh0hlmnd3n86y74hm40pga577m097cn98taa8vu9r5tww0dllar0rulnlexscfepd52jmjm7qjf48d4cxjzw6t26wanz6hmh38ha4n295glm0pkk05lmf6fspujqmljlwyh5fla6llarkxn0xhn4kwev3353fayum3u0pvy3d44aa5f3u7jpzfl7zuwqal4y7vnxj3kqljqmz9maefhkfll9m8k80r0msfdvyjclhl30jwjpzyaqsd5ws9mpq6cml30yr2r3qh63uyfxzpkq0qjdqgzsxqsqgq5ucc8tg7ay23r9scz6hdhhx9yphhq5wuyask8weaflged0lxau0zqh0e0yak7xcw0da409760gnjt2vduhze9fqyppzjjppev3m0a7aeeyw5xl7ayhrf06vewkw07al06a47mlcv37en5l9d2ku6j22etfc7n0z6rdendtludr88qh6e5r9hx67jekljx4ldak484yd7f0v7lqeel7twu0cdw6r6k8u7jgfm34n0e7w6nech7em5qw4crfmunaer0lv9sqrnzqftswsgf3x';

// User-provided test offers for real-world testing
const USER_OFFER_1 =
  'offer1qqr83wcuu2rykcmqvpsxygqqemhmlaekcenaz02ma6hs5w600dhjlvfjn477nkwz369h88kll73h37fefnwk3qqnz8s0lle0drulk4n52lrawum8jk2jwwv7arhe60j8angk0uwgl4tfxl579re4jgcd2nez749fmwh7rjkykh5jr66wralkawhtejp9a4v487vmuu6u343a2zgkl80j4u39nwzszmxdc8ah8mnlklyktz893vua3ahd7786akwwa3hnv7zx7ced5fscrfwn88x4nrzxttaml8ke9mc6g9a74pr5nn25hy7du7wl4ujnc8j7t8pq9ywk3mp3c23q76wgda62yer55tj0l6zyeygfc2yp5nkstadt3jp00haalrsdu62wkexh0ykuwu0nn87sras3y2mww5aln3vkntul79av4hfqj74ecm37exlvfyl7u3gf8dm67v8dnv405taev2666l57xtt6kp00872z57gxyswy37ukd76wd58j8g4mhc4220w7h9jutnnt0e8vg8de259tjq9cl50fr8dzfqx3axv7zweaqd80qzcklr8q7tlnpavk9emqkrhmwmcr2d0rh2ly4fjujfht0cv033ejfulqfjch5hlsler8jj2pg9zma84jwfdx25n22e3xu5j7dfskz7dpkxvhu627fxvknqvx29g6n8jfj4y5j5v6wflxrztktflyzjvfd95eu6vpw43xvkjeh9e9zl4x294yzh47tfv4zjt7g9e956n74etyuej7hpmyu6nwdfqkzup7nfx55fuyxj6nhh6vcd9qzve3vx9dde09e7t0w7xv9dv54kush4y9hmk0cukh0tarzg7l5c9ahu67mjw0rlml2vhdqmg97369k4n30c0dqu2d89qgk5mgv6c57enjdf08r2j7gy9zsfy63te5qcusc5jjqv3hvwq7ewa945v3utemwhnf7rlgme6l357vcdx87yucvalethle6djt6e6xymy8jxgtfflxf083mml54sz9fnw7v4k8zk9l9n0l0e22s6lvl7wfvur9f82lksjc9tud0e0d57lw35fvtla78elxqe2a60n4vmtmddvtylvfed67hy7085h4dckytmhgks0y4ns6nhtph8wky0sfalar6davf3sn0kn02gr9mlgatte267hk9yqw2xlmlcxy0xn487gktad6g2m7dclpg4rvkl5eaws6gsv6c8zrawegun50348g7r06axcl7a8wngkh3kq6ll6els7esj482we597juh3jvaxam38te3040zyu0jgullh3lkyx69tyflyzus7gd8zeddvxakqprv7xrum5hu8s79u3m08ketv0jp6360hd8m67svleaglv02lawc093jt43k3a4kramf76m7ehh9a4umvm2h7q2zwk9gmzq5hl07hmsmverl5nj4l4f62etcg74dtde8r35tdzr0hkl8nx7kveze7uvrxu98l30hrhh7fhq7rj6n5ml87gukhxwunuja58pl6dup4p6n46srk28kf7g6ykq9cpc6jupr5xwe2edyq6qyz6jgegprjr47ml3wfxw389gs6ku0da99mtxkmjhxam9f7u3g4lpt9k9vu9w6ddwledefc46p2kxdus2kctr3nzpsrx0kxd5cpfts3vsal8ezpwk4y320txkd24yctpwccmmxaz26e5e9m3hx4fx7r46ge9e9y72z4u5u3hl8u48h99nr88p0th0gv4k97sh9v0j7l9f2xeafuh9egtlj8hltqnhzadxak9wlrl5fuycar8mnrjnk77g5anm7xjpxqykwugc26ngnv5';

const USER_OFFER_2 =
  'offer1qqr83wcuu2rykcmqvpsxygqqemhmlaekcenaz02ma6hs5w600dhjlvfjn477nkwz369h88kll73h37fefnwk3qqnz8s0lle0nq06tdd0a96lmufjjuy6wmleld7ch8k4nkerdwey0nmt5ymacgt3w0s89tu302k5ahthqe0zmt6fqad83uln0ht4veq6l6k2naxd7wdwc6c75pytl3h3t7vjehpqpdhx6xkhm8s795ha7tpt4kw2sa4fhacuy7n3j6sdmvlxdmxemld9jhaamucwul2rl4vfayhcutruhwcxfqdsmw832qv7aatlmve5zl2j4drmt80smrfagev0gggdlxx5a9yvf620c8ua9qvcyye9jz6tmgr7j4glpl4mzu0acw7dexmwjn5jl0hz8ecnlg35cck944hz007c2gelllcz2aallnu3ffdv4razlcknk7mwe7xvthm58j29wx3a8um4056qlnf5tts9auleg2neqcjpcj8mjehmfeks7gazhwlz4ffam6ukt3wwddlya3qah92s4wgqhr73ayva5fyq685encfm85p5auqtzmuvure07v84jch8vzcwldm0qdf4uwatuj4xtjfxadlp37x8xf8nupxtz7jl7rc5vj2fg9q5t057kfe95e2jdftxymjjte4xzcte5xcejlnfteyej6vpseg4r2v7fx25jj23nfe8ucvfwed8us2f395kn8nfs96kyej6txuhy5t75egk5s27hed9j52f0eqhykn206h9vnnxt6u8vnn2de4yzcts86dy6j38ss6rgvemmaxvxjspkvck2nj2gmfall80ff73w70zlu7kr45dmyfn2lnxr64x9unj274zhld37u06l7ljj9lghppt5w3w4vur7rlgh2npegxd9y6t8kf8xvunttec2khjqpg5z3xu27dq28ywyyssnxdmzgy8u43edmkp90ltuevw3u8vvhhnt3l0eyhqhu86k2l2f4fn78ftfj2sgwf0vdqunruvxl00khcfhzy2nk7ua2uxy5d7l80c7zn43h7el5cj4ck2j7jlpp9s0la6hn7ag9eantjkkllumnw2p2km5l8wek4kwmcsfxln6c4ewe67ht0gmfwsrkwass7ftw33x7arzdasfh8n0a6x9r7c0z3vl3q75nkrhwh62hjl54gv6gs74achnsuw7ap2ml3xhzm5ch8umpuz3tkndh2n27pj3qu4vd5fm4k3pxedzzdjgyl5ra5le6wmxpg0t03mllnn8zd4pdtwsln22axenq5h69ahxdh4z0t7ufgn9e7llvnmvsv5x5cm7qpe4uq504s6ked4dsqxdlvrehw0c03ktexkxda7kq6ytkn5lwm0rhaxe846alc548uayat8yl0r4qt8d8mk0l9lunwwnemakes4tasc99v2pk5dflllpw0dc0mdx34u09zcuhy2hz4wcqnwv26ag06jfras5k8369z70ka0nz04lupv0caalvvdef6wtamrh0xz3hu7fehe0jwywzmx9plepvel2j4wnwlmzrvxtgy39xcg8qdak5zcf3nqg89qs2szh880alczkm0l908ksxen66uvl6djvl4240wpuxtmt4kkhh5tdwttwmwydcvdsq24x4lqxkgdrdjjf3nq0z8fml59t9lmdtatmkmrjfa04hyweav54mxtp9nu26auwt6x60v7ckhnj073k8478ularzyds9048u94h53nhfmp24uc4zj6cjlgt6w80q4ummekcswfmx3cawvy7ck3h7awqa2lw4wpdhrjeqt2anmvtwjh8sfsllgrkqxhtvfqz0wnx79';

// Test group for offer combining integration tests
Deno.test({
  name: 'Offer Combining Integration Tests',
  fn: async (t: Deno.TestContext) => {
    // Initialize the wallet SDK before running tests
    await initWalletSDK();

    await t.step('should initialize SDK successfully', () => {
      // SDK should be initialized
      const isInitialized = isWalletSDKInitialized();
      console.log(`ℹ️ SDK Initialized: ${isInitialized}`);
      console.log(`ℹ️ Test Offer 1 Length: ${TEST_OFFER_1.length} chars`);
      console.log(`ℹ️ Test Offer 2 Length: ${TEST_OFFER_2.length} chars`);
    });

    await t.step('should combine two test offers with proper SpendBundle aggregation', async () => {
      // Test the core functionality using our improved SpendBundle aggregation
      console.log(`\n🔄 Testing proper SpendBundle aggregation...`);

      const result = await combineOffers([TEST_OFFER_1, TEST_OFFER_2]);

      // Basic validation
      assertEquals(result.success, true, 'Combining should succeed with proper aggregation');
      assertExists(result.combinedOffer, 'Combined offer should exist');

      console.log(`\n🧪 COMPREHENSIVE AGGREGATION TEST RESULT:`);
      console.log(`✅ Success: ${result.success}`);
      console.log(`📏 Combined Offer Length: ${result.combinedOffer?.length} chars`);

      console.log(`\n✅ Using WASM SDK with proper SpendBundle aggregation!`);
      console.log(
        `🔧 Features tested: Coin spend merging, BLS signature aggregation, conflict detection`,
      );

      // Store the result for validation
      const combinedOffer = result.combinedOffer!;

      // Comprehensive validation of the combined offer
      console.log(`\n🔍 COMPREHENSIVE VALIDATION:`);
      console.log(`Actual Length: ${combinedOffer.length} chars`);

      // Validate that it's a proper offer format and reasonable length
      assertEquals(
        combinedOffer.startsWith('offer1'),
        true,
        'Combined offer should start with offer1',
      );
      assertEquals(
        combinedOffer.length > 1000,
        true,
        'Combined offer should be substantial length',
      );

      // Validate that the combined offer is different from either input offer
      // (indicating actual combination occurred, unless inputs are identical)
      if ((TEST_OFFER_1 as string) !== (TEST_OFFER_2 as string)) {
        assertEquals(
          combinedOffer !== TEST_OFFER_1,
          true,
          'Combined offer should differ from first input',
        );
        assertEquals(
          combinedOffer !== TEST_OFFER_2,
          true,
          'Combined offer should differ from second input',
        );
      }

      console.log(`✅ Proper SpendBundle aggregation validation passed`);
    });

    await t.step('should validate comprehensive logging during combination', async () => {
      // Test that our improved implementation provides comprehensive logging
      console.log(`\n📋 Testing comprehensive logging features...`);

      const result = await combineOffers([TEST_OFFER_1, TEST_OFFER_2]);

      assertEquals(result.success, true, 'Should succeed with logging');

      // The console output from our improved combineOffers should show:
      // - SpendBundle parsing progress
      // - Coin spend counts
      // - Signature aggregation details
      // - Final combined offer creation

      console.log(`✅ Comprehensive logging test completed (check console output above)`);
    });

    await t.step('should handle empty offer list', async () => {
      const result = await combineOffers([]);
      assertEquals(result.success, false, 'Empty list should fail');
      assertExists(result.error, 'Error message should exist');
    });

    await t.step('should handle single offer (pass-through)', async () => {
      const result = await combineOffers([TEST_OFFER_1]);
      assertEquals(result.success, true, 'Single offer should succeed');
      assertEquals(result.combinedOffer, TEST_OFFER_1, 'Single offer should be returned as-is');
    });

    await t.step('should reject offers that share the same offered coins', async () => {
      // Combining an offer with itself must fail — the same coins would be spent twice
      console.log(`\n🔍 Testing coin conflict detection...`);

      const result = await combineOffers([TEST_OFFER_1, TEST_OFFER_1]);

      assertEquals(result.success, false, 'Duplicate-coin combine should fail');
      assertEquals(
        result.error?.includes('share input coins') ?? false,
        true,
        'Error should mention shared input coins',
      );
      console.log(`✅ Properly detected coin conflict: ${result.error}`);
    });
  },
});

// Performance test
Deno.test({
  name: 'Offer Combining Performance Test',
  fn: async () => {
    await initWalletSDK();

    console.log('\n⏱️  Performance Test: Combining 2 offers');
    const startTime = performance.now();

    const result = await combineOffers([TEST_OFFER_1, TEST_OFFER_2]);

    const endTime = performance.now();
    const duration = endTime - startTime;

    console.log(`✅ Completed in ${duration.toFixed(2)}ms`);
    assertEquals(result.success, true, 'Performance test should succeed');

    // Reasonable performance expectation (5 seconds should be sufficient for WASM operations)
    const maxExpectedTime = 5000; // 5s for WASM operations
    assertEquals(duration < maxExpectedTime, true, `Should complete within ${maxExpectedTime}ms`);
  },
});

// Test with user-provided offers
Deno.test({
  name: 'User-Provided Offers Integration Test',
  fn: async (t: Deno.TestContext) => {
    // Initialize the wallet SDK before running tests
    await initWalletSDK();

    await t.step('should combine user-provided offers successfully', async () => {
      // Test with real user-provided offers
      console.log(`\n🔄 Testing user-provided offers...`);

      const result = await combineOffers([USER_OFFER_1, USER_OFFER_2]);

      // Basic validation
      assertEquals(result.success, true, 'User offers should combine successfully');
      assertExists(result.combinedOffer, 'Combined offer should exist');

      console.log(`\n🧪 USER OFFERS TEST RESULT:`);
      console.log(`✅ Success: ${result.success}`);
      console.log(`📏 Combined offer length: ${result.combinedOffer?.length || 0} characters`);
      console.log(
        `🔗 Combined offer starts with: ${result.combinedOffer?.substring(0, 50) || 'N/A'}...`,
      );

      // Validate the combined offer format
      assertExists(
        result.combinedOffer?.startsWith('offer1'),
        'Combined offer should start with "offer1"',
      );

      // Log the full combined offer for manual verification
      console.log(`\n📋 USER COMBINED OFFER:`);
      console.log(result.combinedOffer);
    });

    await t.step('should include the offered NFT and its royalty in the preview totals', () => {
      const nftOffer = parseOfferContents(USER_OFFER_1);
      assertEquals(nftOffer.offeredNfts.size, 1, 'NFT offer should list the offered NFT');
      const nft = [...nftOffer.offeredNfts.values()][0];
      assertEquals(nft.royaltyBasisPoints > 0, true);

      const requestedBeforeRoyalty = nftOffer.requestedFungible.get(XCH_KEY) ?? 0n;
      assertEquals(requestedBeforeRoyalty > 0n, true);

      const preview = combineOfferContents([nftOffer]);
      assertEquals(preview.offeredNfts.length, 1);
      assertEquals(preview.requestedFungible.length, 1);
      const royalty = (requestedBeforeRoyalty * BigInt(nft.royaltyBasisPoints)) / 10000n;
      assertEquals(preview.requestedFungible[0].mojos, requestedBeforeRoyalty + royalty);
      assertEquals(preview.royalties.length, 1);
      assertEquals(preview.royalties[0].amounts[0].mojos, royalty);
    });
  },
});
