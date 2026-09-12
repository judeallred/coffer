/// <reference lib="deno.ns" />

/**
 * Test to reproduce freeze when pasting Dexie offer URLs
 *
 * Steps to reproduce:
 * 1. Load the site
 * 2. Paste https://dexie.space/offers/BJ94HYSwfgZPH3bty87SupKmuZZ9zAPki8g3bcSYBmHZ
 * 3. Paste https://dexie.space/offers/EzH87fgfhWvXM9hQo2CEjeTm6qCE9e3A8R6X828J1Hm1
 * 4. Site freezes
 */

import { assert } from 'https://deno.land/std@0.208.0/testing/asserts.ts';
import { chromium } from 'npm:playwright@1.59.1';
import type { Browser, Page } from 'npm:playwright@1.59.1';

Deno.test({
  name: 'Dexie Freeze Test: Reproduce freeze with specific Dexie offer URLs',
  fn: async (t: Deno.TestContext) => {
    let browser: Browser | null = null;
    let page: Page | null = null;

    // Start a simple static file server for the dist directory
    const serverProcess = new Deno.Command('deno', {
      args: [
        'run',
        '--allow-net',
        '--allow-read',
        'https://deno.land/std@0.208.0/http/file_server.ts',
        '--port',
        '8005',
        'dist',
      ],
      cwd: Deno.cwd(),
      stdout: 'piped',
      stderr: 'piped',
    }).spawn();

    // Wait for the server to start
    await new Promise((resolve) => setTimeout(resolve, 2000));

    try {
      console.log('🚀 Launching browser for Dexie freeze test...');
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

      await t.step('Load the site', async () => {
        assert(page !== null, 'Page should be initialized');
        console.log('📄 Loading page...');
        await page.goto('http://localhost:8005', {
          waitUntil: 'domcontentloaded',
          timeout: 10000,
        });

        // Wait for WASM to initialize
        await page.waitForTimeout(4000);
        console.log('✅ Page loaded and WASM initialized');
      });

      await t.step('Paste first Dexie offer URL', async () => {
        assert(page !== null, 'Page should be initialized');

        const offerUrl1 = 'https://dexie.space/offers/BJ94HYSwfgZPH3bty87SupKmuZZ9zAPki8g3bcSYBmHZ';
        console.log(`📋 Pasting first offer: ${offerUrl1}`);

        // Simulate paste by setting clipboard and triggering paste event
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

      await t.step('Check responsiveness after second paste', async () => {
        assert(page !== null, 'Page should be initialized');

        console.log('🔍 Checking if site is still responsive...');

        const startTime = Date.now();
        try {
          await page.evaluate(() => document.title, { timeout: 2000 });
          const responseTime = Date.now() - startTime;

          console.log(`⚡ Response time after second paste: ${responseTime}ms`);
          assert(
            responseTime < 1000,
            `Page is slow/frozen after second paste: ${responseTime}ms`,
          );
        } catch (error) {
          console.log('❌ Page appears to be frozen!');
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
            await page.evaluate(() => document.title, { timeout: 1000 });
            const responseTime = Date.now() - startTime;

            console.log(`  ${i + 1}s: ${responseTime}ms`);

            assert(
              responseTime < 500,
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

      console.log('✅ All Dexie freeze tests passed!');
    } finally {
      console.log('🧹 Cleanup completed');
      if (page) await page.close();
      if (browser) await browser.close();
      serverProcess.kill('SIGTERM');
    }
  },
  sanitizeOps: false,
  sanitizeResources: false,
});
