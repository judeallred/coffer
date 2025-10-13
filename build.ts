#!/usr/bin/env -S deno run --allow-all

import * as esbuild from 'npm:esbuild@0.19.12';

console.log('🏗️  Building Coffer...');

// Ensure dist directory exists
try {
  await Deno.mkdir('./dist', { recursive: true });
} catch {
  // Directory already exists
}

// Create a simple plugin to handle external imports
const externalImportPlugin: esbuild.Plugin = {
  name: 'external-imports',
  setup(build): void {
    // Mark preact as external
    build.onResolve({ filter: /^preact/ }, (args) => {
      return { path: args.path, external: true };
    });
    // Mark chia-wallet-sdk-wasm as external (will be resolved by import map)
    build.onResolve({ filter: /^chia-wallet-sdk-wasm$/ }, (args) => {
      return { path: args.path, external: true };
    });
    // Handle CSS imports - just skip them
    build.onResolve({ filter: /\.css$/ }, (args) => {
      return { path: args.path, external: true };
    });
    // Handle WASM files - mark as external
    build.onResolve({ filter: /\.wasm$/ }, (args) => {
      return { path: args.path, external: true };
    });
    // Handle WASM JS files - mark as external to prevent bundling
    build.onResolve({ filter: /chia_wallet_sdk_wasm.*\.js$/ }, (args) => {
      return { path: args.path, external: true };
    });
    // Handle image imports - transform to file paths
    build.onResolve({ filter: /\.(png|jpg|jpeg|gif|svg|webp|ico)$/ }, (args) => {
      // Convert relative import path to just the filename
      const filename = args.path.split('/').pop() || args.path;
      return { path: `./${filename}`, external: true };
    });
  },
};

// Build TypeScript/JSX bundle
console.log('⚡ Building JavaScript bundle with npm packages...');
const result = await esbuild.build({
  plugins: [externalImportPlugin],
  entryPoints: ['./src/main.tsx'],
  outdir: './dist',
  bundle: true,
  format: 'esm',
  minify: true,
  sourcemap: true,
  target: ['chrome90', 'firefox88', 'safari14'],
  jsx: 'automatic',
  jsxImportSource: 'preact',
  loader: {
    '.ts': 'ts',
    '.tsx': 'tsx',
  },
});

if (result.errors.length > 0) {
  console.error('❌ Build failed:', result.errors);
  Deno.exit(1);
}

// Copy and modify HTML file to use built JS instead of source TS
console.log('📋 Copying and modifying HTML...');
let html = await Deno.readTextFile('./src/index.html');
// Replace the source script reference with the built file
html = html.replace('./main.tsx', './main.js');
await Deno.writeTextFile('./dist/index.html', html);

// Copy static assets
console.log('📋 Copying static assets...');

// Copy CSS
try {
  await Deno.mkdir('./dist/styles', { recursive: true });
  await Deno.copyFile('./src/styles/global.css', './dist/styles/global.css');
  console.log('  ✓ Copied CSS');
} catch (error) {
  console.warn('  ⚠ Failed to copy CSS:', error);
}

// Copy favicons and images
const imageFiles = ['favicon.ico', 'favicon.svg', 'favicon-32x32.png', 'tip-qr-code.png'];
for (const imageFile of imageFiles) {
  try {
    await Deno.copyFile(`./src/${imageFile}`, `./dist/${imageFile}`);
  } catch {
    console.warn(`  ⚠ Failed to copy ${imageFile}`);
  }
}
console.log('  ✓ Copied favicons and images');

// Copy PWA files
try {
  await Deno.copyFile('./src/manifest.json', './dist/manifest.json');
  console.log('  ✓ Copied manifest.json');
} catch (error) {
  console.warn('  ⚠ Failed to copy manifest.json:', error);
}

try {
  await Deno.copyFile('./src/sw.js', './dist/sw.js');
  console.log('  ✓ Copied service worker');
} catch (error) {
  console.warn('  ⚠ Failed to copy service worker:', error);
}

// Copy WASM files
try {
  const wasmFiles = [
    'chia_wallet_sdk_wasm_bg.wasm',
    'chia_wallet_sdk_wasm_bg.js',
    'chia_wallet_sdk_wasm.js',
  ];
  for (const wasmFile of wasmFiles) {
    await Deno.copyFile(`./src/wasm/${wasmFile}`, `./dist/${wasmFile}`);
  }
  console.log('  ✓ Copied WASM files');
} catch (error) {
  console.warn('  ⚠ Failed to copy WASM files:', error);
}

console.log('✅ Build completed successfully!');
console.log('📁 Output files in ./dist/');

// Stop esbuild
result.stop?.();
