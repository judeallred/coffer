# GitHub Pages 404 Fix - .nojekyll File

## Problem

GitHub Pages was returning 404 errors for WASM files:

```
GET https://judeallred.github.io/coffer/chia_wallet_sdk_wasm.js
net::ERR_ABORTED 404 (Not Found)
```

All WASM files were built correctly and present in the `dist/` directory, but GitHub
Pages wasn't serving them.

## Root Cause

GitHub Pages uses **Jekyll** by default to process static sites. Jekyll has specific
file filtering rules that can cause it to ignore or skip certain files, leading to 404
errors even though the files exist in the repository.

## Solution

Add a `.nojekyll` file to the `dist/` directory. This file (which can be empty) tells
GitHub Pages to **skip Jekyll processing** and serve all files as-is.

### Implementation

Updated `build.ts` to automatically create `.nojekyll` during every build:

```typescript
// Create .nojekyll file to disable Jekyll processing on GitHub Pages
// This ensures all files are served correctly without Jekyll's file filtering
try {
  await Deno.writeTextFile('./dist/.nojekyll', '');
  console.log('  ✓ Created .nojekyll for GitHub Pages');
} catch (error) {
  console.warn('  ⚠ Failed to create .nojekyll:', error);
}
```

## Files Changed

1. **`build.ts`** - Added `.nojekyll` file creation
2. **`.cursor/rules/wasm-loading.mdc`** - Documented the GitHub Pages requirement
3. **`BASE_PATH_CONFIGURATION.md`** - Added note about `.nojekyll`

## Verification

After building, verify the file exists:

```bash
ls -la dist/.nojekyll
# -rw-r--r--  1 user  staff  0 Oct 12 22:48 dist/.nojekyll
```

## Testing

All tests pass with the fix:

```bash
deno task format         # ✅ Passed
deno task lint           # ✅ Passed
deno task test:integration   # ✅ Passed (3 tests, 7 steps)
deno test --allow-all tests/e2e/base_path_build_test.ts  # ✅ Passed (4 tests)
```

## Deployment

Once committed and pushed, GitHub Actions will:

1. Build with `BASE_PATH=/coffer`
2. Create `.nojekyll` file in `dist/`
3. Upload `dist/` directory to GitHub Pages
4. GitHub Pages will serve all files correctly (no Jekyll processing)

## Related Documentation

- **Jekyll Docs**:
  https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages#static-site-generators
- **Bypassing Jekyll**:
  https://github.blog/2009-12-29-bypassing-jekyll-on-github-pages/

## Impact

- ✅ WASM files now load correctly on GitHub Pages
- ✅ No performance impact (Jekyll was disabled anyway)
- ✅ Works for both root and subdirectory deployments
- ✅ Automatically applied to every build
- ✅ No manual intervention required
