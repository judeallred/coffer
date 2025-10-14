/// <reference lib="deno.ns" />

/**
 * E2E test for GitHub Pages deployment
 * Tests the actual deployed site to catch production issues
 */

import { assert, assertEquals } from 'https://deno.land/std@0.208.0/testing/asserts.ts';
import { chromium } from 'npm:playwright@1.45.0';
import type { Browser, Page } from 'npm:playwright@1.45.0';

// GitHub Pages URL - can be overridden via environment variable
const GITHUB_PAGES_URL = Deno.env.get('GITHUB_PAGES_URL') ||
  'https://judeallred.github.io/coffer/';

Deno.test({
  name: 'E2E: GitHub Pages should load without module import errors',
  fn: async (t: Deno.TestContext) => {
    let browser: Browser | null = null;
    let page: Page | null = null;

    try {
      console.log(`🌐 Testing GitHub Pages at: ${GITHUB_PAGES_URL}`);
      browser = await chromium.launch({ headless: true });
      page = await browser.newPage();

      // Track all errors
      const consoleErrors: string[] = [];
      const pageErrors: Error[] = [];
      const failedRequests: Array<{ url: string; status: number }> = [];

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          const text = msg.text();
          consoleErrors.push(text);
          console.log(`❌ Console Error: ${text}`);
        }
      });

      page.on('pageerror', (error) => {
        pageErrors.push(error);
        console.log(`🔥 Page Error: ${error.message}`);
      });

      page.on('response', (response) => {
        if (!response.ok() && response.status() !== 304) {
          failedRequests.push({ url: response.url(), status: response.status() });
          console.log(`🌐 Failed Request [${response.status()}]: ${response.url()}`);
        }
      });

      await t.step('Should load GitHub Pages without errors', async () => {
        const response = await page!.goto(GITHUB_PAGES_URL, {
          waitUntil: 'networkidle',
          timeout: 30000,
        });

        assert(response !== null, 'Should get response from GitHub Pages');
        assert(response.ok(), `GitHub Pages should load (status: ${response.status()})`);
        console.log(`✅ Page loaded with status: ${response.status()}`);
      });

      await t.step('Should not have SVG module import errors', async () => {
        // Wait for page to settle
        await page!.waitForTimeout(3000);

        // Check for the specific SVG module error
        const svgModuleErrors = consoleErrors.filter(
          (error) =>
            error.includes('dexie-duck.svg') &&
            (error.includes('module script') ||
              error.includes('MIME type') ||
              error.includes('image/svg+xml')),
        );

        if (svgModuleErrors.length > 0) {
          console.error('❌ SVG module import errors found:');
          svgModuleErrors.forEach((err) => console.error(`   ${err}`));
        }

        assertEquals(
          svgModuleErrors.length,
          0,
          `Should not have SVG module import errors. Found: ${svgModuleErrors.join(' | ')}`,
        );

        console.log('✅ No SVG module import errors detected');
      });

      await t.step('Should load all assets correctly', () => {
        // Check for 404 errors on assets
        const assetFailures = failedRequests.filter(
          (req) =>
            req.status === 404 &&
            (req.url.includes('.svg') ||
              req.url.includes('.png') ||
              req.url.includes('.css') ||
              req.url.includes('.js')),
        );

        if (assetFailures.length > 0) {
          console.error('❌ Asset loading failures:');
          assetFailures.forEach((req) => console.error(`   [${req.status}] ${req.url}`));
        }

        assertEquals(
          assetFailures.length,
          0,
          `All assets should load correctly. Failed: ${assetFailures.map((r) => r.url).join(', ')}`,
        );

        console.log('✅ All assets loaded successfully');
      });

      await t.step('Should render React app', async () => {
        // Check that React rendered
        const rootContent = await page!.$eval('#root', (el) => el.innerHTML);
        assert(rootContent.length > 0, 'React app should render content');

        // Check for key elements
        const hasHeader = await page!.$('.header');
        assert(hasHeader !== null, 'Should have header');

        console.log('✅ React app rendered successfully');
      });

      await t.step('Should not have JavaScript errors', () => {
        // Filter out non-critical errors
        const criticalErrors = consoleErrors.filter(
          (error) =>
            !error.includes('DevTools') &&
            !error.includes('Manifest') &&
            !error.includes('favicon') &&
            !error.includes('404') &&
            !error.toLowerCase().includes('warning'),
        );

        const criticalPageErrors = pageErrors.filter(
          (error) =>
            !error.message.includes('DevTools') &&
            !error.message.includes('Manifest'),
        );

        if (criticalErrors.length > 0) {
          console.error('❌ Critical console errors:');
          criticalErrors.forEach((err) => console.error(`   ${err}`));
        }

        if (criticalPageErrors.length > 0) {
          console.error('❌ Critical page errors:');
          criticalPageErrors.forEach((err) => console.error(`   ${err.message}`));
        }

        assertEquals(
          criticalErrors.length,
          0,
          `Should not have critical console errors. Found: ${criticalErrors.join(' | ')}`,
        );
        assertEquals(
          criticalPageErrors.length,
          0,
          `Should not have critical page errors. Found: ${
            criticalPageErrors.map((e) => e.message).join(' | ')
          }`,
        );

        console.log('✅ No critical JavaScript errors');
      });

      console.log('✅ All GitHub Pages e2e tests passed!');
    } catch (error) {
      console.error('❌ GitHub Pages e2e test failed:', error);
      throw error;
    } finally {
      if (page) await page.close();
      if (browser) await browser.close();
    }
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

// Test with local build to catch issues before deployment
Deno.test({
  name: 'E2E: Local build should work like GitHub Pages',
  fn: async (t: Deno.TestContext) => {
    let browser: Browser | null = null;
    let page: Page | null = null;

    // Build with BASE_PATH to simulate GitHub Pages
    console.log('🔨 Building with BASE_PATH=/coffer...');
    const buildCmd = new Deno.Command('deno', {
      args: ['task', 'build'],
      env: { BASE_PATH: '/coffer', ...Deno.env.toObject() },
    });
    const buildResult = await buildCmd.output();
    if (!buildResult.success) {
      throw new Error('Build failed');
    }

    // Start local server
    const { startFileServer, killProcess } = await import('../test_utils.ts');
    const { process: server, url } = await startFileServer('dist', 8020);

    try {
      console.log(`🌐 Testing local build at: ${url}`);
      browser = await chromium.launch({ headless: true });
      page = await browser.newPage();

      const consoleErrors: string[] = [];
      const pageErrors: Error[] = [];

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      page.on('pageerror', (error) => {
        pageErrors.push(error);
      });

      await t.step('Local build should load without SVG module errors', async () => {
        await page!.goto(url, { waitUntil: 'networkidle', timeout: 10000 });
        await page!.waitForTimeout(3000);

        const svgModuleErrors = consoleErrors.filter(
          (error) =>
            error.includes('dexie-duck.svg') &&
            (error.includes('module script') || error.includes('MIME type')),
        );

        if (svgModuleErrors.length > 0) {
          console.error('❌ SVG module errors in local build:');
          svgModuleErrors.forEach((err) => console.error(`   ${err}`));
        }

        assertEquals(
          svgModuleErrors.length,
          0,
          `Local build should not have SVG module errors. This means it will fail on GitHub Pages too! Errors: ${
            svgModuleErrors.join(' | ')
          }`,
        );

        console.log('✅ Local build works correctly (no SVG module errors)');
      });
    } finally {
      if (page) await page.close();
      if (browser) await browser.close();
      await killProcess(server);

      // Rebuild with default BASE_PATH
      console.log('🔨 Rebuilding with default BASE_PATH...');
      const rebuildCmd = new Deno.Command('deno', {
        args: ['task', 'build'],
        env: { BASE_PATH: '/', ...Deno.env.toObject() },
      });
      await rebuildCmd.output();
    }
  },
  sanitizeOps: false,
  sanitizeResources: false,
});
