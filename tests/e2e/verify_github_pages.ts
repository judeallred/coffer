/// <reference lib="deno.ns" />
/**
 * Verify that the live GitHub Pages site works correctly
 */

import puppeteer from 'puppeteer';
import type { Browser, Page } from 'puppeteer';

const GITHUB_PAGES_URL = 'https://judeallred.github.io/coffer/';
const TIMEOUT = 30000; // 30 seconds

async function testGitHubPages(): Promise<void> {
  console.log('\n' + '='.repeat(70));
  console.log('🌐 Testing Live GitHub Pages Site');
  console.log(`📍 URL: ${GITHUB_PAGES_URL}`);
  console.log('='.repeat(70) + '\n');

  let browser: Browser | null = null;
  let page: Page | null = null;

  try {
    // Launch browser
    console.log('🚀 Launching browser...');
    const launchOptions: {
      headless: boolean;
      args: string[];
      executablePath?: string;
    } = {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    };

    // For CI environments, try to find Chrome
    if (Deno.env.get('CI')) {
      const possiblePaths = [
        '/usr/bin/google-chrome',
        '/usr/bin/chromium-browser',
        '/usr/bin/chromium',
      ];
      for (const path of possiblePaths) {
        try {
          await Deno.stat(path);
          launchOptions.executablePath = path;
          break;
        } catch {
          // Path doesn't exist, try next
        }
      }
    }

    browser = await puppeteer.launch(launchOptions);
    page = await browser.newPage();

    // Set viewport
    await page.setViewport({ width: 1280, height: 800 });

    // Track console messages
    const consoleMessages: string[] = [];
    page.on('console', (msg) => {
      const text = msg.text();
      consoleMessages.push(text);
      console.log(`  [Browser Console] ${text}`);
    });

    // Track errors
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => {
      const errorMsg = error.toString();
      pageErrors.push(errorMsg);
      console.error(`  ❌ [Page Error] ${errorMsg}`);
    });

    // Track failed requests
    const failedRequests: { url: string; status: number }[] = [];
    page.on('response', (response) => {
      if (!response.ok() && response.status() !== 304) {
        const url = response.url();
        const status = response.status();
        failedRequests.push({ url, status });
        console.error(`  ❌ [Failed Request] ${status} ${url}`);
      }
    });

    // Navigate to the site
    console.log(`\n📥 Loading ${GITHUB_PAGES_URL}...`);
    const response = await page.goto(GITHUB_PAGES_URL, {
      waitUntil: 'networkidle2',
      timeout: TIMEOUT,
    });

    if (!response || !response.ok()) {
      throw new Error(
        `Failed to load page: ${response?.status() || 'unknown error'}`,
      );
    }

    console.log(`✅ Page loaded successfully (${response.status()})`);

    // Wait for the main app to render
    console.log('\n⏳ Waiting for app to render...');
    await page.waitForSelector('#app', { timeout: 10000 });
    console.log('✅ App container found');

    // Wait a bit for WASM initialization
    console.log('\n⏳ Waiting for WASM initialization (10 seconds)...');
    await new Promise((resolve) => setTimeout(resolve, 10000));

    // Check for WASM initialization in console
    const wasmInitialized = consoleMessages.some((msg) =>
      msg.includes('WASM module initialized successfully') ||
      msg.includes('WASM initialized')
    );

    console.log('\n📊 Test Results:');
    console.log('='.repeat(70));

    // Check for critical errors
    const hasCriticalError = consoleMessages.some((msg) =>
      msg.includes('CRITICAL') || msg.includes('Failed to initialize')
    );

    if (hasCriticalError) {
      console.error('❌ CRITICAL ERROR found in console');
      console.error('\nConsole messages:');
      consoleMessages.forEach((msg) => console.error(`  - ${msg}`));
      throw new Error('Critical error detected');
    }

    // Report WASM status
    if (wasmInitialized) {
      console.log('✅ WASM initialized successfully');
    } else {
      console.warn('⚠️  WASM initialization message not found in console');
      console.warn('   (This might be okay if initialization is silent)');
    }

    // Report failed requests
    if (failedRequests.length > 0) {
      console.error(`\n❌ ${failedRequests.length} failed requests:`);
      failedRequests.forEach(({ url, status }) => {
        console.error(`  - ${status} ${url}`);
      });
      throw new Error(`${failedRequests.length} requests failed`);
    } else {
      console.log('✅ All requests succeeded (no 404s or errors)');
    }

    // Report page errors
    if (pageErrors.length > 0) {
      console.error(`\n❌ ${pageErrors.length} page errors:`);
      pageErrors.forEach((error) => {
        console.error(`  - ${error}`);
      });
      throw new Error(`${pageErrors.length} page errors detected`);
    } else {
      console.log('✅ No JavaScript errors detected');
    }

    // Check for essential elements
    console.log('\n🔍 Checking for essential UI elements...');
    const hasHeader = await page.$('header, [role="banner"]');
    const hasInputs = await page.$('textarea, input[type="text"]');

    if (hasHeader) {
      console.log('✅ Header element found');
    } else {
      console.warn('⚠️  Header element not found');
    }

    if (hasInputs) {
      console.log('✅ Input elements found');
    } else {
      console.warn('⚠️  Input elements not found');
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ GitHub Pages site verification PASSED!');
    console.log('='.repeat(70) + '\n');
  } catch (error) {
    console.error('\n' + '='.repeat(70));
    console.error('❌ GitHub Pages site verification FAILED!');
    console.error('='.repeat(70));
    console.error(`\nError: ${error}`);
    throw error;
  } finally {
    if (page) {
      await page.close();
    }
    if (browser) {
      await browser.close();
    }
  }
}

// Run the test
if (import.meta.main) {
  try {
    await testGitHubPages();
    Deno.exit(0);
  } catch {
    Deno.exit(1);
  }
}
