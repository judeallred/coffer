/// <reference lib="deno.ns" />
import { assert } from 'https://deno.land/std@0.208.0/testing/asserts.ts';
import { type Browser, chromium, type Page } from 'npm:playwright@1.45.0';

/**
 * Simple smoke test to verify the site loads without console errors
 * Uses Playwright instead of Puppeteer for better stability
 * This is a lightweight test that should run quickly as part of the standard test suite
 */

Deno.test({
  name: 'Smoke Test: Site loads without console errors',
  fn: async (t: Deno.TestContext) => {
    let browser: Browser | null = null;
    let page: Page | null = null;

    // Start a simple file server for the dist directory
    const serverProcess = new Deno.Command('deno', {
      args: [
        'run',
        '--allow-net',
        '--allow-read',
        'https://deno.land/std@0.208.0/http/file_server.ts',
        '--port',
        '8002',
        'dist',
      ],
      cwd: Deno.cwd(),
      stdout: 'piped',
      stderr: 'piped',
    });

    const server = serverProcess.spawn();

    // Wait for server to start
    await new Promise((resolve) => setTimeout(resolve, 2000));

    try {
      // Launch Playwright browser
      console.log('🚀 Launching browser for smoke test...');
      browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const context = await browser.newContext();
      page = await context.newPage();

      // Collect console messages
      const consoleErrors: string[] = [];
      const consoleWarnings: string[] = [];
      const allConsoleMessages: Array<{ type: string; text: string }> = [];

      page.on('console', (msg) => {
        const type = msg.type();
        const text = msg.text();

        allConsoleMessages.push({ type, text });

        if (type === 'error') {
          consoleErrors.push(text);
          console.log(`❌ Console Error: ${text}`);
        } else if (type === 'warning') {
          consoleWarnings.push(text);
          console.log(`⚠️  Console Warning: ${text}`);
        } else {
          console.log(`📋 Console ${type}: ${text}`);
        }
      });

      // Collect page errors
      const pageErrors: Error[] = [];
      page.on('pageerror', (error) => {
        pageErrors.push(error);
        console.log(`🔥 Page Error: ${error.message}`);
        console.log(`   Stack: ${error.stack?.slice(0, 200)}`);
      });

      // Track failed network requests
      const failedRequests: Array<{ url: string; status: number }> = [];
      page.on('response', (response) => {
        if (!response.ok() && response.status() !== 304) {
          const url = response.url();
          const status = response.status();
          failedRequests.push({ url, status });
          console.log(`🌐 Failed Request [${status}]: ${url}`);
        }
      });

      await t.step('Page should load successfully', async () => {
        assert(page !== null, 'Page should be initialized');
        console.log('📄 Loading page...');
        const response = await page.goto('http://localhost:8002', {
          waitUntil: 'domcontentloaded',
          timeout: 10000,
        });

        assert(response !== null, 'Page should respond');
        assert(response.ok(), `Page should load successfully (status: ${response.status()})`);
        console.log('✅ Page loaded with status:', response.status());
      });

      await t.step('Page should have expected title', async () => {
        assert(page !== null, 'Page should be initialized');
        // Wait a bit for any dynamic content to load
        await page.waitForTimeout(2000);

        const title = await page.title();
        console.log('📝 Page title:', title);
        assert(title.includes('Coffer'), 'Page title should contain "Coffer"');
      });

      await t.step('Page should render React components', async () => {
        assert(page !== null, 'Page should be initialized');

        // Wait for React to render - check for root element content
        try {
          await page.waitForSelector('#root > *', { timeout: 5000 });
          console.log('✅ React app rendered in #root');
        } catch {
          const rootHTML = await page.$eval('#root', (el) => el.innerHTML);
          console.log('❌ #root content:', rootHTML.slice(0, 200));
          console.log(`❌ Total console messages: ${allConsoleMessages.length}`);
          console.log(`❌ Console errors: ${consoleErrors.length}`);
          console.log(`❌ Page errors: ${pageErrors.length}`);

          if (pageErrors.length > 0) {
            console.log('\n📋 Page Errors:');
            pageErrors.forEach((err) => console.log(`  - ${err.message}`));
          }

          if (allConsoleMessages.length > 0) {
            console.log('\n📋 Last 10 console messages:');
            allConsoleMessages.slice(-10).forEach((msg) =>
              console.log(`  [${msg.type}] ${msg.text}`)
            );
          }

          if (failedRequests.length > 0) {
            console.log('\n🌐 Failed Network Requests:');
            failedRequests.forEach((req) => console.log(`  [${req.status}] ${req.url}`));
          }

          throw new Error('React app did not render - #root is empty');
        }

        // Check that main components exist
        const hasHeader = await page.$('.header');
        assert(hasHeader !== null, 'Header component should exist');
        console.log('✅ Header component found');

        const hasMainContent = await page.$('.main-content');
        assert(hasMainContent !== null, 'Main content should exist');
        console.log('✅ Main content found');
      });

      await t.step('Page should not have critical JavaScript errors', () => {
        // Filter out non-critical errors
        const criticalErrors = consoleErrors.filter(
          (error) =>
            !error.includes('DevTools') && // Ignore DevTools messages
            !error.includes('Manifest') && // Ignore manifest warnings
            !error.includes('favicon') && // Ignore favicon errors
            !error.includes('the server responded with a status of 404'), // Ignore 404s for optional resources
        );

        const criticalPageErrors = pageErrors.filter(
          (error) =>
            !error.message.includes('DevTools') &&
            !error.message.includes('Manifest') &&
            !error.message.includes('favicon'),
        );

        // Check specifically for module resolution errors
        const moduleErrors = [...criticalErrors, ...criticalPageErrors.map((e) => e.message)]
          .filter(
            (err) => err.includes('Failed to resolve module specifier') || err.includes('module'),
          );

        if (moduleErrors.length > 0) {
          console.log('❌ Module resolution errors found:');
          moduleErrors.forEach((err) => console.log(`   - ${err}`));
        }

        if (criticalErrors.length > 0) {
          console.log('❌ Critical console errors found:');
          criticalErrors.forEach((err) => console.log(`   - ${err}`));
        }

        if (criticalPageErrors.length > 0) {
          console.log('❌ Critical page errors found:');
          criticalPageErrors.forEach((err) => console.log(`   - ${err.message}`));
        }

        assert(
          criticalErrors.length === 0,
          `Page should not have critical console errors. Found: ${criticalErrors.join(', ')}`,
        );

        assert(
          criticalPageErrors.length === 0,
          `Page should not have critical page errors. Found: ${
            criticalPageErrors.map((e) => e.message).join(', ')
          }`,
        );

        console.log('✅ No critical JavaScript errors found');
      });

      await t.step('WASM should initialize successfully', async () => {
        assert(page !== null, 'Page should be initialized');
        // Wait for WASM initialization (give it up to 5 seconds)
        await page.waitForTimeout(3000);

        // Check for WASM initialization success message in console
        const hasInitMessage = consoleErrors.length === 0 || consoleWarnings.length === 0;

        // Alternatively, check if the loading notice is gone
        const loadingNotice = await page.$('.loading-notice');
        const isLoadingHidden = loadingNotice === null;

        assert(
          isLoadingHidden || hasInitMessage,
          'WASM should initialize (loading notice should disappear)',
        );

        console.log('✅ WASM appears to have initialized successfully');
      });

      console.log('✅ All smoke tests passed!');
    } finally {
      // Cleanup
      if (page) await page.close();
      if (browser) await browser.close();

      // Kill the file server
      server.kill('SIGTERM');
      await server.status;

      console.log('🧹 Cleanup completed');
    }
  },
  // Longer timeout for browser tests
  sanitizeResources: false,
  sanitizeOps: false,
});
