/// <reference lib="deno.ns" />
import { assert } from 'https://deno.land/std@0.208.0/testing/asserts.ts';

/**
 * Test BASE_PATH configuration by verifying build outputs
 * This is a faster alternative to full browser e2e tests
 */

async function buildWithBasePath(basePath: string): Promise<void> {
  console.log(`🏗️  Building with BASE_PATH=${basePath}...`);

  const buildCommand = new Deno.Command('deno', {
    args: ['task', 'build'],
    env: {
      ...Deno.env.toObject(),
      BASE_PATH: basePath,
    },
    cwd: Deno.cwd(),
    stdout: 'inherit',
    stderr: 'inherit',
  });

  const { code } = await buildCommand.output();

  if (code !== 0) {
    throw new Error(`Build failed with code ${code}`);
  }

  console.log(`✅ Build completed with BASE_PATH=${basePath}`);
}

async function verifyBuildArtifacts(basePath: string): Promise<void> {
  console.log(`🔍 Verifying build artifacts for BASE_PATH=${basePath}...`);

  // Read the generated HTML
  const html = await Deno.readTextFile('./dist/index.html');

  // Verify base tag is present when not root path
  if (basePath !== '/') {
    const normalizedPath = basePath.endsWith('/') ? basePath : `${basePath}/`;
    assert(
      html.includes(`<base href="${normalizedPath}">`),
      `HTML should contain <base href="${normalizedPath}"> tag`,
    );
    console.log(`   ✅ Base tag found: <base href="${normalizedPath}">`);
  } else {
    // For root path, there should be no base tag
    assert(!html.includes('<base href='), 'HTML should not contain base tag for root path');
    console.log('   ✅ No base tag for root path (correct)');
  }

  // Verify essential files exist
  const essentialFiles = [
    './dist/index.html',
    './dist/main.js',
    './dist/chia_wallet_sdk_wasm.js',
    './dist/chia_wallet_sdk_wasm_bg.js',
    './dist/chia_wallet_sdk_wasm_bg.wasm',
    './dist/styles/global.css',
  ];

  for (const file of essentialFiles) {
    try {
      const stat = await Deno.stat(file);
      assert(stat.isFile, `${file} should be a file`);
      assert(stat.size > 0, `${file} should not be empty`);
    } catch (error) {
      throw new Error(`Essential file missing or invalid: ${file} - ${error}`);
    }
  }
  console.log('   ✅ All essential files present');

  // Verify HTML contains import map
  assert(html.includes('type="importmap"'), 'HTML should contain import map');
  assert(
    html.includes('"chia-wallet-sdk-wasm": "./chia_wallet_sdk_wasm.js"'),
    'Import map should map chia-wallet-sdk-wasm correctly',
  );
  console.log('   ✅ Import map present and correct');

  // Verify HTML references main.js
  assert(html.includes('src="./main.js"'), 'HTML should reference main.js');
  console.log('   ✅ main.js reference found');

  // Verify WASM files are not bundled in main.js
  const mainJs = await Deno.readTextFile('./dist/main.js');
  assert(
    !mainJs.includes('.wasm"'),
    'main.js should not contain .wasm imports (should use fetch instead)',
  );
  console.log('   ✅ main.js does not import .wasm as ES module');

  // Verify main.js uses dynamic import for chia-wallet-sdk-wasm
  assert(
    mainJs.includes('import("chia-wallet-sdk-wasm")') ||
      mainJs.includes("import('chia-wallet-sdk-wasm')"),
    'main.js should dynamically import chia-wallet-sdk-wasm',
  );
  console.log('   ✅ main.js dynamically imports chia-wallet-sdk-wasm');

  // Verify WASM loader uses fetch + ArrayBuffer
  const wasmLoader = await Deno.readTextFile('./dist/chia_wallet_sdk_wasm.js');
  assert(
    wasmLoader.includes('fetch(') && wasmLoader.includes('arrayBuffer()'),
    'WASM loader should use fetch() + arrayBuffer() method',
  );
  assert(
    wasmLoader.includes('WebAssembly.instantiate'),
    'WASM loader should use WebAssembly.instantiate()',
  );
  console.log('   ✅ WASM loader uses fetch() + ArrayBuffer method');

  console.log(`✅ All build artifact checks passed for BASE_PATH=${basePath}`);
}

Deno.test({
  name: 'BASE_PATH Build: Root path (/) - localhost scenario',
  fn: async () => {
    console.log('\n' + '='.repeat(60));
    console.log('TEST: Root path (/) - simulating localhost development');
    console.log('='.repeat(60));

    await buildWithBasePath('/');
    await verifyBuildArtifacts('/');
  },
});

Deno.test({
  name: 'BASE_PATH Build: Custom path (/testpath/) - custom deployment',
  fn: async () => {
    console.log('\n' + '='.repeat(60));
    console.log('TEST: Custom path (/testpath/) - simulating custom deployment');
    console.log('='.repeat(60));

    await buildWithBasePath('/testpath');
    await verifyBuildArtifacts('/testpath');
  },
});

Deno.test({
  name: 'BASE_PATH Build: Custom path (/coffer/) - GitHub Pages path',
  fn: async () => {
    console.log('\n' + '='.repeat(60));
    console.log('TEST: Custom path (/coffer/) - simulating GitHub Pages');
    console.log('='.repeat(60));

    await buildWithBasePath('/coffer');
    await verifyBuildArtifacts('/coffer');
  },
});

Deno.test({
  name: 'BASE_PATH Build: Custom path without trailing slash (/myapp) - edge case',
  fn: async () => {
    console.log('\n' + '='.repeat(60));
    console.log('TEST: Custom path (/myapp) - testing normalization');
    console.log('='.repeat(60));

    await buildWithBasePath('/myapp'); // No trailing slash
    await verifyBuildArtifacts('/myapp'); // Should normalize to /myapp/
  },
});
