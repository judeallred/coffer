# coffer
A simple utility website for combining Chia offers


# About
Coffer is single page static website which uses the Chia Wallet SDK's wasm bindings to run chia wallet commands in the browser.

The site provides a column of text entries, where each row in the column is initially a blank field into which a Chia offer string can be pasted.

Below this is an offer preview which shows the inputs and outputs of the combined offer.

Below that are buttons that allow you to copy the combined offer string to your clipboard, or to download it as a files.

To accomplish the combining of the offers, the site makes use of the wasm bindigns output by the https://github.com/xch-dev/chia-wallet-sdk project.  This project is checked in as a sub-repository.

# tech stack
This project is implemented as a single-page static client side website. It uses Deno, pnpm, and preact.

## Build Process
- Uses standard Deno + Preact project structure
- Includes bundling and minification for production builds
- Hot reloading for development
- Integrates chia-wallet-sdk as a git submodule
- Build process invokes `cargo build` in the submodule to generate .wasm files and bindings

## Styling
- Uses styled components for component styling
- Minimalist design aesthetic with simple, effective styles

## Input Management
- Initially displays 5 offer input rows
- Automatically adds new rows when all existing rows are filled
- No limit on the number of offers that can be combined
- Validates offer strings using the Chia Wallet SDK
- Individual offer preview displayed below each row once offer is pasted and validated
- Individual preview shows compact table format similar to Dexie offer rows:
  - Requested assets column with amounts and tickers
  - Offered assets column with amounts, tickers, and NFT thumbnails
  - Bidirectional arrow between columns
  - Price/exchange rate information
  - Date information if available

## Offer Preview
- Two-column layout similar to Dexie's offer display
- Left side shows "Requested" assets, right side shows "Offered" assets
- Bidirectional arrow in the center indicating the exchange
- For each asset displays:
  - Asset icon/image
  - Asset amount and ticker symbol (e.g., "0.19 XCH", "45.268 DBX")
  - For NFTs: thumbnail image, name, collection info, and metadata inspection option

## Error Handling
- Invalid offer errors: Display detailed error in expanded box below the offer's input row
- Automatic retry when offer input changes to check if error is resolved
- Unexpected application errors: Display in error log at bottom of page
- Client-side logging: Also appears in the error display log
- Error display log hidden by accordion until opened by user or error occurs
- Strong ESLint settings and strict TypeScript compilation rules
- Unit tests for all Wallet SDK interactions

## File Operations
- Combined offer downloads as plain text files with `.offer` extension
- Copy combined offer string to clipboard functionality
- Toast notifications for clipboard copy success/failure

## Deployment
- Builds to static files for flexible deployment options
- Support for GitHub Pages deployment
- Support for custom domain deployment

# Implementation Progress

## Core Setup
- [x] Set up Deno + pnpm + Preact project structure with development configuration
- [x] Configure chia-wallet-sdk git submodule and cargo build integration
- [x] Configure styled components and establish minimalist design system
- [x] Set up strong ESLint rules and strict TypeScript configuration

## UI Components
- [x] Implement dynamic offer input rows (5 initial, auto-expand when filled)
- [x] Create individual offer preview components (Dexie table-style)
- [x] Build combined offer preview display (Dexie detail-style)
- [x] Implement error boxes below inputs and accordion error log
- [x] Implement toast system for user feedback

## Functionality
- [ ] Integrate wallet SDK for offer validation and parsing
- [x] Add clipboard copy and .offer file download functionality
- [ ] Implement offer combining logic using wallet SDK

## Quality & Testing
- [ ] Write unit tests for all wallet SDK interactions
- [x] Configure production build and static file deployment

# Development Status

## ✅ Completed Features
- **Core Architecture**: Full Deno + Preact + Styled Components setup
- **Development Environment**: Hot reloading dev server with TypeScript
- **UI Framework**: Minimalist design system with CSS variables
- **Input Management**: 5 initial rows with auto-expansion when filled
- **Individual Previews**: Dexie-style compact offer previews below each input
- **Combined Preview**: Large preview showing the final combined offer result
- **Error Handling**: Expandable error boxes per offer + accordion error log
- **Toast System**: Success/error notifications with auto-dismiss
- **File Operations**: Clipboard copy and .offer file download
- **Type Safety**: Strict TypeScript with comprehensive type definitions

## 🚧 In Progress / Next Steps
- **Real Validation**: Replace mock validation with chia-wallet-sdk integration
- **Offer Combining**: Implement actual offer combining logic using WASM
- **Unit Testing**: Test coverage for all wallet SDK interactions

## 🎯 Ready to Use
The application is **fully functional** with mock data and can be used to:
1. Paste offer strings into input fields
2. See validation feedback and individual previews
3. View combined offer preview
4. Copy results to clipboard or download as .offer files
5. Monitor application logs and errors

Run `deno task dev` to start development server at http://localhost:8000