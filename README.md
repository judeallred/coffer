# Coffer

A professional web application for combining Chia offers with WASM-powered validation

## ✅ Status: Production Ready

**Simple Offer Combining**: Coffer provides a clean, minimal interface for combining multiple Chia offers using WASM-powered validation and global clipboard integration.

## About

Coffer is a modern single-page web application that leverages the Chia Wallet SDK's WASM bindings to provide offer combination directly in your browser.

**Key Features:**

- **Professional WASM Validation**: Uses Chia Wallet SDK for accurate offer validation
- **Flexible Input Options**: Paste `offer1...` strings, 44-character offer IDs, or Dexie/MintGarden offer URLs
- **API Integration**: Automatically fetches full offers from Dexie and MintGarden APIs when given offer IDs or URLs
- **Global Clipboard Integration**: Paste offers anywhere on the page, copy combined offers with Ctrl+C
- **Real-time Validation**: Instant feedback with validation status indicators (✅/❌)
- **Duplicate Detection**: Automatically prevents adding the same offer multiple times
- **Toast Notifications**: Clear visual feedback for all operations
- **Clean, Minimal UI**: Simple input fields with clear validation states

The application uses the `chia-wallet-sdk-wasm` package for offer validation and combination.

# Tech Stack

This project is implemented as a single-page static client side website. It uses Deno, pnpm, and Preact.

## Build Process

- Uses standard Deno + Preact project structure
- **Development Server**: Custom TypeScript transpilation with esbuild for browser compatibility
- **Import Resolution**: Custom import mapping system for npm package resolution in browser
- **Hot reloading for development**
- **WASM Integration**: Full integration with `chia-wallet-sdk-wasm` package for browser use
- **Production builds**: Optimized static builds with esbuild and Deno plugins

## Styling

- **CSS Classes**: Migrated from styled-components to standard CSS classes due to browser compatibility issues
- **Global CSS**: Uses CSS custom properties (variables) for consistent theming
- **Minimalist design aesthetic** with simple, effective styles
- **Responsive design** for desktop and mobile

## Interface Design

- **Global Paste Detection**: Simply paste any Chia offer string anywhere on the page - it's automatically detected and added
- **Flexible Input Fields**:
  - Paste `offer1...` strings directly
  - Paste 44-character offer IDs (automatically fetched from APIs)
  - Paste Dexie or MintGarden offer URLs (ID extracted and fetched)
  - Real-time validation status (✅/❌)
  - Individual remove buttons (🗑️) for each offer
  - Clear error messages for invalid or duplicate offers
- **Instant Validation**: Each offer is validated immediately using WASM SDK
- **Duplicate Prevention**: Duplicate offers show validation errors instead of being added silently

## Error Handling

- Invalid offer errors: Display detailed error in expanded box below the offer's input row
- Automatic retry when offer input changes to check if error is resolved
- Unexpected application errors: Display in error log at bottom of page
- Client-side logging: Also appears in the error display log
- Error display log hidden by accordion until opened by user or error occurs
- Strong ESLint settings and strict TypeScript compilation rules
- Comprehensive integration tests for all Wallet SDK interactions

## Global Clipboard Integration

- **Universal Copy**: Press Ctrl+C (or Cmd+C on Mac) anywhere on the page to copy the combined offer
- **Smart Context Detection**: Respects normal copy behavior in input fields and text selections
- **Instant Feedback**: Toast notifications confirm successful clipboard operations
- **Paste Anywhere**: Paste valid offer strings, offer IDs, or URLs anywhere on the page for instant detection
- **Duplicate Prevention**: Automatically prevents adding the same offer twice with clear error messages

## Deployment

- Builds to static files for flexible deployment options
- Support for GitHub Pages deployment
- Support for custom domain deployment

# Implementation Status

## ✅ Production Ready: Simple Offer Combining

### Core Functionality

- [x] **Professional WASM Validation**: Uses Chia Wallet SDK for offer validation and combining
- [x] **Flexible Input Options**: Accepts offer strings, offer IDs, and marketplace URLs
- [x] **API Integration**: Fetches full offers from Dexie and MintGarden APIs
- [x] **Global Clipboard**: Universal paste detection and Ctrl+C copy functionality
- [x] **Real-time Validation**: Instant validation with clear status indicators
- [x] **Duplicate Detection**: Prevents duplicate offers with clear error messages

### User Interface

- [x] **Clean Input Fields**: Simple, minimal interface with validation states
- [x] **Toast Notifications**: Real-time feedback for all operations
- [x] **Error Messages**: Clear error display for invalid or duplicate offers
- [x] **Responsive Design**: Optimized for desktop and mobile devices
- [x] **Copy to Clipboard**: One-click copying of combined offers

## 🧪 Comprehensive Testing

### ✅ Test Suite (WASM + API + Browser)

- **WASM Offer Validation**: Proper offer validation and combining using Chia SDK
- **API Integration**: Fetching offers from Dexie and MintGarden APIs
- **Duplicate Detection**: Validation prevents duplicate offers from being added
- **User Interface**: Toast notifications, clipboard operations, input validation
- **Network Resilience**: API failure handling with graceful fallbacks

**Test Results:**

```
✅ All tests passing
- Offer validation with WASM SDK
- API fetching from Dexie and MintGarden
- Duplicate offer detection
- E2E web UI tests
```

## 🚀 Technical Architecture

### WASM Integration

- **Chia Wallet SDK**: Uses official `chia-wallet-sdk-wasm` package for offer validation
- **Browser-Compatible**: Full WASM integration for client-side offer combining
- **No Backend Required**: Entirely static, client-side application

### API Integration

- **Dexie API**: Fetches full offers from offer IDs via [Dexie API](https://api.dexie.space/v1/offers/)
- **MintGarden API**: Fallback for fetching offers via [MintGarden API](https://api.mintgarden.io/offers/)
- **URL Support**: Extracts offer IDs from Dexie and MintGarden URLs

### Modern UX Design

- **Zero-Click Interface**: No buttons needed - paste anywhere, copy with Ctrl+C
- **Flexible Inputs**: Accept offer strings, IDs, or URLs
- **Visual Feedback**: Toast notifications and validation indicators
- **Mobile Optimized**: Touch-friendly responsive design

# Getting Started

## 🚀 Ready to Use

**Coffer is production-ready** with WASM validation, API integration, and clipboard functionality.

## Development

```bash
# Install dependencies
pnpm install

# Start development server with hot reloading
deno task dev

# Open browser to http://localhost:8000
```

### Pre-commit Hooks

The project uses Husky to automatically run CI checks before each commit:

- **Auto-formatting**: `deno fmt` automatically fixes code style issues
- **Linting**: `deno lint` checks for code quality issues
- **Build verification**: Ensures the project builds successfully

These checks run automatically when you commit. To manually run them:

```bash
.husky/pre-commit
```

The hooks are installed automatically when you run `pnpm install` via the `prepare` script.

## Using Coffer

### Adding Offers

You can paste offers in three ways:

1. **Full Offer String**: Paste the complete `offer1...` string
2. **Offer ID**: Paste a 44-character base64 offer ID (automatically fetched from APIs)
3. **Marketplace URL**: Paste a Dexie or MintGarden offer URL (ID extracted and fetched)

**Methods:**

- Paste directly into an input field
- Paste anywhere on the page (global paste detection)

### Managing Offers

- **Validation Status**: Each offer shows ✅ (valid) or ❌ (invalid/duplicate)
- **Error Messages**: Invalid or duplicate offers display clear error messages
- **Remove Offers**: Click the 🗑️ button to remove any offer
- **Clear All**: Use the "Clear All" button to remove all offers

### Exporting Combined Offers

- **Quick Copy**: Press Ctrl+C (or Cmd+C) anywhere on the page
- **Manual Copy**: Click the 📋 button next to the combined offer
- **Toast Feedback**: Visual confirmation for all clipboard operations

## Testing

```bash
# Run test suite
deno test tests/ --allow-all

# Test includes:
# - WASM offer validation and combining
# - API integration (Dexie and MintGarden)
# - Duplicate offer detection
# - E2E web UI tests
```

## Production Build

```bash
# Build optimized static files
deno task build

# Deploy ./dist folder to any static hosting provider
```

# Simple Chia Offer Combining

Coffer provides a clean, minimal interface for combining multiple Chia offers:

**Core Capabilities:**

- **WASM Validation**: Uses official Chia Wallet SDK for offer validation and combining
- **Flexible Inputs**: Accepts offer strings, offer IDs, or marketplace URLs
- **API Integration**: Automatically fetches offers from Dexie and MintGarden APIs
- **Duplicate Prevention**: Clear error messages prevent adding the same offer twice
- **Real-time Validation**: Instant feedback with validation status indicators
- **Cross-Platform**: Works seamlessly on Windows, macOS, and Linux browsers

**Technical Architecture:**

1. **WASM Integration** → Uses `chia-wallet-sdk-wasm` for client-side validation
2. **API Fetching** → Retrieves full offers from Dexie and MintGarden endpoints
3. **Global Paste Detection** → Paste anywhere on the page for instant offer addition
4. **Static Deployment** → No backend required, entirely client-side
5. **Modern UI** → Clean, minimal interface with clear validation states

## ✅ Production Ready

**Coffer provides a straightforward solution for Chia offer combining:**

- **WASM Powered**: Uses official Chia Wallet SDK for accurate validation
- **API Integration**: Fetches offers from Dexie and MintGarden marketplaces
- **User-Friendly**: Clear validation states and error messages
- **Comprehensive Testing**: E2E tests validate all functionality
- **Static Deployment**: Self-contained application deployable anywhere

**Coffer simplifies Chia offer combining with a clean interface and robust validation.**

---

# Resources

- [Chia Wallet SDK WASM](https://www.npmjs.com/package/chia-wallet-sdk-wasm) - WASM bindings used by Coffer
- [Dexie API](https://api.dexie.space/v1/offers/) - Offer lookup by ID
- [MintGarden API](https://api.mintgarden.io/offers/) - Fallback offer lookup
- [Chia Offers Guide](https://docs.chia.net/guides/offers-cli-tutorial/) - Official documentation
