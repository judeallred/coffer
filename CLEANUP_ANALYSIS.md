# Cleanup Analysis - Identifying Necessary vs Workaround Code

## Root Cause

The WASM binary file (`chia_wallet_sdk_wasm_bg.wasm`) wasn't committed to git because `*.wasm` was in `.gitignore`.

## Changes Made - Which to Keep?

### 1. Removed `*.wasm` from `.gitignore` ✅ KEEP

- **Purpose**: Allow WASM binary to be committed
- **Status**: ROOT CAUSE FIX - absolutely necessary

### 2. `.nojekyll` file creation 🔍 TEST

- **Purpose**: Disable Jekyll processing on GitHub Pages
- **Comments**: "to disable Jekyll processing", "ensures all files are served correctly"
- **Analysis**:
  - GitHub Pages uses Jekyll by default for all repos
  - Modern `upload-pages-artifact` action might not need this
  - Standard practice, but worth testing if actually needed
- **Test**: Try deploying without it

### 3. BASE_PATH environment variable ✅ KEEP

- **Purpose**: Support deploying to subdirectories (e.g., `/coffer/`)
- **Status**: ABSOLUTELY NECESSARY for GitHub Pages subdirectory deployment
- **Not a workaround**: Required feature for correct path resolution

### 4. Custom WASM loader (`src/wasm/chia_wallet_sdk_wasm.js`) ✅ KEEP

- **Purpose**: Load WASM using `fetch()` + `WebAssembly.instantiate()`
- **Comments**: "avoid MIME type issues", "bypasses MIME type checking"
- **Analysis**:
  - Original npm package uses: `import * as wasm from "./chia_wallet_sdk_wasm_bg.wasm"`
  - ES module import of .wasm files doesn't work reliably in browsers
  - Using `fetch()` + `WebAssembly.instantiate()` is the STANDARD approach
- **Status**: NOT a workaround - it's best practice for browser WASM loading

### 5. Special WASM handling in `dev.ts` ✅ KEEP

- **Purpose**: Serve WASM files from `src/wasm/` when requested at root path
- **Analysis**:
  - Production: WASM files copied to `dist/` root
  - Dev needs to match this structure
  - Requests come to `/chia_wallet_sdk_wasm.js`, served from `src/wasm/`
- **Status**: Necessary for dev/prod consistency

### 6. External WASM imports in `build.ts` ✅ KEEP

- **Purpose**: Mark WASM files as external (don't bundle)
- **Analysis**:
  - Prevents esbuild from inlining WASM module imports
  - Bundling WASM as ES modules doesn't work
- **Status**: Correct build configuration

### 7. Debug logging in GitHub Actions 🧹 REMOVE

- **Purpose**: Added to debug deployment issues
- **File**: `.github/workflows/deploy.yml` - "List dist contents" step
- **Status**: No longer needed, can be removed

## Conclusion

Almost everything we added is STANDARD PRACTICE, not workarounds:

- `.nojekyll` - Standard for non-Jekyll GitHub Pages (test if needed with modern actions)
- BASE_PATH - Required feature
- Custom WASM loader - Standard browser WASM loading pattern
- Dev server WASM handling - Necessary for consistency
- External build config - Correct bundler configuration

Only the debug logging is truly unnecessary.
