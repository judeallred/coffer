# Coffer Deployment Guide

## Development vs Production Environments

Coffer has two environments that are now **unified and consistent**:

### 🔧 Development Environment

**Start the dev server:**

```bash
deno task dev
```

**Access at:** http://localhost:8000

**How it works:**

- Custom dev server in `dev.ts`
- On-the-fly TypeScript/JSX transpilation with esbuild
- Hot reloading on file changes
- Serves WASM files from `src/wasm/` directory
- Import map resolves `chia-wallet-sdk-wasm` to `./chia_wallet_sdk_wasm.js`

### 🚀 Production Environment

**Build for production:**

```bash
deno task build
```

**Test the built version locally:**

```bash
deno task serve:dist
```

**Access at:** http://localhost:8001

**How it works:**

- Builds optimized static files to `dist/` directory
- Bundles and minifies JavaScript with esbuild
- Copies WASM files to dist root
- Same import map as dev: `chia-wallet-sdk-wasm` → `./chia_wallet_sdk_wasm.js`
- Can be deployed to any static hosting (GitHub Pages, Netlify, Vercel, etc.)

## Key Files Unified

Both environments now use **identical import paths**:

### Import Map (in `src/index.html`)

```json
{
  "imports": {
    "preact": "https://esm.sh/preact@10.19.2",
    "preact/": "https://esm.sh/preact@10.19.2/",
    "chia-wallet-sdk-wasm": "./chia_wallet_sdk_wasm.js"
  }
}
```

### WASM File Structure

**Development (`src/wasm/`):**

- `chia_wallet_sdk_wasm.js` - WASM loader
- `chia_wallet_sdk_wasm_bg.js` - Generated bindings
- `chia_wallet_sdk_wasm_bg.wasm` - Binary WASM module

**Production (`dist/`):**

- Same files copied to root during build

### File Serving

**Development:**

- Dev server intercepts requests for `chia_wallet_sdk_wasm*` files
- Serves them from `src/wasm/` directory
- Handles both `.js` and `.wasm` files

**Production:**

- Static file server serves files from `dist/` root
- No special handling needed

## Important Notes

⚠️ **Cannot open as `file://` URL**

- The built `dist/index.html` **must be served via HTTP**
- Opening as `file:///...` will fail due to:
  - Import map restrictions
  - WASM fetch restrictions
  - CORS policies

✅ **Use `deno task serve:dist` to test builds locally**

## Deployment Checklist

1. ✅ Run tests: `deno task test:integration`
2. ✅ Check linting: `deno task lint`
3. ✅ Format code: `deno fmt`
4. ✅ Build: `deno task build`
5. ✅ Test locally: `deno task serve:dist`
6. ✅ Deploy `dist/` folder to your hosting provider

## Hosting Recommendations

### GitHub Pages

- Deploy `dist/` folder
- Already configured in `.github/workflows/deploy.yml`

### Netlify

- Build command: `deno task build`
- Publish directory: `dist`

### Vercel

- Build command: `deno task build`
- Output directory: `dist`

### Cloudflare Pages

- Build command: `deno task build`
- Build output directory: `dist`

## Troubleshooting

### "Failed to fetch WASM file: 404"

- **Dev**: Make sure `deno task dev` is running
- **Prod**: Make sure files are served via HTTP, not file://

### "WASM module not initialized"

- Wait for initialization (usually <100ms)
- Check browser console for errors
- Verify WASM files are accessible

### Import errors

- Check that import map is in the HTML
- Verify WASM files are in the correct location
- Ensure you're using HTTP, not file://

### "Expected a JavaScript module but server responded with MIME type application/wasm"

This error has been **fixed** in the current implementation:

- The project uses `fetch()` + `WebAssembly.instantiate()` with ArrayBuffer
- This bypasses strict MIME type checking for ES module imports
- Works on all hosting platforms including GitHub Pages
- No server configuration needed

## Architecture

```
User Request → HTTP Server → index.html (with import map)
                                ↓
                         main.js (loads App)
                                ↓
                    walletSDK.ts imports 'chia-wallet-sdk-wasm'
                                ↓
                    Import map resolves to ./chia_wallet_sdk_wasm.js
                                ↓
                    WASM loader fetches ./chia_wallet_sdk_wasm_bg.wasm
                                ↓
                         WASM module initialized
                                ↓
                         App ready to use
```

Both dev and production follow this exact same flow!
