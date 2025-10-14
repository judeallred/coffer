/// <reference lib="deno.ns" />

/**
 * Test to reproduce freeze when pasting Dexie offer URLs on DEV server
 *
 * This test runs against the dev server (localhost:8000) instead of the built version
 */

import { assert } from 'https://deno.land/std@0.208.0/testing/asserts.ts';
import { chromium } from 'npm:playwright@1.45.0';
import type { Browser, Page } from 'npm:playwright@1.45.0';

Deno.test({
  name: 'Dexie Freeze Test (DEV): Reproduce freeze with Dexie offers on dev server',
  fn: async (t: Deno.TestContext) => {
    let browser: Browser | null = null;
    let page: Page | null = null;

    // Wait for dev server to be ready
    await new Promise((resolve) => setTimeout(resolve, 3000));

    try {
      console.log('🚀 Launching browser for Dexie freeze test (DEV)...');
      browser = await chromium.launch();
      page = await browser.newPage();

      const consoleMessages: string[] = [];
      const consoleErrors: string[] = [];
      const pageErrors: Error[] = [];

      page.on('console', (msg) => {
        const text = msg.text();
        consoleMessages.push(text);
        if (msg.type() === 'error') {
          consoleErrors.push(text);
          console.log(`❌ Console Error: ${text}`);
        }
      });

      page.on('pageerror', (error) => {
        pageErrors.push(error);
        console.log(`🔥 Page Error: ${error.message}`);
      });

      await t.step('Load the dev site', async () => {
        assert(page !== null, 'Page should be initialized');
        console.log('📄 Loading page from dev server (localhost:8000)...');

        try {
          await page.goto('http://localhost:8000', {
            waitUntil: 'domcontentloaded',
            timeout: 10000,
          });
        } catch (error) {
          throw new Error(`Failed to load dev server. Is it running? Error: ${error}`);
        }

        // Wait for WASM to initialize
        await page.waitForTimeout(4000);
        console.log('✅ Dev page loaded and WASM initialized');
      });

      await t.step('Paste first Dexie offer URL', async () => {
        assert(page !== null, 'Page should be initialized');

        const offerUrl1 = 'https://dexie.space/offers/BJ94HYSwfgZPH3bty87SupKmuZZ9zAPki8g3bcSYBmHZ';
        console.log(`📋 Pasting first offer: ${offerUrl1}`);

        // Simulate paste
        await page.evaluate((url) => {
          const pasteEvent = new ClipboardEvent('paste', {
            clipboardData: new DataTransfer(),
          });
          Object.defineProperty(pasteEvent, 'clipboardData', {
            value: {
              getData: () => url,
            },
          });
          document.dispatchEvent(pasteEvent);
        }, offerUrl1);

        // Wait for the offer to be processed
        await page.waitForTimeout(3000);
        console.log('✅ First offer pasted');
      });

      await t.step('Check responsiveness after first paste', async () => {
        assert(page !== null, 'Page should be initialized');

        const startTime = Date.now();
        await page.evaluate(() => document.title);
        const responseTime = Date.now() - startTime;

        console.log(`⚡ Response time after first paste: ${responseTime}ms`);
        assert(
          responseTime < 1000,
          `Page is slow after first paste: ${responseTime}ms`,
        );
      });

      await t.step('Paste second Dexie offer URL', async () => {
        assert(page !== null, 'Page should be initialized');

        const offerUrl2 = 'https://dexie.space/offers/EzH87fgfhWvXM9hQo2CEjeTm6qCE9e3A8R6X828J1Hm1';
        console.log(`📋 Pasting second offer: ${offerUrl2}`);

        // Simulate paste
        await page.evaluate((url) => {
          const pasteEvent = new ClipboardEvent('paste', {
            clipboardData: new DataTransfer(),
          });
          Object.defineProperty(pasteEvent, 'clipboardData', {
            value: {
              getData: () => url,
            },
          });
          document.dispatchEvent(pasteEvent);
        }, offerUrl2);

        // Wait for the offer to be processed
        await page.waitForTimeout(3000);
        console.log('✅ Second offer pasted');
      });

      await t.step('Check responsiveness after second paste (CRITICAL)', async () => {
        assert(page !== null, 'Page should be initialized');

        console.log('🔍 Checking if site is still responsive...');

        const startTime = Date.now();
        try {
          await page.evaluate(() => document.title, { timeout: 5000 });
          const responseTime = Date.now() - startTime;

          console.log(`⚡ Response time after second paste: ${responseTime}ms`);

          if (responseTime > 1000) {
            console.log('⚠️  SLOW RESPONSE DETECTED!');
          }

          assert(
            responseTime < 2000,
            `Page is slow/frozen after second paste: ${responseTime}ms`,
          );
        } catch (error) {
          console.log('❌ PAGE APPEARS TO BE FROZEN!');
          console.log('📊 Console messages:', consoleMessages.length);
          console.log('❌ Console errors:', consoleErrors.length);
          console.log('🔥 Page errors:', pageErrors.length);

          if (consoleMessages.length > 0) {
            console.log('Last 10 console messages:');
            consoleMessages.slice(-10).forEach((msg) => console.log(`  - ${msg}`));
          }

          throw new Error(`Page is frozen after pasting second offer: ${error}`);
        }

        console.log('✅ Site is still responsive');
      });

      await t.step('Monitor for continued responsiveness', async () => {
        assert(page !== null, 'Page should be initialized');

        console.log('⏱️  Monitoring responsiveness for 5 seconds...');

        for (let i = 0; i < 5; i++) {
          await page.waitForTimeout(1000);

          const startTime = Date.now();
          try {
            await page.evaluate(() => document.title, { timeout: 2000 });
            const responseTime = Date.now() - startTime;

            console.log(`  ${i + 1}s: ${responseTime}ms`);

            if (responseTime > 500) {
              console.log(`  ⚠️  Slow response at ${i + 1}s!`);
            }

            assert(
              responseTime < 1000,
              `Page became unresponsive at ${i + 1}s: ${responseTime}ms`,
            );
          } catch (error) {
            throw new Error(`Page froze after ${i + 1} seconds: ${error}`);
          }
        }

        console.log('✅ Site remained responsive for 5 seconds');
      });

      await t.step('Check for errors', () => {
        if (consoleErrors.length > 0) {
          console.log('⚠️  Console errors found:');
          consoleErrors.forEach((err) => console.log(`  - ${err}`));
        }

        if (pageErrors.length > 0) {
          console.log('⚠️  Page errors found:');
          pageErrors.forEach((err) => console.log(`  - ${err.message}`));
        }

        // Critical errors should fail the test
        const criticalErrors = consoleErrors.filter(
          (err) =>
            err.includes('Uncaught') ||
            err.includes('Maximum call stack') ||
            err.includes('out of memory'),
        );

        assert(
          criticalErrors.length === 0,
          `Critical errors found: ${criticalErrors.join(', ')}`,
        );
      });

      console.log('✅ All Dexie freeze tests passed on DEV server!');
    } finally {
      console.log('🧹 Cleanup completed');
      if (page) await page.close();
      if (browser) await browser.close();
    }
  },
  sanitizeOps: false,
  sanitizeResources: false,
});
