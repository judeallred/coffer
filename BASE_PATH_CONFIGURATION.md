# BASE_PATH Configuration Guide

## Overview

Coffer supports deploying to different base paths using the `BASE_PATH` environment variable. This allows the application to work correctly whether deployed to the root (`/`) or a subdirectory (`/coffer/`, `/myapp/`, etc.).

## How It Works

### Build Time Configuration

The `BASE_PATH` environment variable is used during the build process to inject the correct base path into the HTML:

```bash
# Build for root path (localhost)
deno task build
# or explicitly:
BASE_PATH=/ deno task build

# Build for GitHub Pages at /coffer/
BASE_PATH=/coffer deno task build

# Build for custom subdirectory
BASE_PATH=/myapp deno task build
```

### What Gets Configured

When you set `BASE_PATH`, the build process:

1. **Adds a `<base>` tag** to `index.html` (only for non-root paths)
   - For `/coffer`: `<base href="/coffer/">`
   - For `/`: No base tag (default browser behavior)

2. **All relative paths resolve correctly**:
   - `./main.js` → `/coffer/main.js`
   - `./chia_wallet_sdk_wasm.js` → `/coffer/chia_wallet_sdk_wasm.js`
   - `./styles/global.css` → `/coffer/styles/global.css`

## Usage Examples

### Local Development

For local development, use the dev server (always runs at root):

```bash
deno task dev
# Server runs at http://localhost:8000/
```

### Building for GitHub Pages

```bash
BASE_PATH=/coffer deno task build
deno task serve:dist
# Test at http://localhost:8001/ (note: base tag handles the /coffer/ path)
```

### GitHub Actions Deployment

The deploy workflow automatically sets `BASE_PATH`:

```yaml
- name: Build project
  run: deno task build
  env:
    BASE_PATH: /coffer
```

### Building for Custom Deployment

```bash
# For deployment to https://example.com/apps/myapp/
BASE_PATH=/apps/myapp deno task build

# For deployment to root domain https://example.com/
BASE_PATH=/ deno task build
```

## Technical Details

### Path Normalization

The build system automatically normalizes paths:

- `/coffer` → `/coffer/` (adds trailing slash)
- `/coffer/` → `/coffer/` (no change)
- `/` → `/` (root path, no base tag)

### WASM Module Loading

The WASM module loading is fully compatible with base paths:

1. **Import map** in HTML resolves `chia-wallet-sdk-wasm` to `./chia_wallet_sdk_wasm.js`
2. **Base tag** makes relative paths absolute: `./` → `/coffer/`
3. **WASM loader** uses `fetch()` + `ArrayBuffer` to load the `.wasm` file
4. **No MIME type issues** because we use `WebAssembly.instantiate()` with ArrayBuffer

### Testing

The project includes automated tests for BASE_PATH configuration:

```bash
# Test all BASE_PATH scenarios
deno test --allow-all tests/e2e/base_path_build_test.ts
```

Tests verify:

- ✅ Root path (`/`) builds correctly without base tag
- ✅ Custom paths (`/testpath/`, `/coffer/`, `/myapp`) build with correct base tag
- ✅ Path normalization works (trailing slash handling)
- ✅ WASM files are not bundled (use fetch + ArrayBuffer)
- ✅ Import map is correct
- ✅ All assets are copied correctly

## Deployment Checklist

When deploying to a new environment:

1. **Determine your base path**
   - Root domain: `BASE_PATH=/`
   - Subdirectory: `BASE_PATH=/your-path`

2. **Build with correct BASE_PATH**
   ```bash
   BASE_PATH=/your-path deno task build
   ```

3. **Verify the build**
   ```bash
   # Check that dist/index.html has the correct base tag
   grep -A 1 "BASE_PATH" dist/index.html
   ```

4. **Test locally**
   ```bash
   deno task serve:dist
   # Open http://localhost:8001 and verify the app loads
   ```

5. **Deploy the `dist/` folder**
   - All files in `dist/` should be deployed to your hosting provider
   - The server should serve `index.html` for the base path

## Troubleshooting

### Issue: Assets not loading (404 errors)

**Solution**: Verify the BASE_PATH matches your deployment URL

```bash
# If deployed to https://example.com/myapp/
# Then BASE_PATH should be /myapp (not /myapp/ or /app)
BASE_PATH=/myapp deno task build
```

### Issue: WASM fails to load

**Solution**: Check browser console for errors. Our WASM loader uses fetch + ArrayBuffer which works on all hosting platforms including GitHub Pages.

### Issue: Page loads but is blank

**Solution**: Check if the base tag is correct:

```bash
# View the base tag in dist/index.html
head -20 dist/index.html | grep base
```

### Issue: Works locally but not in production

**Solution**: Make sure you built with the correct BASE_PATH:

```bash
# Rebuild with production BASE_PATH
BASE_PATH=/your-production-path deno task build
```

## Environment Variables Reference

| Variable    | Required | Default | Description                                        |
| ----------- | -------- | ------- | -------------------------------------------------- |
| `BASE_PATH` | No       | `/`     | The base path for deployment. Must start with `/`. |

## Examples

### Netlify

```toml
# netlify.toml
[build]
  command = "deno task build"
  publish = "dist"

[build.environment]
  BASE_PATH = "/"
```

### Vercel

```json
// vercel.json
{
  "buildCommand": "deno task build",
  "outputDirectory": "dist",
  "build": {
    "env": {
      "BASE_PATH": "/"
    }
  }
}
```

### GitHub Pages (with custom repo name)

```.github/workflows/deploy.yml
- name: Build project
  run: deno task build
  env:
    BASE_PATH: /your-repo-name
```

## Summary

- ✅ Use `BASE_PATH` environment variable to configure deployment path
- ✅ Default is `/` (root) for local development
- ✅ Set to `/subdirectory` for subdirectory deployments
- ✅ Build system handles all path resolution automatically
- ✅ WASM loading works correctly with any base path
- ✅ Automated tests verify all configurations
