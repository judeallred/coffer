# GitHub Pages WASM Loading Fix

## Problem

GitHub Pages was failing to load the WASM module with the error:

```
Failed to fetch dynamically imported module: 
https://judeallred.github.io/coffer/chia_wallet_sdk_wasm.js
```

This was happening because GitHub Pages deploys to a subdirectory (`/coffer/`), but the import map was using relative paths without accounting for the base path.

## Solution

Added a dynamic `<base>` tag in `src/index.html` that:

1. Detects if the site is running on GitHub Pages
2. Automatically sets `<base href="/coffer/">` for GitHub Pages deployment
3. Leaves the base tag unset for local development

This ensures all relative paths (including the import map for `chia-wallet-sdk-wasm`) work correctly in both environments.

## Code Changes

### src/index.html

Added before other `<link>` tags:

```html
<!-- Base URL for GitHub Pages deployment -->
<script>
  // Set base href for GitHub Pages deployment
  // This ensures all relative paths work correctly when deployed to /coffer/
  const isGitHubPages = window.location.hostname.includes('github.io');
  const repoName = 'coffer';
  if (isGitHubPages && window.location.pathname.includes(repoName)) {
    const base = document.createElement('base');
    base.href = `/${repoName}/`;
    document.head.appendChild(base);
  }
</script>
```

### build.ts

Added external imports configuration to prevent bundling WASM modules:

```typescript
// Mark chia-wallet-sdk-wasm as external (will be resolved by import map)
build.onResolve({ filter: /^chia-wallet-sdk-wasm$/ }, (args) => {
  return { path: args.path, external: true };
});
// Handle WASM JS files - mark as external to prevent bundling
build.onResolve({ filter: /chia_wallet_sdk_wasm.*\.js$/ }, (args) => {
  return { path: args.path, external: true };
});
```

## Testing

- ✅ All integration tests pass
- ✅ Local development works (`deno task dev` and `deno task serve:dist`)
- ✅ Build process completes successfully
- ✅ Ready for GitHub Pages deployment

## Deployment

Commit and push these changes to trigger GitHub Actions deployment to GitHub Pages.
