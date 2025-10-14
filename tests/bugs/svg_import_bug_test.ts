/// <reference lib="deno.ns" />

/**
 * Test to verify that SVG assets load correctly with different BASE_PATH values
 *
 * Bug: DexieOfferInfo uses string path './assets/dexie-duck.svg' instead of import
 * This breaks when BASE_PATH is set to subdirectories like '/coffer'
 */

import { assert } from 'https://deno.land/std@0.208.0/testing/asserts.ts';
import { chromium } from 'npm:playwright@1.45.0';
import type { Browser, Page } from 'npm:playwright@1.45.0';

async function buildWithBasePath(basePath: string): Promise<void> {
  const buildCmd = new Deno.Command('deno', {
    args: ['task', 'build'],
    env: { BASE_PATH: basePath, ...Deno.env.toObject() },
    cwd: Deno.cwd(),
  });
  const result = await buildCmd.output();
  if (!result.success) {
    throw new Error('Build failed');
  }
}

Deno.test({
  name: 'Bug Test: SVG should load correctly with BASE_PATH=/coffer',
  fn: async () => {
    console.log('🔨 Building with BASE_PATH=/coffer...');
    await buildWithBasePath('/coffer');

    // Start server
    const serverProcess = new Deno.Command('deno', {
      args: [
        'run',
        '--allow-net',
        '--allow-read',
        'https://deno.land/std@0.208.0/http/file_server.ts',
        '--port',
        '8010',
        'dist',
      ],
      cwd: Deno.cwd(),
      stdout: 'piped',
      stderr: 'piped',
    }).spawn();

    await new Promise((resolve) => setTimeout(resolve, 2000));

    let browser: Browser | null = null;
    let page: Page | null = null;

    try {
      browser = await chromium.launch({ headless: true });
      page = await browser.newPage();

      // Track network requests
      const failedRequests: Array<{ url: string; status: number }> = [];
      page.on('response', (response) => {
        if (!response.ok() && response.status() !== 304) {
          failedRequests.push({ url: response.url(), status: response.status() });
        }
      });

      await page.goto('http://localhost:8010/index.html', {
        waitUntil: 'networkidle',
        timeout: 10000,
      });

      // Wait for page to fully load
      await page.waitForTimeout(3000);

      // Check for SVG 404 errors
      const svgFailures = failedRequests.filter((req) =>
        req.url.includes('dexie-duck.svg') || req.url.includes('.svg')
      );

      if (svgFailures.length > 0) {
        console.error('❌ SVG loading failures detected:');
        svgFailures.forEach((req) => console.error(`  [${req.status}] ${req.url}`));
      }

      assert(
        svgFailures.length === 0,
        `SVG assets should load correctly with BASE_PATH=/coffer. Found ${svgFailures.length} failures: ${
          svgFailures.map((r) => r.url).join(', ')
        }`,
      );

      console.log('✅ All SVG assets loaded correctly');
    } finally {
      if (page) await page.close();
      if (browser) await browser.close();
      serverProcess.kill('SIGTERM');
      await serverProcess.status;

      // Rebuild with default BASE_PATH
      console.log('🔨 Rebuilding with default BASE_PATH...');
      await buildWithBasePath('/');
    }
  },
  sanitizeOps: false,
  sanitizeResources: false,
});

Deno.test({
  name: 'Bug Test: SVG should load correctly with BASE_PATH=/ (root)',
  fn: async () => {
    console.log('🔨 Building with BASE_PATH=/...');
    await buildWithBasePath('/');

    // Start server
    const serverProcess = new Deno.Command('deno', {
      args: [
        'run',
        '--allow-net',
        '--allow-read',
        'https://deno.land/std@0.208.0/http/file_server.ts',
        '--port',
        '8011',
        'dist',
      ],
      cwd: Deno.cwd(),
      stdout: 'piped',
      stderr: 'piped',
    }).spawn();

    await new Promise((resolve) => setTimeout(resolve, 2000));

    let browser: Browser | null = null;
    let page: Page | null = null;

    try {
      browser = await chromium.launch({ headless: true });
      page = await browser.newPage();

      const failedRequests: Array<{ url: string; status: number }> = [];
      page.on('response', (response) => {
        if (!response.ok() && response.status() !== 304) {
          failedRequests.push({ url: response.url(), status: response.status() });
        }
      });

      await page.goto('http://localhost:8011/', {
        waitUntil: 'networkidle',
        timeout: 10000,
      });

      await page.waitForTimeout(3000);

      const svgFailures = failedRequests.filter((req) =>
        req.url.includes('dexie-duck.svg') || req.url.includes('.svg')
      );

      assert(
        svgFailures.length === 0,
        `SVG assets should load correctly with BASE_PATH=/. Found ${svgFailures.length} failures`,
      );

      console.log('✅ All SVG assets loaded correctly with root path');
    } finally {
      if (page) await page.close();
      if (browser) await browser.close();
      serverProcess.kill('SIGTERM');
      await serverProcess.status;
    }
  },
  sanitizeOps: false,
  sanitizeResources: false,
});
