// Browser-compatible WASM loader for chia-wallet-sdk-wasm
// The npm package uses Node.js-style imports (import * as wasm from "./file.wasm")
// which don't work in browsers. This is the standard browser approach using the
// WebAssembly API directly.
import * as wasm_bg from './chia_wallet_sdk_wasm_bg.js';

let isInitialized = false;

// Initialize the WASM module using the standard WebAssembly API
// See: https://developer.mozilla.org/en-US/docs/WebAssembly/Loading_and_running
async function initWasm() {
  if (isInitialized) {
    return; // Already initialized
  }

  try {
    // Fetch the WASM file as raw binary (standard approach for browsers)
    // Alternative: WebAssembly.instantiateStreaming(fetch(url)) for streaming compilation
    const wasmPath = './chia_wallet_sdk_wasm_bg.wasm';
    const wasmResponse = await fetch(wasmPath);

    if (!wasmResponse.ok) {
      throw new Error(
        `Failed to fetch WASM file: ${wasmResponse.status} ${wasmResponse.statusText}`,
      );
    }

    const wasmArrayBuffer = await wasmResponse.arrayBuffer();

    // Create the imports object with all the functions the WASM module needs
    const imports = { './chia_wallet_sdk_wasm_bg.js': {} };

    // Add all the __wbg_ and __wbindgen_ functions to the imports
    for (const [key, value] of Object.entries(wasm_bg)) {
      if (key.startsWith('__wbg_') || key.startsWith('__wbindgen_')) {
        imports['./chia_wallet_sdk_wasm_bg.js'][key] = value;
      }
    }

    // Instantiate the WASM module with the imports it needs
    // This is the standard WebAssembly API - see WebAssembly.org documentation
    const wasmModuleInstance = await WebAssembly.instantiate(wasmArrayBuffer, imports);

    // Set up the WASM module
    wasm_bg.__wbg_set_wasm(wasmModuleInstance.instance.exports);
    isInitialized = true;

    console.log('WASM module initialized successfully via ArrayBuffer');
  } catch (error) {
    console.error('Failed to initialize WASM:', error);
    throw error;
  }
}

// Export default init function
export default initWasm;

// Also export as named export for compatibility
export { initWasm };

// Export all functions from the background JS file
export * from './chia_wallet_sdk_wasm_bg.js';
