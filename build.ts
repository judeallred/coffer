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
    // Image imports are handled by esbuild's file loader - don't mark as external
    // This prevents the "module script with MIME type image/svg+xml" error on GitHub Pages
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
    // Use 'file' loader for images - copies to output and returns path as string
    // This prevents "module script with MIME type image/svg+xml" error on GitHub Pages
    '.png': 'file',
    '.jpg': 'file',
    '.jpeg': 'file',
    '.gif': 'file',
    '.svg': 'file',
    '.webp': 'file',
    '.ico': 'file',
  },
  // Use relative paths for assets
  assetNames: 'assets/[name]-[hash]',
});

if (result.errors.length > 0) {
  console.error('❌ Build failed:', result.errors);
  Deno.exit(1);
}

// Copy and modify HTML file to use built JS instead of source TS
console.log('📋 Copying and modifying HTML...');
let html = await Deno.readTextFile('./src/index.html');

// Get BASE_PATH from environment variable, default to '/' for local development
const basePath = Deno.env.get('BASE_PATH') || '/';
const normalizedBasePath = basePath.endsWith('/') ? basePath : `${basePath}/`;

console.log(`  ℹ️ Using BASE_PATH: ${normalizedBasePath}`);

// Replace the BASE_PATH_PLACEHOLDER with actual base tag if not root
let baseTag = '';
if (normalizedBasePath !== '/') {
  baseTag = `<base href="${normalizedBasePath}">`;
}
html = html.replace('<!-- BASE_PATH_PLACEHOLDER -->', baseTag);

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

// Copy assets folder
try {
  await Deno.mkdir('./dist/assets', { recursive: true });
  // Copy all files from src/assets to dist/assets
  for await (const entry of Deno.readDir('./src/assets')) {
    if (entry.isFile) {
      await Deno.copyFile(`./src/assets/${entry.name}`, `./dist/assets/${entry.name}`);
    }
  }
  console.log('  ✓ Copied assets folder');
} catch (error) {
  console.warn('  ⚠ Failed to copy assets:', error);
}

// Copy PWA files
try {
  await Deno.copyFile('./src/manifest.json', './dist/manifest.json');
  console.log('  ✓ Copied manifest.json');
} catch (error) {
  console.warn('  ⚠ Failed to copy manifest.json:', error);
}

// Copy and modify service worker with version injection
try {
  // Generate a version stamp using current timestamp
  const buildVersion = new Date().getTime().toString();
  console.log(`  ℹ️ Build version: ${buildVersion}`);

  // Read the service worker source
  let swContent = await Deno.readTextFile('./src/sw.js');

  // Replace the version placeholder with the actual build version
  swContent = swContent.replace('/* BUILD_VERSION_PLACEHOLDER */', buildVersion);

  // Write the modified service worker to dist
  await Deno.writeTextFile('./dist/sw.js', swContent);
  console.log('  ✓ Copied service worker with version injection');
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

// Create .nojekyll file to disable Jekyll processing on GitHub Pages
// This ensures all files are served correctly without Jekyll's file filtering
try {
  await Deno.writeTextFile('./dist/.nojekyll', '');
  console.log('  ✓ Created .nojekyll for GitHub Pages');
} catch (error) {
  console.warn('  ⚠ Failed to create .nojekyll:', error);
}

console.log('✅ Build completed successfully!');
console.log('📁 Output files in ./dist/');

// Stop esbuild
result.stop?.();
