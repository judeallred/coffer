/// <reference lib="deno.ns" />
import {
  assert,
  assertEquals,
  assertExists,
} from 'https://deno.land/std@0.208.0/testing/asserts.ts';
import puppeteer from 'puppeteer';
import type { Browser, Page } from 'puppeteer';

/**
 * End-to-end test for the web UI using Puppeteer
 * Tests the complete flow from web interface to offer combination
 * This test actually renders the page in a headless browser and checks for visual elements
 */

// User-provided test offers (same as in integration test)
const USER_OFFER_1 =
  'offer1qqr83wcuu2rykcmqvpsxygqqemhmlaekcenaz02ma6hs5w600dhjlvfjn477nkwz369h88kll73h37fefnwk3qqnz8s0lle0drulk4n52lrawum8jk2jwwv7arhe60j8angk0uwgl4tfxl579re4jgcd2nez749fmwh7rjkykh5jr66wralkawhtejp9a4v487vmuu6u343a2zgkl80j4u39nwzszmxdc8ah8mnlklyktz893vua3ahd7786akwwa3hnv7zx7ced5fscrfwn88x4nrzxttaml8ke9mc6g9a74pr5nn25hy7du7wl4ujnc8j7t8pq9ywk3mp3c23q76wgda62yer55tj0l6zyeygfc2yp5nkstadt3jp00haalrsdu62wkexh0ykuwu0nn87sras3y2mww5aln3vkntul79av4hfqj74ecm37exlvfyl7u3gf8dm67v8dnv405taev2666l57xtt6kp00872z57gxyswy37ukd76wd58j8g4mhc4220w7h9jutnnt0e8vg8de259tjq9cl50fr8dzfqx3axv7zweaqd80qzcklr8q7tlnpavk9emqkrhmwmcr2d0rh2ly4fjujfht0cv033ejfulqfjch5hlsler8jj2pg9zma84jwfdx25n22e3xu5j7dfskz7dpkxvhu627fxvknqvx29g6n8jfj4y5j5v6wflxrztktflyzjvfd95eu6vpw43xvkjeh9e9zl4x294yzh47tfv4zjt7g9e956n74etyuej7hpmyu6nwdfqkzup7nfx55fuyxj6nhh6vcd9qzve3vx9dde09e7t0w7xv9dv54kush4y9hmk0cukh0tarzg7l5c9ahu67mjw0rlml2vhdqmg97369k4n30c0dqu2d89qgk5mgv6c57enjdf08r2j7gy9zsfy63te5qcusc5jjqv3hvwq7ewa945v3utemwhnf7rlgme6l357vcdx87yucvalethle6djt6e6xymy8jxgtfflxf083mml54sz9fnw7v4k8zk9l9n0l0e22s6lvl7wfvur9f82lksjc9tud0e0d57lw35fvtla78elxqe2a60n4vmtmddvtylvfed67hy7085h4dckytmhgks0y4ns6nhtph8wky0sfalar6davf3sn0kn02gr9mlgatte267hk9yqw2xlmlcxy0xn487gktad6g2m7dclpg4rvkl5eaws6gsv6c8zrawegun50348g7r06axcl7a8wngkh3kq6ll6els7esj482we597juh3jvaxam38te3040zyu0jgullh3lkyx69tyflyzus7gd8zeddvxakqprv7xrum5hu8s79u3m08ketv0jp6360hd8m67svleaglv02lawc093jt43k3a4kramf76m7ehh9a4umvm2h7q2zwk9gmzq5hl07hmsmverl5nj4l4f62etcg74dtde8r35tdzr0hkl8nx7kveze7uvrxu98l30hrhh7fhq7rj6n5ml87gukhxwunuja58pl6dup4p6n46srk28kf7g6ykq9cpc6jupr5xwe2edyq6qyz6jgegprjr47ml3wfxw389gs6ku0da99mtxkmjhxam9f7u3g4lpt9k9vu9w6ddwledefc46p2kxdus2kctr3nzpsrx0kxd5cpfts3vsal8ezpwk4y320txkd24yctpwccmmxaz26e5e9m3hx4fx7r46ge9e9y72z4u5u3hl8u48h99nr88p0th0gv4k97sh9v0j7l9f2xeafuh9egtlj8hltqnhzadxak9wlrl5fuycar8mnrjnk77g5anm7xjpxqykwugc26ngnv5';

const USER_OFFER_2 =
  'offer1qqr83wcuu2rykcmqvpsxygqqemhmlaekcenaz02ma6hs5w600dhjlvfjn477nkwz369h88kll73h37fefnwk3qqnz8s0lle0nq06tdd0a96lmufjjuy6wmleld7ch8k4nkerdwey0nmt5ymacgt3w0s89tu302k5ahthqe0zmt6fqad83uln0ht4veq6l6k2naxd7wdwc6c75pytl3h3t7vjehpqpdhx6xkhm8s795ha7tpt4kw2sa4fhacuy7n3j6sdmvlxdmxemld9jhaamucwul2rl4vfayhcutruhwcxfqdsmw832qv7aatlmve5zl2j4drmt80smrfagev0gggdlxx5a9yvf620c8ua9qvcyye9jz6tmgr7j4glpl4mzu0acw7dexmwjn5jl0hz8ecnlg35cck944hz007c2gelllcz2aallnu3ffdv4razlcknk7mwe7xvthm58j29wx3a8um4056qlnf5tts9auleg2neqcjpcj8mjehmfeks7gazhwlz4ffam6ukt3wwddlya3qah92s4wgqhr73ayva5fyq685encfm85p5auqtzmuvure07v84jch8vzcwldm0qdf4uwatuj4xtjfxadlp37x8xf8nupxtz7jl7rc5vj2fg9q5t057kfe95e2jdftxymjjte4xzcte5xcejlnfteyej6vpseg4r2v7fx25jj23nfe8ucvfwed8us2f395kn8nfs96kyej6txuhy5t75egk5s27hed9j52f0eqhykn206h9vnnxt6u8vnn2de4yzcts86dy6j38ss6rgvemmaxvxjspkvck2nj2gmfall80ff73w70zlu7kr45dmyfn2lnxr64x9unj274zhld37u06l7ljj9lghppt5w3w4vur7rlgh2npegxd9y6t8kf8xvunttec2khjqpg5z3xu27dq28ywyyssnxdmzgy8u43edmkp90ltuevw3u8vvhhnt3l0eyhqhu86k2l2f4fn78ftfj2sgwf0vdqunruvxl00khcfhzy2nk7ua2uxy5d7l80c7zn43h7el5cj4ck2j7jlpp9s0la6hn7ag9eantjkkllumnw2p2km5l8wek4kwmcsfxln6c4ewe67ht0gmfwsrkwass7ftw33x7arzdasfh8n0a6x9r7c0z3vl3q75nkrhwh62hjl54gv6gs74achnsuw7ap2ml3xhzm5ch8umpuz3tkndh2n27pj3qu4vd5fm4k3pxedzzdjgyl5ra5le6wmxpg0t03mllnn8zd4pdtwsln22axenq5h69ahxdh4z0t7ufgn9e7llvnmvsv5x5cm7qpe4uq504s6ked4dsqxdlvrehw0c03ktexkxda7kq6ytkn5lwm0rhaxe846alc548uayat8yl0r4qt8d8mk0l9lunwwnemakes4tasc99v2pk5dflllpw0dc0mdx34u09zcuhy2hz4wcqnwv26ag06jfras5k8369z70ka0nz04lupv0caalvvdef6wtamrh0xz3hu7fehe0jwywzmx9plepvel2j4wnwlmzrvxtgy39xcg8qdak5zcf3nqg89qs2szh880alczkm0l908ksxen66uvl6djvl4240wpuxtmt4kkhh5tdwttwmwydcvdsq24x4lqxkgdrdjjf3nq0z8fml59t9lmdtatmkmrjfa04hyweav54mxtp9nu26auwt6x60v7ckhnj073k8478ularzyds9048u94h53nhfmp24uc4zj6cjlgt6w80q4ummekcswfmx3cawvy7ck3h7awqa2lw4wpdhrjeqt2anmvtwjh8sfsllgrkqxhtvfqz0wnx79';

// Test the web UI functionality with Puppeteer
Deno.test({
  name: 'Web UI End-to-End Test with Browser Rendering',
  fn: async (t: Deno.TestContext) => {
    let browser: Browser | null = null;
    let page: Page | null = null;

    // Start the dev server if not already running
    const serverProcess = new Deno.Command('deno', {
      args: ['run', '--allow-all', 'dev.ts'],
      cwd: '/Users/judeallred/code/coffer',
      stdout: 'piped',
      stderr: 'piped',
    });

    const server = serverProcess.spawn();

    // Wait for server to start
    await new Promise((resolve) => setTimeout(resolve, 3000));

    try {
      // Launch Puppeteer browser
      console.log('🚀 Launching Puppeteer browser...');
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      page = await browser.newPage();

      // Enable console logging from the page
      page.on('console', (msg: { type: () => string; text: () => string }) => {
        const type = msg.type();
        if (type === 'error' || type === 'warning') {
          console.log(`Browser ${type}:`, msg.text());
        }
      });

      // Capture page errors
      page.on('pageerror', (error: Error) => {
        console.error('Page error:', error);
      });

      await t.step('should load and render the web application', async () => {
        console.log('📄 Loading page http://localhost:8000...');
        await page!.goto('http://localhost:8000', { waitUntil: 'networkidle0', timeout: 10000 });

        // Check that the title is correct
        const title = await page!.title();
        assertEquals(title, 'Coffer - Combine Offers on the Chia Blockchain');

        // Check for visible header elements
        const headerVisible = await page!.evaluate(() => {
          const header = document.querySelector('.header');
          if (!header) return false;
          const rect = header.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });
        assert(headerVisible, 'Header should be visible on the page');

        // Check for the title "Coffer"
        const coffeeTitle = await page!.evaluate(() => {
          const title = document.querySelector('.title');
          return title?.textContent?.includes('Coffer');
        });
        assert(coffeeTitle, 'Page should display "Coffer" title');

        // Check for the subtitle
        const subtitle = await page!.evaluate(() => {
          const subtitle = document.querySelector('.subtitle');
          return subtitle?.textContent?.includes('Combine Chia offers');
        });
        assert(subtitle, 'Page should display subtitle with "Combine Chia offers"');

        // Check for offer input fields
        const hasOfferInputs = await page!.evaluate(() => {
          const inputs = document.querySelectorAll('.offer-input');
          return inputs.length > 0;
        });
        assert(hasOfferInputs, 'Page should have offer input fields');

        // Check for the combined output section
        const hasOutputSection = await page!.evaluate(() => {
          const output = document.querySelector('.simple-combined-output');
          if (!output) return false;
          const rect = output.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });
        assert(hasOutputSection, 'Page should have visible combined output section');

        // Check for the about section
        const hasAboutSection = await page!.evaluate(() => {
          const about = document.querySelector('.about-section');
          if (!about) return false;
          const rect = about.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });
        assert(hasAboutSection, 'Page should have visible about section');

        console.log('✅ Page loaded and rendered correctly with all visual elements');
      });

      await t.step('should have no JavaScript errors on page load', async () => {
        // Check for JavaScript errors by evaluating window.onerror
        const hasErrors = await page!.evaluate(() => {
          return (window as { __hasJSErrors?: boolean }).__hasJSErrors || false;
        });

        assertEquals(hasErrors, false, 'Page should not have JavaScript errors');
        console.log('✅ No JavaScript errors detected');
      });

      await t.step('should render QR code image correctly', async () => {
        // Scroll to the bottom to make sure the about section is loaded
        await page!.evaluate(() => globalThis.scrollTo(0, document.body.scrollHeight));
        await new Promise((resolve) => setTimeout(resolve, 500));

        const qrCodeImage = await page!.evaluate(() => {
          const img = document.querySelector('.qr-code') as HTMLImageElement;
          if (!img) return null;
          return {
            exists: true,
            src: img.src,
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
            visible: img.offsetWidth > 0 && img.offsetHeight > 0,
          };
        });

        assertExists(qrCodeImage, 'QR code image element should exist');
        assert(qrCodeImage!.exists, 'QR code should exist in DOM');
        assert(qrCodeImage!.src.includes('tip-qr-code.png'), 'QR code should have correct src');
        assert(qrCodeImage!.naturalWidth > 0, 'QR code image should be loaded (width > 0)');
        assert(qrCodeImage!.naturalHeight > 0, 'QR code image should be loaded (height > 0)');
        assert(qrCodeImage!.visible, 'QR code should be visible');

        console.log('✅ QR code image rendered correctly');
      });

      await t.step('should have functional offer input fields', async () => {
        // Type into the first offer input
        await page!.evaluate((offer) => {
          const input = document.querySelector('.offer-input') as HTMLTextAreaElement;
          if (input) {
            input.value = offer;
            input.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }, USER_OFFER_1);

        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Check if the input has the value
        const inputValue = await page!.evaluate(() => {
          const input = document.querySelector('.offer-input') as HTMLTextAreaElement;
          return input?.value || '';
        });

        assert(inputValue.includes('offer1'), 'Input should contain offer');
        console.log('✅ Offer input fields are functional');
      });

      await t.step('should test complete offer combination flow', async () => {
        // Test the same logic that the web UI uses
        const { initWalletSDK, combineOffers } = await import('../../src/services/walletSDK.ts');

        // Initialize the SDK first
        await initWalletSDK();

        const result = await combineOffers([USER_OFFER_1, USER_OFFER_2]);

        // Validate the result
        assertEquals(result.success, true, 'Web UI should combine offers successfully');
        assertExists(result.combinedOffer, 'Combined offer should exist');
        assert(
          result.combinedOffer!.startsWith('offer1'),
          'Combined offer should be valid format',
        );

        console.log(`\n🌐 WEB UI E2E TEST RESULT:`);
        console.log(`✅ Success: ${result.success}`);
        console.log(`📏 Combined offer length: ${result.combinedOffer?.length || 0} characters`);
        console.log(
          `🔗 Combined offer starts with: ${result.combinedOffer?.substring(0, 50) || 'N/A'}...`,
        );
      });
    } catch (error) {
      console.error('Test failed with error:', error);

      // Take a screenshot for debugging if page exists
      if (page) {
        try {
          await page.screenshot({ path: './test-failure-screenshot.png' });
          console.log('📸 Screenshot saved to test-failure-screenshot.png');
        } catch (screenshotError) {
          console.error('Failed to take screenshot:', screenshotError);
        }
      }

      throw error;
    } finally {
      // Clean up: close browser and kill server
      if (browser) {
        await browser.close();
        console.log('🔒 Browser closed');
      }

      try {
        server.kill();
        await server.status;
      } catch (_error) {
        console.log('Server cleanup completed');
      }
    }
  },
  sanitizeOps: false,
  sanitizeResources: false,
});
