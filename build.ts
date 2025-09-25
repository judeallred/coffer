#!/usr/bin/env -S deno run --allow-all

import { build } from 'https://deno.land/x/esbuild@v0.19.8/mod.ts';
import { denoPlugins } from 'https://deno.land/x/esbuild_deno_loader@0.8.2/mod.ts';

console.log('🏗️  Building Coffer...');

// Ensure dist directory exists
try {
  await Deno.mkdir('./dist', { recursive: true });
} catch {
  // Directory already exists
}

// Build WASM from submodule first
console.log('🦀 Building Chia Wallet SDK WASM...');
const wasmBuild = new Deno.Command('cargo', {
  args: ['build', '--release', '--target', 'wasm32-unknown-unknown'],
  cwd: './chia-wallet-sdk',
});
const wasmResult = await wasmBuild.output();
if (!wasmResult.success) {
  console.error('❌ WASM build failed');
  Deno.exit(1);
}

// Copy WASM files to dist
try {
  await Deno.copyFile(
    './chia-wallet-sdk/target/wasm32-unknown-unknown/release/chia_wallet_sdk.wasm',
    './dist/chia_wallet_sdk.wasm'
  );
  console.log('✅ WASM files copied to dist');
} catch (error) {
  console.error('❌ Failed to copy WASM files:', error);
}

// Build TypeScript/JSX
console.log('⚡ Building JavaScript bundle...');
const result = await build({
  plugins: [...denoPlugins()],
  entryPoints: ['./src/main.tsx'],
  outdir: './dist',
  bundle: true,
  format: 'esm',
  minify: true,
  sourcemap: true,
  target: ['chrome90', 'firefox88', 'safari14'],
  jsxFactory: 'h',
  jsxFragment: 'Fragment',
});

if (result.errors.length > 0) {
  console.error('❌ Build failed:', result.errors);
  Deno.exit(1);
}

// Copy HTML file
await Deno.copyFile('./src/index.html', './dist/index.html');

console.log('✅ Build completed successfully!');
console.log('📁 Output files in ./dist/');

// Stop esbuild
result.stop?.();
