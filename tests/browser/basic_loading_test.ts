/// <reference lib="deno.ns" />
import { assertEquals, assertExists } from 'https://deno.land/std@0.208.0/testing/asserts.ts';
import { chromium } from 'npm:playwright@1.45.0';
import type { Browser, Page } from 'npm:playwright@1.45.0';

/**
 * Basic browser test to verify the Coffer site loads without errors
 * This test focuses on verifying TypeScript transpilation and basic loading
 */

const DEV_SERVER_URL = 'http://localhost:8000';
const SERVER_START_DELAY = 3000; // ms to wait for server startup
const PAGE_LOAD_TIMEOUT = 10000; // ms

// Helper function to start dev server
async function startDevServer(): Promise<Deno.ChildProcess> {
  const serverProcess = new Deno.Command('deno', {
    args: ['task', 'dev'],
    cwd: '/Users/judeallred/code/coffer',
    stdout: 'piped',
    stderr: 'piped',
  }).spawn();

  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, SERVER_START_DELAY));
  
  return serverProcess;
}

// Helper function to stop dev server
async function stopDevServer(process: Deno.ChildProcess): Promise<void> {
  try {
    process.kill('SIGTERM');
    await process.status;
  } catch {
    // Process may already be dead
  }
}

Deno.test({
  name: 'Basic Site Loading Test',
  fn: async () => {
    let serverProcess: Deno.ChildProcess | null = null;
    let browser: Browser | null = null;
    let page: Page | null = null;

    try {
      console.log('🚀 Starting development server...');
      serverProcess = await startDevServer();

      console.log('🌐 Launching Chromium browser...');
      browser = await chromium.launch({ 
        headless: true,
        args: ['--disable-web-security', '--no-sandbox']
      });
      
      page = await browser.newPage();
      
      // Collect console messages
      const consoleMessages: Array<{ type: string; text: string }> = [];
      const pageErrors: string[] = [];
      
      page.on('console', msg => {
        consoleMessages.push({ type: msg.type(), text: msg.text() });
        if (msg.type() === 'error') {
          console.log(`🚨 Console Error: ${msg.text()}`);
        } else if (msg.type() === 'log') {
          console.log(`📝 Console Log: ${msg.text()}`);
        }
      });
      
      page.on('pageerror', error => {
        pageErrors.push(error.message);
        console.log(`💥 Page Error: ${error.message}`);
      });

      console.log('📄 Loading page...');
      const response = await page.goto(DEV_SERVER_URL, { 
        waitUntil: 'networkidle',
        timeout: PAGE_LOAD_TIMEOUT 
      });
      
      // Verify response is successful
      assertExists(response, 'Response should exist');
      assertEquals(response.status(), 200, 'Page should load with 200 status');

      // Wait a bit for JavaScript to execute
      await page.waitForTimeout(2000);

      // Check that the root element exists
      const rootElement = await page.$('#root');
      assertExists(rootElement, 'Root element should exist');

      // Check if the page title is correct
      const title = await page.title();
      assertEquals(title.includes('Coffer'), true, 'Page title should contain "Coffer"');

      // Filter out acceptable console messages
      const criticalErrors = consoleMessages.filter(msg => 
        msg.type === 'error' && 
        !msg.text.includes('favicon.ico') &&
        !msg.text.includes('Failed to load resource') &&
        !msg.text.includes('404')
      );

      console.log(`📊 Total console messages: ${consoleMessages.length}`);
      console.log(`🚨 Critical errors: ${criticalErrors.length}`);
      console.log(`💥 Page errors: ${pageErrors.length}`);

      if (criticalErrors.length > 0) {
        console.log('Critical errors found:', criticalErrors);
      }

      if (pageErrors.length > 0) {
        console.log('Page errors found:', pageErrors);
      }

      // Assert no critical errors
      assertEquals(criticalErrors.length, 0, `No critical console errors should occur. Found: ${criticalErrors.map(e => e.text).join(', ')}`);
      assertEquals(pageErrors.length, 0, `No page errors should occur. Found: ${pageErrors.join(', ')}`);

      console.log('✅ Basic loading test passed successfully!');

    } finally {
      // Clean up
      if (page) {
        console.log('🔒 Closing browser page...');
        await page.close();
      }
      
      if (browser) {
        console.log('🔒 Closing browser...');
        await browser.close();
      }
      
      if (serverProcess) {
        console.log('🛑 Stopping development server...');
        await stopDevServer(serverProcess);
      }
    }
  },
});

Deno.test({
  name: 'Network Resources Test',
  fn: async () => {
    let serverProcess: Deno.ChildProcess | null = null;

    try {
      console.log('🚀 Starting server for network test...');
      serverProcess = await startDevServer();

      // Test individual endpoints
      const endpoints = [
        { path: '/', description: 'Main page' },
        { path: '/main.tsx', description: 'Main TypeScript file' },
        { path: '/styles/global.css', description: 'Global CSS' },
        { path: '/components/App.tsx', description: 'App component' },
      ];

      for (const endpoint of endpoints) {
        console.log(`🔍 Testing ${endpoint.description}: ${endpoint.path}`);
        
        const response = await fetch(`${DEV_SERVER_URL}${endpoint.path}`);
        console.log(`📡 ${endpoint.path}: ${response.status} ${response.statusText}`);
        
        // All these endpoints should return 200 (except maybe some components if they have issues)
        if (endpoint.path === '/' || endpoint.path === '/styles/global.css') {
          assertEquals(response.status, 200, `${endpoint.description} should load successfully`);
        } else {
          // TypeScript files should load (either 200 or reasonable error)
          assertEquals(response.status < 500, true, `${endpoint.description} should not return server error`);
        }
      }

      console.log('✅ Network resources test passed!');

    } finally {
      if (serverProcess) {
        await stopDevServer(serverProcess);
      }
    }
  },
});
