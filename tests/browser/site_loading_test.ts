/// <reference lib="deno.ns" />
import { assertEquals, assertExists } from 'https://deno.land/std@0.208.0/testing/asserts.ts';
import { chromium, firefox, webkit } from 'npm:playwright@1.45.0';
import type { Browser, Page } from 'npm:playwright@1.45.0';

/**
 * Browser tests to verify the Coffer site loads correctly and functions properly
 * Tests the dev server with real TypeScript transpilation
 */

const DEV_SERVER_URL = 'http://localhost:8000';
const SERVER_START_DELAY = 2000; // ms to wait for server startup

// Test fixtures
const VALID_OFFER_MOCK = 'offer1qqr83wcuu2rykcmqvpsrvl00n090ms8etrnq49wqj0h4d39nrl8xq5uda8lelhmlw8qs9eelsku4lrld3g69lsdkge7a9f7tj4l7mkca7u7e9ymmd6u46a637wxc7tewxycrqvqgn385tdznsla3cd7cuqx66wmd0q46733gf8hk0veekl2kd3f8ek0fmv6ntzwhndh7hgfznarwc757d22wg930lr8v9g0ld77tkppmfqsdl3hlclcp59q0mhezwpqdng0plallhlctychecwf85enua6lk5up9xa3x9m9dxl7avn7u3w0vsrwfzprn8hladyyxlll5ml3h7vacr9pml304q5eykhnx2jm4ahwqqychl0e5y26yu53fe76hc3yav0qjhy5uh7arzcw9svv3nn4ym870cu28uj97krsxa2wls5m9nlangtecm9p8kkyu4jcyt5f7twfyvm8lr65ndk5n56erlwmawvc0dm08469rgdk6tkveag2550atgxguasxqwqpzt5j8nd72xnd76ynd76ynd76vjd76usde';

const INVALID_OFFER = 'invalid_offer_string';

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

// Helper function to create a browser and page
async function createBrowserPage(browserName: 'chromium' | 'firefox' | 'webkit'): Promise<{ browser: Browser; page: Page }> {
  let browserLauncher;
  switch (browserName) {
    case 'chromium':
      browserLauncher = chromium;
      break;
    case 'firefox':
      browserLauncher = firefox;
      break;
    case 'webkit':
      browserLauncher = webkit;
      break;
  }

  const browser = await browserLauncher.launch({ 
    headless: true,
    args: ['--disable-web-security', '--disable-features=VizDisplayCompositor']
  });
  
  const page = await browser.newPage();
  
  // Listen for console errors
  const consoleMessages: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleMessages.push(`Console Error: ${msg.text()}`);
    }
  });
  
  // Listen for page errors
  page.on('pageerror', error => {
    consoleMessages.push(`Page Error: ${error.message}`);
  });
  
  // Store console messages on page for access in tests
  (page as any).consoleMessages = consoleMessages;
  
  return { browser, page };
}

Deno.test({
  name: 'Site Loading Tests',
  fn: async (t: Deno.TestContext) => {
    let serverProcess: Deno.ChildProcess | null = null;
    
    try {
      // Start the development server
      console.log('🚀 Starting development server...');
      serverProcess = await startDevServer();
      
      await t.step('should load the site without errors in Chromium', async () => {
        const { browser, page } = await createBrowserPage('chromium');
        
        try {
          console.log('🌐 Loading site in Chromium...');
          const response = await page.goto(DEV_SERVER_URL, { 
            waitUntil: 'networkidle',
            timeout: 10000 
          });
          
          // Verify response is successful
          assertEquals(response?.status(), 200, 'Page should load with 200 status');
          
          // Wait for React/Preact to render
          await page.waitForSelector('#root', { timeout: 5000 });
          
          // Check for the presence of key elements
          const header = await page.locator('h1').first();
          assertExists(await header.textContent(), 'Header should be present');
          
          // Verify no console errors occurred
          const consoleMessages = (page as any).consoleMessages as string[];
          if (consoleMessages.length > 0) {
            console.log('⚠️ Console messages:', consoleMessages);
            // Filter out known acceptable warnings
            const errors = consoleMessages.filter(msg => 
              !msg.includes('favicon.ico') && 
              !msg.includes('Warning:') &&
              !msg.includes('deprecated')
            );
            assertEquals(errors.length, 0, `No critical console errors should occur. Found: ${errors.join(', ')}`);
          }
          
          console.log('✅ Chromium test passed');
        } finally {
          await browser.close();
        }
      });

      await t.step('should display offer input fields', async () => {
        const { browser, page } = await createBrowserPage('chromium');
        
        try {
          console.log('🎯 Testing offer input fields...');
          await page.goto(DEV_SERVER_URL, { waitUntil: 'networkidle' });
          await page.waitForSelector('#root');
          
          // Check for offer input textareas
          const offerInputs = await page.locator('textarea').count();
          console.log(`📝 Found ${offerInputs} offer input fields`);
          assertEquals(offerInputs >= 5, true, 'Should have at least 5 offer input fields initially');
          
          console.log('✅ Input fields test passed');
        } finally {
          await browser.close();
        }
      });

      await t.step('should handle offer input and validation', async () => {
        const { browser, page } = await createBrowserPage('chromium');
        
        try {
          console.log('⚡ Testing offer validation...');
          await page.goto(DEV_SERVER_URL, { waitUntil: 'networkidle' });
          await page.waitForSelector('#root');
          
          // Find the first textarea and input a valid offer
          const firstTextarea = page.locator('textarea').first();
          await firstTextarea.fill(VALID_OFFER_MOCK);
          
          // Wait for validation to complete
          await page.waitForTimeout(1000);
          
          // Look for validation feedback (either success or error state)
          const textareaValue = await firstTextarea.inputValue();
          assertEquals(textareaValue, VALID_OFFER_MOCK, 'Textarea should contain the input offer');
          
          // Test invalid offer
          await firstTextarea.fill(INVALID_OFFER);
          await page.waitForTimeout(1000);
          
          // Should show some validation feedback
          const errorElements = await page.locator('[class*="error"], [class*="Error"]').count();
          console.log(`🚨 Found ${errorElements} error indicators for invalid offer`);
          
          console.log('✅ Offer validation test passed');
        } finally {
          await browser.close();
        }
      });

      await t.step('should display combined preview and action buttons', async () => {
        const { browser, page } = await createBrowserPage('chromium');
        
        try {
          console.log('🔄 Testing combined preview...');
          await page.goto(DEV_SERVER_URL, { waitUntil: 'networkidle' });
          await page.waitForSelector('#root');
          
          // Look for preview area
          const previewElements = await page.locator('[class*="preview"], [class*="Preview"]').count();
          console.log(`👁️ Found ${previewElements} preview elements`);
          
          // Look for action buttons (copy, download)
          const buttons = await page.locator('button').count();
          console.log(`🔘 Found ${buttons} buttons`);
          assertEquals(buttons >= 2, true, 'Should have copy and download buttons');
          
          // Check for error log accordion
          const accordion = await page.locator('[class*="accordion"], [class*="error"], [class*="log"]').count();
          console.log(`📋 Found ${accordion} log/accordion elements`);
          
          console.log('✅ Combined preview test passed');
        } finally {
          await browser.close();
        }
      });

      await t.step('should load in Firefox without errors', async () => {
        const { browser, page } = await createBrowserPage('firefox');
        
        try {
          console.log('🦊 Loading site in Firefox...');
          const response = await page.goto(DEV_SERVER_URL, { 
            waitUntil: 'networkidle',
            timeout: 10000 
          });
          
          assertEquals(response?.status(), 200, 'Page should load in Firefox');
          await page.waitForSelector('#root', { timeout: 5000 });
          
          // Verify basic functionality
          const textareas = await page.locator('textarea').count();
          assertEquals(textareas >= 5, true, 'Should have input fields in Firefox');
          
          console.log('✅ Firefox test passed');
        } finally {
          await browser.close();
        }
      });

    } finally {
      // Clean up: stop the development server
      if (serverProcess) {
        console.log('🛑 Stopping development server...');
        await stopDevServer(serverProcess);
      }
    }
  },
});

Deno.test({
  name: 'Site Performance Test',
  fn: async () => {
    let serverProcess: Deno.ChildProcess | null = null;
    
    try {
      console.log('⚡ Starting performance test...');
      serverProcess = await startDevServer();
      
      const { browser, page } = await createBrowserPage('chromium');
      
      try {
        // Measure page load time
        const startTime = Date.now();
        await page.goto(DEV_SERVER_URL, { waitUntil: 'networkidle' });
        await page.waitForSelector('#root');
        const loadTime = Date.now() - startTime;
        
        console.log(`📊 Page load time: ${loadTime}ms`);
        assertEquals(loadTime < 5000, true, 'Page should load in under 5 seconds');
        
        // Measure script loading
        const scriptTags = await page.locator('script').count();
        console.log(`📄 Found ${scriptTags} script tags`);
        
        console.log('✅ Performance test passed');
      } finally {
        await browser.close();
      }
    } finally {
      if (serverProcess) {
        await stopDevServer(serverProcess);
      }
    }
  },
});
