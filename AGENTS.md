# Coffer

A browser app for combining Chia offers. Deno, Preact and TypeScript, with offer parsing and
combining done by the Chia Wallet SDK compiled to WASM. Deployed to Cloudflare at
https://xch.nyc/coffer/.

## Checks

Before calling a change done, run all three and make sure they pass:

```bash
deno task format   # check only; fix with `deno task format:fix`
deno task lint
deno task test     # smoke, integration, and performance tests
```

The smoke and performance tests drive a headless Chromium through Playwright. If the browser is
missing, install it with `deno run -A npm:playwright@1.59.1 install chromium-headless-shell`.

The pre-commit hook runs the formatter, lint, and build. Don't bypass it with `--no-verify`.

## Layout

- `src/components/`: Preact function components. Styles live in `src/styles/global.css`.
- `src/services/walletSDK.ts`: the only module that talks to the SDK.
- `src/utils/`: pure offer logic (contents, royalties, previews). Unit-test it directly.
- `tests/integration/`: tests against the real SDK. `nft_royalty_combining_test.ts` builds offers
  on the SDK simulator and takes the combined offer on chain.
- `dist/` and `deploy/` are build output. Don't edit them by hand.

## The vendored SDK (`src/wasm/`)

`chia_wallet_sdk_wasm_bg.js`, `_bg.wasm` and `.d.ts` are copied unmodified from the
`chia-wallet-sdk-wasm` npm package. `chia_wallet_sdk_wasm.js` is Coffer's own loader, which
fetches the `.wasm` so it works in browsers. Never hand-edit the copied files.

To upgrade the SDK, copy the three files from the new package version, bump the version in
`deno.json` (the import map is used for types and tests), run `deno install`, and fix any API
changes in `walletSDK.ts`. The release notes at
https://github.com/xch-dev/chia-wallet-sdk/releases list breaking changes under "Upgrading".

## Conventions

- Strict TypeScript: explicit return types, no `any`, prefer `const`.
- Use `globalThis`, not `window`.
- Import through the `deno.json` import map.
- Add tests for new behaviour, especially anything that touches royalties or fees.

## Deployment

A push to `main` deploys via `.github/workflows/deploy-cloudflare.yml`, then runs e2e checks
against the live site.
