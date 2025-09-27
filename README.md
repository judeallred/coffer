# Coffer
A professional web application for parsing, analyzing, and combining Chia offers with real-time token identification

## ✅ Status: Production Ready

**Advanced Offer Management**: Coffer provides an intuitive interface for combining multiple Chia offers using cutting-edge WASM-powered parsing, real-time CAT token identification via Dexie API, and global clipboard integration.

## About
Coffer is a modern single-page web application that leverages the Chia Wallet SDK's WASM bindings and live marketplace data to provide comprehensive offer management directly in your browser.

**Key Features:**
- **Real-time CAT Token Identification**: Integrates with Dexie API to display proper names for 545+ CAT tokens (wUSDC.b, SBX, Spacebucks, etc.)
- **Professional WASM Parsing**: Uses proper Chia Wallet SDK functions instead of heuristics for accurate NFT/CAT/XCH identification
- **Smart Asset Aggregation**: Automatically combines multiple coins of the same asset ID for accurate totals
- **Global Clipboard Integration**: Paste offers anywhere on the page, copy combined offers with Ctrl+C
- **Interactive Offer Cards**: Visual cards show offer details with proper token names and smooth animations
- **Advanced Parsing Engine**: Correctly extracts request amounts from complex offer structures
- **Persistent Storage**: Offers are saved locally and restored between sessions
- **Toast Notifications**: Clear visual feedback for all operations

The application uses the `chia-wallet-sdk-wasm` package for offer validation and parsing, combined with live Dexie marketplace data for token identification.

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

## Modern Interface Design
- **Global Paste Detection**: Simply paste any Chia offer string anywhere on the page - it's automatically detected and added
- **Compact Instruction Card**: Prominent gradient instruction panel explains the paste-anywhere functionality
- **Animated Offer Cards**: Each valid offer appears as an interactive card with:
  - Real-time validation status (✅/❌)
  - Summary of requested ⇄ offered assets
  - Expandable section showing full offer string
  - Individual remove buttons (X)
  - Smooth slide-in animations
- **No Input Fields**: Eliminated traditional text inputs for a cleaner, more intuitive experience
- **Professional Token Identification**: Real CAT token names from Dexie marketplace (wUSDC.b, Spacebucks, etc.)
- **Smart Asset Aggregation**: Multiple coins of same asset automatically combined for accurate totals
- **NFT Thumbnail Display**: Shows actual NFT images in both individual and combined offer previews

## Offer Preview
- Two-column layout similar to Dexie's offer display
- Left side shows "Requested" assets, right side shows "Offered" assets
- Bidirectional arrow in the center indicating the exchange
- For each asset displays:
  - Asset icon/image
  - Proper asset names and amounts (e.g., "0.19 XCH", "2.435 wUSDC.b", "10 Spacebucks")
  - For NFTs: thumbnail image, name, collection info, and metadata inspection option
- **Live Token Data**: 545+ CAT tokens with real names from Dexie trading pairs

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
- **Download Support**: Export combined offers as `.offer` files
- **Paste Anywhere**: Paste valid offer strings anywhere on the page for instant detection
- **Duplicate Prevention**: Automatically prevents adding the same offer twice

## Deployment
- Builds to static files for flexible deployment options
- Support for GitHub Pages deployment
- Support for custom domain deployment

# Implementation Status

## ✅ Production Ready: Advanced Offer Management

### Core Functionality
- [x] **Professional WASM Parsing**: Uses proper Chia SDK puzzle identification (not heuristics)
- [x] **Live Token Identification**: Real-time CAT token names via Dexie API (545+ tokens)
- [x] **Smart Asset Aggregation**: Automatically combines coins by asset ID for accurate totals
- [x] **Multi-NFT Bundle Support**: Correctly handles complex multi-NFT offers (10+ NFTs)
- [x] **CAT-to-CAT Trading**: Full support for complex token-to-token exchanges
- [x] **Global Clipboard**: Universal paste detection and Ctrl+C copy functionality
- [x] **Persistent Storage**: localStorage integration for session restoration

### Advanced Parsing Engine  
- [x] **Proper Asset Classification**: Uses `puzzle.parseCatInfo()` and `puzzle.parseNftInfo()`
- [x] **Asset ID Mapping**: Real token names instead of generic "CAT abc123..." labels
- [x] **Marketplace Integration**: Live data from Dexie trading pairs for token identification
- [x] **24-Hour Caching**: Efficient token data caching with automatic refresh
- [x] **Error Handling**: Graceful fallbacks for unknown tokens and network issues

### Modern User Interface
- [x] **Professional Token Display**: "wUSDC.b", "Spacebucks" instead of generic CAT labels
- [x] **Animated Offer Cards**: Smooth slide-in animations with proper token names
- [x] **Interactive Previews**: Expandable offer cards with detailed summaries
- [x] **NFT Bundle Display**: Clean presentation of multi-NFT offers
- [x] **Toast Notifications**: Real-time feedback for all operations
- [x] **Responsive Design**: Optimized for desktop and mobile devices

## 🧪 Comprehensive Testing

### ✅ Comprehensive Test Suite (WASM + API + Browser)
- **WASM Puzzle Parsing**: Proper CAT/NFT identification using Chia SDK functions
- **Dexie API Integration**: Live token data fetching and caching (545+ tokens)
- **Asset Aggregation**: Multiple coin combination by asset ID validation
- **Complex Offer Types**: Multi-NFT bundles, CAT-to-CAT exchanges, mixed offers
- **User Interface**: Animation testing, toast notifications, clipboard operations
- **Network Resilience**: API failure handling and cache fallback testing

**Example Test Results:**
```
🌐 Fetching CAT token data from Dexie API...
📊 Processing 545 tickers from Dexie...
✅ Processed 545 CAT tokens from Dexie tickers

📥📤 Added CAT to offered: 1.585 wUSDC.b     ← Real token name!
🔄 Aggregated CAT offered: 2.459 wUSDC.b    ← Proper aggregation!
📤 Final offered: 2.459 wUSDC.b             ← Professional display!

✅ wUSDC.b offer detected: true              ← Test passes!
```

### Key Achievements
- **Professional Token Display**: Real names like "wUSDC.b", "Spacebucks" vs generic "CAT abc123..."
- **Marketplace Integration**: Live token data from 545+ Dexie trading pairs
- **Asset Aggregation**: Multiple coins properly combined by asset ID
- **Proper WASM Parsing**: Uses `puzzle.parseCatInfo()` instead of length heuristics

## 🚀 Technical Architecture

### Advanced Token Identification
- **Live Market Data**: Integrates with [Dexie API](https://api.dexie.space/v3/prices/tickers) for real-time token names
- **Professional Display**: "wUSDC.b", "Spacebucks", "Dexie Bucks" instead of generic labels
- **Efficient Caching**: 24-hour cache with automatic refresh and network fallbacks
- **545+ Tokens Supported**: All tokens actively trading on Dexie marketplace

### Proper WASM Integration
- **Chia SDK Functions**: Uses `puzzle.parseCatInfo()` and `puzzle.parseNftInfo()` for accurate classification
- **Asset Aggregation**: Multiple coins of same asset ID automatically combined
- **Multi-Asset Support**: Handles complex CAT-to-CAT, NFT bundles, and mixed offers

### Modern UX Design  
- **Zero-Click Interface**: No buttons needed - paste anywhere, copy with Ctrl+C
- **Professional Token Display**: Real token names throughout the interface
- **Visual Feedback**: Professional animations and toast notifications
- **Mobile Optimized**: Touch-friendly responsive design

# Getting Started

## 🚀 Ready to Use

**Coffer is production-ready** with professional WASM parsing, live Dexie token identification, and modern clipboard functionality.

## Development
```bash
# Install dependencies
pnpm install

# Start development server with hot reloading
deno task dev

# Open browser to http://localhost:8000
# Expected: Professional offer interface with real CAT token names
```

## Using Coffer

### Adding Offers
1. **Copy** any Chia offer string to your clipboard
2. **Paste anywhere** on the Coffer page (Ctrl+V / Cmd+V)
3. **Watch** the offer animate in as an interactive card
4. **Repeat** for additional offers

### Managing Offers  
- **View Details**: Click "Show offer string" to expand full offer data
- **Remove Offers**: Click the ✕ button on any offer card
- **Automatic Persistence**: Offers are saved and restored between sessions

### Exporting Combined Offers
- **Quick Copy**: Press Ctrl+C (or Cmd+C) anywhere on the page
- **Download File**: Use the download button in the combined preview
- **Toast Feedback**: Visual confirmation for all clipboard operations

## Testing
```bash
# Run comprehensive test suite
deno test tests/ --allow-all --allow-net

# Test includes:
# - WASM puzzle parsing with proper SDK functions
# - Dexie API integration and token name resolution  
# - Asset aggregation and complex offer handling
# - Network resilience and caching functionality
```

## Production Build
```bash
# Build optimized static files
deno task build

# Deploy ./dist folder to any static hosting provider
```

# Professional Chia Offer Management

Coffer delivers enterprise-grade Chia offer functionality with cutting-edge token identification and WASM integration:

**Core Capabilities:**
- **Live Token Identification**: Real CAT token names from Dexie marketplace (545+ tokens)
- **Professional WASM Parsing**: Proper Chia SDK functions replace crude heuristics
- **Smart Asset Aggregation**: Multiple coins automatically combined by asset ID
- **Advanced Offer Types**: Multi-NFT bundles, CAT-to-CAT exchanges, complex trades
- **Real-time Validation**: Instant parsing with professional token display
- **Cross-Platform**: Seamless operation on Windows, macOS, and Linux browsers

**Technical Architecture:**
1. **Dexie API Integration** → Live token data from marketplace trading pairs
2. **Professional WASM Parsing** → `puzzle.parseCatInfo()` and `puzzle.parseNftInfo()` 
3. **Asset Aggregation Engine** → Multiple coin combination by asset ID
4. **24-Hour Caching System** → Efficient token data management with fallbacks
5. **Modern UI Framework** → Real token names throughout interface

## ✅ Production Ready

**Coffer represents a significant advancement in Chia offer management:**
- **545+ CAT Tokens**: Professional token identification via live Dexie marketplace data
- **Proper SDK Integration**: Uses official Chia Wallet SDK functions instead of heuristics
- **Enterprise-Grade UX**: Professional token display throughout the application
- **Comprehensive Testing**: Validated with complex real-world offer scenarios
- **Static Deployment**: Self-contained application deployable anywhere

**Coffer transforms Chia offer management from technical complexity to professional simplicity, delivering the most advanced offer parsing and token identification available in the ecosystem.**