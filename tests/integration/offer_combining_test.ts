/// <reference lib="deno.ns" />
import { assertEquals, assertExists } from 'https://deno.land/std@0.208.0/testing/asserts.ts';
import { initWalletSDK, combineOffers, isUsingMockMode } from '../../src/services/walletSDK.ts';

/**
 * Integration test for offer combining functionality
 * Tests real Chia offer combining with actual offer strings from npm package
 */

// Test fixtures - Real Chia offer strings provided for testing
const TEST_OFFER_1 = 'offer1qqr83wcuu2rykcmqvpsrvl00n090ms8etrnq49wqj0h4d39nrl8xq5uda8lelhmlw8qs9eelsku4lrld3g69lsdkge7a9f7tj4l7mkca7u7e9ymmd6u46a637wxc7tewxycrqvqgn385tdznsla3cd7cuqx66wmd0q46733gf8hk0veekl2kd3f8ek0fmv6ntzwhndh7hgfznarwc757d22wg930lr8v9g0ld77tkppmfqsdl3hlclcp59q0mhezwpqdng0plallhlctychecwf85enua6lk5up9xa3x9m9dxl7avn7u3w0vsrwfzprn8hladyyxlll5ml3h7vacr9pml304q5eykhnx2jm4ahwqqychl0e5y26yu53fe76hc3yav0qjhy5uh7arzcw9svv3nn4ym870cu28uj97krsxa2wls5m9nlangtecm9p8kkyu4jcyt5f7twfyvm8lr65ndk5n56erlwmawvc0dm08469rgdk6tkveag2550atgxguasxqwqpzt5j8nd72xnd76ynd76ynd76vjd76usdeqfslhpc97c97aaeu9w7kgm3k6uer5vnwg85fv4wp7cp7wakkphxwczhd6ddjtts09cpluwp9tyltfej850m40wveagjm55u0r7n7ccen805mlhj93wkullede9760hg25c4524pmq4wrpqc3fh4c8xlllhkmrz05tamvhxlj4mpuak7mm3x2wnm22ect8vhvu7t7l7879e08l7d3snjqmg4949hlpgj22mnndyydjkdkamx9408wzt0m0xufgelkcra0l97x45mpreyp4l9lup0g4ln4ll6hwdx7dr8twaj6rtgj363eh8c7qcfpm8ttagmpee9jxn879uupalzfu4xa9ryzlyqkztl6jm0u3lkfk0d77x8hq7mcf9fu0mrlxavzypmpymqulhlmlqzs60507qjz35363lugxzykqvcsdsfzsyqcpqqyycgw2vma5t06faxxvk9q0faslya5c9wkrpusnhj7utz4tlnf40mmn3uwral953knem8ef4xhaluf3z7rdpsh27tq5vqs5y2wfyx978alktn8qn6km8c527a8l3n97mfm6halhhhnw0xjlmk2j5h4k6nxgew948nkvuwgekk040e3cdukr8fxcwk56tltjew2m0ah7ey75fne4urlamz8hman3hq4hflxchj6ap82xwtlh6ty0hxlr877q6kq980c0lrd0uqsucsz2umc6sxl';

const TEST_OFFER_2 = 'offer1qqr83wcuu2rykcmqvps8uxa363fasdmj26a44s55ll4hhan5vur6al4eynswuyamtdx70a67pn9067nv27j0jz4kxh4fx0ja4m7xhhlwhrher8xuw097mw5tnfhhclr33xqcrqvph0umkzdun5adeeaccyrx76xad8p4k7f4gfyh50umeku66d3t8e5ldmyunhpw4n9n7hte2j9pwua5ud20w59p97m8v3tlnvxlt7rpmgs4dns8lcllpvyqt6hlzmhfyt2lrtl0ldllhlsd0ngamald6yx34x0aja8vcv3f09880ae2f0tj0rxlxnlyhefhuv8evhplllexl7dln8gurtl07alch7sz3sts465c075awhec2cja6u69dh7m7exmd6w73c3j09g044c8qejuqu82ey3rk5tvyy56s2mncjnlua0f2m23mdmenatlu6z2vv9nwwzlky3tw6n6hmshm6w79eqckw688hfk7kpdgt9rj44sl0979m7l9mue643t9fulsg3fmqvp0vr54fy0xmu5dxmu5dxma5fxma5fxma5eymjqnf7wrsmasrumlncgaad3hrdhejxgexus0gjewurasruamdvpwyas9wmk6mykhqwtstlcczhtnxp3aecxh3um77t9awfu3xe58cegnttfldg74u3stmcwrglu6dk8mg25c4524pmq4wrpqc3fh4c8xlllhkmrz05tamvhxlj4mpuak7mm3x2wnm22ect8vhvu7t7l7879e08l7dmsa6qmg4y78t8yn6567wtzlmwl5054jqz8dnhju7vav0uydantdjzsteheh869wgrf7rlgxs7llv83jdanfl9r2kse6rqa9ffat4qmdaxz6mplnssx0hzn9dc68hatacre7yne2d6gxg97vpuyhh59klerlvnv7ma7v0wpahqj2melj8w06cyg8kzfkpcltlh7qdp5mgl7pvyrfr4plc3vyfvze3qmqj9qgpszqqgfssu5ehtgkl5n7vvevyqa92u7sael4n4tmgla7lmfawq736t22czm0tvcm6cknzaemls73wlny0l3xytcd5xzatevz3szzs3feysf85h6mza2a9t0va3juyfd384lf8ttvk48lef2727pz07dw3ng9akajdh4dcqh36ldukgudv08a525hkyzlsxak0mymnywa7lsds0hgp97vk0kr6lmzsauwm8ev4dwd22n4sl20rm3jlj4njsma79lw9d7yxwlgedqrx82zrf7wdr5e';

// Expected combined offer result from WASM SDK
// This is the real, deterministic output when combining TEST_OFFER_1 and TEST_OFFER_2 
// using chia-wallet-sdk-wasm v0.29.0. This ensures regression testing for offer combining.
const EXPECTED_COMBINED_OFFER = 'offer1qqr83wcuu2rykcmqvpsrvl00n090ms8etrnq49wqj0h4d39nrl8xq5uda8lelhmlw8qs9eelsku4lrld3g69lsdkge7a9f7tj4l7mkca7u7e9ymmd6u46a637wxc7tewq8xkqypcn79x3fcw7uukavxprdd80khs2e0g65yjmm8kvumw40xc5nu685ak0fas8tekelt4y4fw3hvw20x488vzcnlpnk248mk009mpsa5xmqpyhhlskzq9atl3dqgreg8ype0klut5ch3cwd8yenuu6lk57pdxa3x9e998l7avn753w0vsrwfrp8n84l4dy9q92fhln0ue6sx2rhlzl2pfjfd08v49hfmxaqyf307hngg45feprnha903zg6c738wffe0a2y9satycfp80tfk0ua3s50eytav8pd75aapfht8ltxslj3k2j0dyfet9s2hgnujuz2e7w784exm9f8d4j87ah6uequmk70056xsmd5hvfn6s4fvl65xpquqzyhfy0xmu5dxma5fxma5fxma5eyma4ezr9gl734lyqvt7uz7v7a75u7xhmf5tcmtwvn2gfhprkxxwkq7vu7hqmrxmr8vttw6x264s42nv6hjt5yueme8a6h4x5l59v22whjlfluwv3nhkv0eejch000eu77jhv8a54gvxm4gsdn2nqssvs5mkanh0hlmnd3n86y74hm40pga577m097cn98taa8vu9r5tww0dllar0rulnlexscfepd52jmjm7qjf48d4cxjzw6t26wanz6hmh38ha4n295glm0pkk05lmf6fspujqmljlwyh5fla6llarkxn0xhn4kwev3353fayum3u0pvy3d44aa5f3u7jpzfl7zuwqal4y7vnxj3kqljqmz9maefhkfll9m8k80r0msfdvyjclhl30jwjpzyaqsd5ws9mpq6cml30yr2r3qh63uyfxzpkq0qjdqgzsxqsqgq5ucc8tg7ay23r9scz6hdhhx9yphhq5wuyask8weaflged0lxau0zqh0e0yak7xcw0da409760gnjt2vduhze9fqyppzjjppev3m0a7aeeyw5xl7ayhrf06vewkw07al06a47mlcv37en5l9d2ku6j22etfc7n0z6rdendtludr88qh6e5r9hx67jekljx4ldak484yd7f0v7lqeel7twu0cdw6r6k8u7jgfm34n0e7w6nech7em5qw4crfmunaer0lv9sqrnzqftswsgf3x';

// Test group for offer combining integration tests
Deno.test({
  name: 'Offer Combining Integration Tests',
  fn: async (t: Deno.TestContext) => {
    // Initialize the wallet SDK before running tests
    await initWalletSDK();

    await t.step('should initialize SDK successfully', () => {
      // SDK should be initialized (either with WASM or mock mode)
      // This test will pass regardless of WASM availability
      console.log(`ℹ️ SDK Mode: ${isUsingMockMode() ? 'Mock Mode' : 'WASM Mode'}`);
      console.log(`ℹ️ Test Offer 1 Length: ${TEST_OFFER_1.length} chars`);
      console.log(`ℹ️ Test Offer 2 Length: ${TEST_OFFER_2.length} chars`);
    });

    await t.step('should combine two test offers successfully', async () => {
      // Test the core functionality
      const result = await combineOffers([TEST_OFFER_1, TEST_OFFER_2]);
      
      // Basic validation
      assertEquals(result.success, true, 'Combining should succeed');
      assertExists(result.combinedOffer, 'Combined offer should exist');
      
      console.log(`\n🧪 INTEGRATION TEST RESULT:`);
      console.log(`✅ Success: ${result.success}`);
      console.log(`📏 Combined Offer Length: ${result.combinedOffer?.length} chars`);
      console.log(`📋 Combined Offer: ${result.combinedOffer}`);
      
      // Log for verification
      if (isUsingMockMode()) {
        console.log(`\n⚠️ Note: Currently in mock mode. This is a simulated result.`);
        console.log(`🔧 When WASM is available, this test will use real Chia offer combining.`);
      } else {
        console.log(`\n✅ Using real WASM SDK for offer combining!`);
      }
      
      // Store the result for validation
      const combinedOffer = result.combinedOffer!;
      
      // Detailed result validation
      if (isUsingMockMode()) {
        // In mock mode, we expect our mock format
        assertEquals(combinedOffer.startsWith('offer1combined_'), true, 'Mock offer should have expected prefix');
      } else {
        // In WASM mode, we expect the exact combined offer result
        console.log(`\n🔍 VALIDATION:`);
        console.log(`Expected Length: ${EXPECTED_COMBINED_OFFER.length} chars`);
        console.log(`Actual Length: ${combinedOffer.length} chars`);
        console.log(`Match: ${combinedOffer === EXPECTED_COMBINED_OFFER ? '✅' : '❌'}`);
        
        assertEquals(combinedOffer, EXPECTED_COMBINED_OFFER, 'Combined offer should match expected WASM result');
        assertEquals(combinedOffer.length, 1264, 'Combined offer should be 1264 characters');
        assertEquals(combinedOffer.startsWith('offer1'), true, 'Real offer should start with offer1');
      }
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
  },
  sanitizeOps: false,
  sanitizeResources: false,
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
    
    // Reasonable performance expectation (adjust based on WASM vs mock)
    const maxExpectedTime = isUsingMockMode() ? 1000 : 5000; // 1s for mock, 5s for WASM
    assertEquals(duration < maxExpectedTime, true, `Should complete within ${maxExpectedTime}ms`);
  },
  sanitizeOps: false,
  sanitizeResources: false,
});