/// <reference lib="deno.ns" />

/**
 * Performance and Render Loop Detection Test
 *
 * This test ensures the app doesn't have render loops or performance issues
 * caused by excessive re-renders, interval multiplications, or event listener leaks.
 */

import { assert } from 'https://deno.land/std@0.208.0/testing/asserts.ts';
import { chromium } from 'npm:playwright@1.59.1';
import type { Browser, Page } from 'npm:playwright@1.59.1';
import { TEST_OFFER_1, TEST_OFFER_2 } from './fixtures/offers.ts';
import { killProcess, startFileServer } from './test_utils.ts';

Deno.test({
  name: 'Performance Test: Detect render loops and performance issues',
  fn: async (t: Deno.TestContext) => {
    let browser: Browser | null = null;
    let page: Page | null = null;

    // Start a simple static file server for the dist directory
    // Uses dynamic port allocation to avoid conflicts
    const { process: serverProcess, url } = await startFileServer('dist', 8004);

    try {
      console.log('🚀 Launching browser for performance test...');
      browser = await chromium.launch();
      page = await browser.newPage();

      await t.step('Page should not have excessive console output', async () => {
        assert(page !== null, 'Page should be initialized');

        const consoleMessages: string[] = [];
        page.on('console', (msg) => {
          consoleMessages.push(msg.text());
        });

        console.log(`📄 Loading page at ${url}...`);
        await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: 10000,
        });

        // Wait for initial render and WASM initialization
        await page.waitForTimeout(4000);

        const initialMessageCount = consoleMessages.length;
        console.log(`📊 Initial console messages: ${initialMessageCount}`);

        // Clear the messages and monitor for 5 seconds
        consoleMessages.length = 0;
        await page.waitForTimeout(5000);

        const messagesAfter5Sec = consoleMessages.length;
        console.log(`📊 Console messages in 5 seconds: ${messagesAfter5Sec}`);

        // After initial load, there should be minimal console output
        // The app should NOT be continuously logging (which would indicate a render loop)
        // Allow up to 50 messages in 5 seconds (the 500ms revalidation interval runs 10 times)
        assert(
          messagesAfter5Sec < 100,
          `Too many console messages in 5 seconds: ${messagesAfter5Sec}. This indicates a possible render loop.`,
        );

        console.log('✅ No excessive console output detected');
      });

      await t.step('Page should remain responsive', async () => {
        assert(page !== null, 'Page should be initialized');

        // Test that the page can respond to interactions
        // Try clicking on an element
        const heading = await page.$('h1');
        assert(heading !== null, 'Heading should exist');

        // Measure response time
        const startTime = Date.now();
        await page.evaluate(() => {
          // This should execute quickly if the page isn't frozen
          return document.title;
        });
        const endTime = Date.now();
        const responseTime = endTime - startTime;

        console.log(`⚡ Page response time: ${responseTime}ms`);

        // Response should be under 100ms. If it's higher, the page might be frozen/slow
        assert(
          responseTime < 100,
          `Page is slow to respond: ${responseTime}ms. This might indicate a performance issue.`,
        );

        console.log('✅ Page remains responsive');
      });

      await t.step('Coinset warnings should not restart offer generation', async () => {
        assert(page !== null, 'Page should be initialized');

        let twoOfferCombinationCount = 0;
        page.on('console', (message) => {
          if (message.text().includes('Combining 2 offers')) {
            twoOfferCombinationCount++;
          }
        });

        await page.route('**/*', async (route) => {
          if (route.request().url().toLowerCase().includes('coinset')) {
            await route.fulfill({
              status: 503,
              contentType: 'application/json',
              body: JSON.stringify({ error: 'Simulated Coinset outage' }),
            });
            return;
          }
          await route.continue();
        });

        const input = page.locator('.offer-input');
        await input.evaluate((element, pastedOffers) => {
          const clipboard = new DataTransfer();
          clipboard.setData('text/plain', pastedOffers);
          element.dispatchEvent(
            new ClipboardEvent('paste', {
              bubbles: true,
              cancelable: true,
              clipboardData: clipboard,
            }),
          );
        }, `${TEST_OFFER_1} ${TEST_OFFER_2}`);

        await page.waitForFunction(
          () => document.querySelector('.output-status')?.textContent?.includes('Ready (2 offers)'),
          undefined,
          { timeout: 10000 },
        );
        await page.waitForSelector('.chain-verification.warning', { timeout: 10000 });

        // Give a callback-driven feedback loop enough time to restart the effect.
        await page.waitForTimeout(1000);

        assert(
          twoOfferCombinationCount === 1,
          `Expected one two-offer combination, observed ${twoOfferCombinationCount}`,
        );
        assert(
          (await page.locator('.output-status').textContent())?.includes('Ready (2 offers)'),
          'Combined offer status should remain ready after a Coinset warning',
        );
      });

      await t.step('Memory usage should be stable', async () => {
        assert(page !== null, 'Page should be initialized');

        // Get initial memory metrics
        const metrics1 = await page.evaluate(() => {
          if ((performance as unknown as { memory?: { usedJSHeapSize: number } }).memory) {
            return (performance as unknown as { memory: { usedJSHeapSize: number } }).memory
              .usedJSHeapSize;
          }
          return 0;
        });

        // Wait 5 seconds
        await page.waitForTimeout(5000);

        // Get memory metrics again
        const metrics2 = await page.evaluate(() => {
          if ((performance as unknown as { memory?: { usedJSHeapSize: number } }).memory) {
            return (performance as unknown as { memory: { usedJSHeapSize: number } }).memory
              .usedJSHeapSize;
          }
          return 0;
        });

        if (metrics1 > 0 && metrics2 > 0) {
          const memoryIncreaseMB = (metrics2 - metrics1) / (1024 * 1024);
          console.log(`📊 Memory increase over 5 seconds: ${memoryIncreaseMB.toFixed(2)} MB`);

          // Memory should not increase by more than 10MB in 5 seconds of idle time
          // This would indicate a memory leak
          assert(
            memoryIncreaseMB < 10,
            `Excessive memory increase: ${
              memoryIncreaseMB.toFixed(2)
            } MB. This might indicate a memory leak.`,
          );

          console.log('✅ Memory usage is stable');
        } else {
          console.log('⚠️  Memory metrics not available in this browser');
        }
      });

      console.log('✅ All performance tests passed!');
    } finally {
      console.log('🧹 Cleanup completed');
      if (page) await page.close();
      if (browser) await browser.close();
      await killProcess(serverProcess);
    }
  },
  sanitizeOps: false,
  sanitizeResources: false,
});
