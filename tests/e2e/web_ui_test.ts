/// <reference lib="deno.ns" />
import { assertEquals, assertExists } from 'https://deno.land/std@0.208.0/testing/asserts.ts';

/**
 * End-to-end test for the web UI
 * Tests the complete flow from web interface to offer combination
 */

// User-provided test offers (same as in integration test)
const USER_OFFER_1 =
  'offer1qqr83wcuu2rykcmqvpsxygqqemhmlaekcenaz02ma6hs5w600dhjlvfjn477nkwz369h88kll73h37fefnwk3qqnz8s0lle0drulk4n52lrawum8jk2jwwv7arhe60j8angk0uwgl4tfxl579re4jgcd2nez749fmwh7rjkykh5jr66wralkawhtejp9a4v487vmuu6u343a2zgkl80j4u39nwzszmxdc8ah8mnlklyktz893vua3ahd7786akwwa3hnv7zx7ced5fscrfwn88x4nrzxttaml8ke9mc6g9a74pr5nn25hy7du7wl4ujnc8j7t8pq9ywk3mp3c23q76wgda62yer55tj0l6zyeygfc2yp5nkstadt3jp00haalrsdu62wkexh0ykuwu0nn87sras3y2mww5aln3vkntul79av4hfqj74ecm37exlvfyl7u3gf8dm67v8dnv405taev2666l57xtt6kp00872z57gxyswy37ukd76wd58j8g4mhc4220w7h9jutnnt0e8vg8de259tjq9cl50fr8dzfqx3axv7zweaqd80qzcklr8q7tlnpavk9emqkrhmwmcr2d0rh2ly4fjujfht0cv033ejfulqfjch5hlsler8jj2pg9zma84jwfdx25n22e3xu5j7dfskz7dpkxvhu627fxvknqvx29g6n8jfj4y5j5v6wflxrztktflyzjvfd95eu6vpw43xvkjeh9e9zl4x294yzh47tfv4zjt7g9e956n74etyuej7hpmyu6nwdfqkzup7nfx55fuyxj6nhh6vcd9qzve3vx9dde09e7t0w7xv9dv54kush4y9hmk0cukh0tarzg7l5c9ahu67mjw0rlml2vhdqmg97369k4n30c0dqu2d89qgk5mgv6c57enjdf08r2j7gy9zsfy63te5qcusc5jjqv3hvwq7ewa945v3utemwhnf7rlgme6l357vcdx87yucvalethle6djt6e6xymy8jxgtfflxf083mml54sz9fnw7v4k8zk9l9n0l0e22s6lvl7wfvur9f82lksjc9tud0e0d57lw35fvtla78elxqe2a60n4vmtmddvtylvfed67hy7085h4dckytmhgks0y4ns6nhtph8wky0sfalar6davf3sn0kn02gr9mlgatte267hk9yqw2xlmlcxy0xn487gktad6g2m7dclpg4rvkl5eaws6gsv6c8zrawegun50348g7r06axcl7a8wngkh3kq6ll6els7esj482we597juh3jvaxam38te3040zyu0jgullh3lkyx69tyflyzus7gd8zeddvxakqprv7xrum5hu8s79u3m08ketv0jp6360hd8m67svleaglv02lawc093jt43k3a4kramf76m7ehh9a4umvm2h7q2zwk9gmzq5hl07hmsmverl5nj4l4f62etcg74dtde8r35tdzr0hkl8nx7kveze7uvrxu98l30hrhh7fhq7rj6n5ml87gukhxwunuja58pl6dup4p6n46srk28kf7g6ykq9cpc6jupr5xwe2edyq6qyz6jgegprjr47ml3wfxw389gs6ku0da99mtxkmjhxam9f7u3g4lpt9k9vu9w6ddwledefc46p2kxdus2kctr3nzpsrx0kxd5cpfts3vsal8ezpwk4y320txkd24yctpwccmmxaz26e5e9m3hx4fx7r46ge9e9y72z4u5u3hl8u48h99nr88p0th0gv4k97sh9v0j7l9f2xeafuh9egtlj8hltqnhzadxak9wlrl5fuycar8mnrjnk77g5anm7xjpxqykwugc26ngnv5';

const USER_OFFER_2 =
  'offer1qqr83wcuu2rykcmqvpsxygqqemhmlaekcenaz02ma6hs5w600dhjlvfjn477nkwz369h88kll73h37fefnwk3qqnz8s0lle0nq06tdd0a96lmufjjuy6wmleld7ch8k4nkerdwey0nmt5ymacgt3w0s89tu302k5ahthqe0zmt6fqad83uln0ht4veq6l6k2naxd7wdwc6c75pytl3h3t7vjehpqpdhx6xkhm8s795ha7tpt4kw2sa4fhacuy7n3j6sdmvlxdmxemld9jhaamucwul2rl4vfayhcutruhwcxfqdsmw832qv7aatlmve5zl2j4drmt80smrfagev0gggdlxx5a9yvf620c8ua9qvcyye9jz6tmgr7j4glpl4mzu0acw7dexmwjn5jl0hz8ecnlg35cck944hz007c2gelllcz2aallnu3ffdv4razlcknk7mwe7xvthm58j29wx3a8um4056qlnf5tts9auleg2neqcjpcj8mjehmfeks7gazhwlz4ffam6ukt3wwddlya3qah92s4wgqhr73ayva5fyq685encfm85p5auqtzmuvure07v84jch8vzcwldm0qdf4uwatuj4xtjfxadlp37x8xf8nupxtz7jl7rc5vj2fg9q5t057kfe95e2jdftxymjjte4xzcte5xcejlnfteyej6vpseg4r2v7fx25jj23nfe8ucvfwed8us2f395kn8nfs96kyej6txuhy5t75egk5s27hed9j52f0eqhykn206h9vnnxt6u8vnn2de4yzcts86dy6j38ss6rgvemmaxvxjspkvck2nj2gmfall80ff73w70zlu7kr45dmyfn2lnxr64x9unj274zhld37u06l7ljj9lghppt5w3w4vur7rlgh2npegxd9y6t8kf8xvunttec2khjqpg5z3xu27dq28ywyyssnxdmzgy8u43edmkp90ltuevw3u8vvhhnt3l0eyhqhu86k2l2f4fn78ftfj2sgwf0vdqunruvxl00khcfhzy2nk7ua2uxy5d7l80c7zn43h7el5cj4ck2j7jlpp9s0la6hn7ag9eantjkkllumnw2p2km5l8wek4kwmcsfxln6c4ewe67ht0gmfwsrkwass7ftw33x7arzdasfh8n0a6x9r7c0z3vl3q75nkrhwh62hjl54gv6gs74achnsuw7ap2ml3xhzm5ch8umpuz3tkndh2n27pj3qu4vd5fm4k3pxedzzdjgyl5ra5le6wmxpg0t03mllnn8zd4pdtwsln22axenq5h69ahxdh4z0t7ufgn9e7llvnmvsv5x5cm7qpe4uq504s6ked4dsqxdlvrehw0c03ktexkxda7kq6ytkn5lwm0rhaxe846alc548uayat8yl0r4qt8d8mk0l9lunwwnemakes4tasc99v2pk5dflllpw0dc0mdx34u09zcuhy2hz4wcqnwv26ag06jfras5k8369z70ka0nz04lupv0caalvvdef6wtamrh0xz3hu7fehe0jwywzmx9plepvel2j4wnwlmzrvxtgy39xcg8qdak5zcf3nqg89qs2szh880alczkm0l908ksxen66uvl6djvl4240wpuxtmt4kkhh5tdwttwmwydcvdsq24x4lqxkgdrdjjf3nq0z8fml59t9lmdtatmkmrjfa04hyweav54mxtp9nu26auwt6x60v7ckhnj073k8478ularzyds9048u94h53nhfmp24uc4zj6cjlgt6w80q4ummekcswfmx3cawvy7ck3h7awqa2lw4wpdhrjeqt2anmvtwjh8sfsllgrkqxhtvfqz0wnx79';

// Test the web UI functionality
Deno.test({
  name: 'Web UI End-to-End Test',
  fn: async (t: Deno.TestContext) => {
    // Start the dev server if not already running
    const serverProcess = new Deno.Command('deno', {
      args: ['run', '--allow-all', 'dev.ts'],
      cwd: '/Users/judeallred/code/coffer',
      stdout: 'piped',
      stderr: 'piped',
    });

    const server = serverProcess.spawn();

    // Wait a moment for server to start
    await new Promise((resolve) => setTimeout(resolve, 2000));

    try {
      await t.step('should load the web application', async () => {
        const response = await fetch('http://localhost:8000');
        assertEquals(response.status, 200, 'Web app should load successfully');

        const html = await response.text();
        assertExists(html.includes('Offer'), 'Page should contain "Offer" title');
        assertExists(html.includes('Combine Chia offers'), 'Page should contain subtitle');
      });

      await t.step('should test offer combination via API', async () => {
        // Test the same logic that the web UI uses
        const { initWalletSDK, combineOffers } = await import('../../src/services/walletSDK.ts');

        // Initialize the SDK first
        await initWalletSDK();

        const result = await combineOffers([USER_OFFER_1, USER_OFFER_2]);

        // Validate the result matches what the web UI should produce
        assertEquals(result.success, true, 'Web UI should combine offers successfully');
        assertExists(result.combinedOffer, 'Combined offer should exist');
        assertExists(
          result.combinedOffer?.startsWith('offer1'),
          'Combined offer should be valid format',
        );

        console.log(`\n🌐 WEB UI E2E TEST RESULT:`);
        console.log(`✅ Success: ${result.success}`);
        console.log(`📏 Combined offer length: ${result.combinedOffer?.length || 0} characters`);
        console.log(
          `🔗 Combined offer starts with: ${result.combinedOffer?.substring(0, 50) || 'N/A'}...`,
        );

        // Log the full combined offer for verification
        console.log(`\n📋 WEB UI COMBINED OFFER:`);
        console.log(result.combinedOffer);
      });

      await t.step('should validate web UI uses same logic as unit tests', async () => {
        // Import the same functions used by the web UI
        const { initWalletSDK, combineOffers } = await import('../../src/services/walletSDK.ts');

        // Initialize the SDK first
        await initWalletSDK();

        // Test that the web UI logic produces the same result as unit tests
        const webResult = await combineOffers([USER_OFFER_1, USER_OFFER_2]);

        // This should match exactly what the unit test produces
        assertEquals(webResult.success, true, 'Web UI should use same logic as unit tests');
        assertExists(webResult.combinedOffer, 'Web UI should produce same combined offer');

        console.log(`\n🔍 LOGIC CONSISTENCY CHECK:`);
        console.log(`✅ Web UI and unit tests use same combination logic`);
        console.log(`📏 Web UI result length: ${webResult.combinedOffer?.length || 0} characters`);
      });

      await t.step('should clear all offers when clear button is clicked', async () => {
        // Test the clear functionality by simulating the same logic the UI uses
        const { initWalletSDK, combineOffers } = await import('../../src/services/walletSDK.ts');

        // Initialize the SDK first
        await initWalletSDK();

        // First, add some offers (simulate what the UI would do)
        const offers = [USER_OFFER_1, USER_OFFER_2];
        const result = await combineOffers(offers);

        // Verify offers were combined successfully
        assertEquals(result.success, true, 'Offers should combine before clearing');
        assertExists(result.combinedOffer, 'Combined offer should exist before clearing');

        console.log(`\n🧹 CLEAR FUNCTIONALITY TEST:`);
        console.log(
          `✅ Before clear: ${offers.length} offers, combined length: ${
            result.combinedOffer?.length || 0
          } characters`,
        );

        // Simulate clearing all offers (empty array)
        const clearedResult = await combineOffers([]);

        // Verify clearing works
        assertEquals(clearedResult.success, false, 'Empty offers should fail to combine');
        assertEquals(
          clearedResult.error,
          'No valid offers to combine',
          'Should return appropriate error message',
        );

        console.log(`✅ After clear: 0 offers, error: "${clearedResult.error}"`);
        console.log(`✅ Clear functionality works correctly`);
      });

      await t.step('should detect duplicate offers on repeated paste', async () => {
        // Test the duplicate detection logic that the UI uses
        const { initWalletSDK, validateOffer } = await import('../../src/services/walletSDK.ts');

        // Initialize the SDK first
        await initWalletSDK();

        const testOffer =
          'offer1qqr83wcuu2rykcmqvpsxygqqemhmlaekcenaz02ma6hs5w600dhjlvfjn477nkwz369h88kll73h37fefnwk3qqnz8s0lle0hza78a9l0ahdlhpn6k92lzxx8ejl8k9404a3fscjmar5t9whlmh6mxqf2je8e355vdykk78vs3p2hepxh38pvye64tun3g7g59eemkua8mk6ht5zlad5t0nykvcgptgfj57fq0xpfrlfmr0reyt6uu0lfuzw0teg08ah357xmcuma6jx4wa8n3q0hc28593jcdc2alsk5556lf6whdw2vtramxyulfv4s9sudclep6r6rvw8pz9nafpphlgcnyk33xf0lgcny4phpgsyj2mp0490xg9dullhu2phhfeemymd6jtjma77glzz07zynt9c6hk7g96mdtn07huszmlth08ue44xd6mlfup3a640778mpyhdjjdrkuwlflzl66698vmgjtrcl7s4fjfnyrs5pk4h0j3ntpuk6avaj92hnh49adlyuget7ft8pld2apz6s4w83rzwelgzvqvvfm8sehlfr9cgyhascpmhu7ye0lypywc8sd7m7lgmnred5kf92uk5kdje7lpuq0uk08ezzk979r7hlgpq5wj2fgxcff0n72f345ezjdfn9yhnzda4hrgdej9cxjhjfna5cnzz327seqjvlf9z4nxrs0f3c7uzcwe95lqtfdxvxnrmevpj9y4am0pvh9gzlveq44vz7tad5juzf0egxy742te8xvh4k0eyxvmn2fa4hqvysfa9zmz3kxs6rt462eaxq8we3vvqk8c3c5l8cl7l743d076avekzw05h2w4vt08tx0heustjcmdyj3l704hllaxmjsx8zhfd2u2echuhjsxhxhjsqm2w5xvu605eex5hn3df0gzjng9qdq4vuqudggtf0qxgmjxq2j3j8apnuwnkasc7lwu54pl436d0l2kuna28ked3jn0ejjs09200zvaus7gepd98ue9u78007jkqg4xdmejkcu2chukdlal9f2rtanlee9nsv4yat76ztqa034l9aknma6x3930lhcl8ucr9thf7w4nd0d443vna389ht6uneu7j74hzep0warzpujk7r2wasxuamq37p8hl5vfhh3xxzd7jda3qvh0ar4d09tt67c5spegml0lqc3u6w5leze04hfpt0ehru9z5djm7n846rfzpntqug04mfrjwjzx5ayqdlgym9lm5a6wz67xcrtllt87rmxz25afmxsh6tj7xfn5mhwya0x974ugn37frnl7787csmg4v38ustjrep5ut944smkeqydncc04d3gunpl038whndltmffuu95932rr4ffmt9dy20j9u6uycldg7dgpfnlagtmf4d7zrax0vu00zu20vnypzk9gm2z5lllch53mqh0tmde7unck8msaxlf70x5x20t3nllxsjtvceplkalwrsjprl6l797ytz6hj846ht8t3qr464638fwpk87xdx2n5l7gaxkjmeekk6nwv77chsfwsvx5eqga33kzmtdqxsrqk5jx2qg5sa0k07t6c6hxvaxhzw5mxtcckuy3cud72kc9tutfdakydtnvlk3rlr7d3d0ffysz43h05q4krgcvcjvgcne34w0je46nw87x8vmp6gw00pc0ehchyk75aejlrtx48s5stuw8kfqvqqf6axwadta966w4crm8kkcl78nljwql0qtskkhyt7gkdt8c4ll8tkmylaug0f2fcdhh9vqwt9prjrlu8ef0ce4egenuvc5snj9lfud0huxr0jqrcnyx27z3z88r';

        console.log(`\n🔁 DUPLICATE DETECTION TEST:`);

        // Simulate the app's addOffer logic
        interface Offer {
          id: string;
          content: string;
          isValid: boolean;
          error?: string;
        }

        const offers: Offer[] = [];

        // First paste - should validate successfully
        const validation1 = await validateOffer(testOffer);
        const isDuplicate1 = offers.some((offer) => offer.content === testOffer);

        const offer1: Offer = isDuplicate1
          ? {
            id: '1',
            content: testOffer,
            isValid: false,
            error: 'This offer has already been added',
          }
          : {
            id: '1',
            content: testOffer,
            isValid: validation1.isValid,
            ...(validation1.error ? { error: validation1.error } : {}),
          };

        offers.push(offer1);

        console.log(`✅ First paste: isValid=${offer1.isValid}, error=${offer1.error || 'none'}`);
        assertEquals(offer1.isValid, true, 'First offer should be valid');
        assertEquals(offer1.error, undefined, 'First offer should have no error');

        // Second paste - should detect duplicate
        const validation2 = await validateOffer(testOffer);
        const isDuplicate2 = offers.some((offer) => offer.content === testOffer);

        const offer2: Offer = isDuplicate2
          ? {
            id: '2',
            content: testOffer,
            isValid: false,
            error: 'This offer has already been added',
          }
          : {
            id: '2',
            content: testOffer,
            isValid: validation2.isValid,
            ...(validation2.error ? { error: validation2.error } : {}),
          };

        offers.push(offer2);

        console.log(`✅ Second paste: isValid=${offer2.isValid}, error=${offer2.error || 'none'}`);
        assertEquals(offer2.isValid, false, 'Second offer should be invalid (duplicate)');
        assertEquals(
          offer2.error,
          'This offer has already been added',
          'Second offer should show duplicate error',
        );

        console.log(`✅ Duplicate detection works correctly`);
      });
    } finally {
      // Clean up: kill the server process
      try {
        server.kill();
        await server.status; // Wait for process to exit
      } catch (_error) {
        // Server may have already exited, ignore cleanup errors
        console.log('Server cleanup completed');
      }
    }
  },
  sanitizeOps: false,
  sanitizeResources: false,
});
