#!/usr/bin/env -S deno run --allow-all

import * as esbuild from 'npm:esbuild@0.19.12';
import { denoPlugins } from 'jsr:@luca/esbuild-deno-loader@^0.10.3';

console.log('🏗️  Building Coffer...');

// Ensure dist directory exists
try {
  await Deno.mkdir('./dist', { recursive: true });
} catch {
  // Directory already exists
}

// Build TypeScript/JSX bundle
console.log('⚡ Building JavaScript bundle with npm packages...');
const result = await esbuild.build({
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
  loader: {
    '.css': 'text',
  },
});

if (result.errors.length > 0) {
  console.error('❌ Build failed:', result.errors);
  Deno.exit(1);
}

// Copy HTML file
await Deno.copyFile('./src/index.html', './dist/index.html');

console.log('✅ Build completed successfully!');
console.log('📁 Output files in ./dist/');
console.log('📦 Chia Wallet SDK WASM will be loaded from npm package at runtime');

// Stop esbuild
result.stop?.();