/// <reference lib="deno.ns" />
// Unit test for WASM offer parsing with real Chia offer
import { assertEquals, assertExists } from "@std/assert";

const REAL_OFFER = "offer1qqr83wcuu2rykcmqvps8uxa363fasdmj26a44s55ll4hhan5vur6al4eynswuyamtdx70a67pn9067nv27j0jz4kxh4fx0ja4m7xhhlwhrher8xuw097mw5tnfhhclr33xqcrqvph0umkzdun5adeeaccyrx76xad8p4k7f4gfyh50umeku66d3t8e5ldmyunhpw4n9n7hte2j9pwua5ud20w59p97m8v3tlnvxlt7rpmgs4dns8lcllpvyqt6hlzmhfyt2lrtl0ldllhlsd0ngamald6yx34x0aja8vcv3f09880ae2f0tj0rxlxnlyhefhuv8evhplllexl7dln8gurtl07alch7sz3sts465c075awhec2cja6u69dh7m7exmd6w73c3j09g044c8qejuqu82ey3rk5tvyy56s2mncjnlua0f2m23mdmenatlu6z2vv9nwwzlky3tw6n6hmshm6w79eqckw688hfk7kpdgt9rj44sl0979m7l9mue643t9fulsg3fmqvp0vr54fy0xmu5dxmu5dxma5fxma5fxma5eymjqnf7wrsmasrumlncgaad3hrdhejxgexus0gjewurasruamdvpwyas9wmk6mykhqwtstlcczhtnxp3aecxh3um77t9awfu3xe58cegnttfldg74u3stmcwrglu6dk8mg25c4524pmq4wrpqc3fh4c8xlllhkmrz05tamvhxlj4mpuak7mm3x2wnm22ect8vhvu7t7l7879e08l7dmsa6qmg4y78t8yn6567wtzlmwl5054jqz8dnhju7vav0uydantdjzsteheh869wgrf7rlgxs7llv83jdanfl9r2kse6rqa9ffat4qmdaxz6mplnssx0hzn9dc68hatacre7yne2d6gxg97vpuyhh59klerlvnv7ma7v0wpahqj2melj8w06cyg8kzfkpcltlh7qdp5mgl7pvyrfr4plc3vyfvze3qmqj9qgpszqqgfssu5ehtgkl5n7vvevyqa92u7sael4n4tmgla7lmfawq736t22czm0tvcm6cknzaemls73wlny0l3xytcd5xzatevz3szzs3feysf85h6mza2a9t0va3juyfd384lf8ttvk48lef2727pz07dw3ng9akajdh4dcqh36ldukgudv08a525hkyzlsxak0mymnywa7lsds0hgp97vk0kr6lmzsauwm8ev4dwd22n4sl20rm3jlj4njsma79lw9d7yxwlgedqrx82zrf7wdr5e";

async function initializeWasm() {
  try {
    // Load WASM file directly from filesystem for testing
    const wasmPath = "./src/wasm/chia_wallet_sdk_wasm_bg.wasm";
    const wasmBytes = await Deno.readFile(wasmPath);
    
    // Import the background JS
    const wasmBg = await import('../../src/wasm/chia_wallet_sdk_wasm_bg.js');
    
    // Create imports object
    const imports = { "./chia_wallet_sdk_wasm_bg.js": {} };
    
    // Add all the __wbg_ and __wbindgen_ functions to the imports
    for (const [key, value] of Object.entries(wasmBg)) {
      if (key.startsWith('__wbg_') || key.startsWith('__wbindgen_')) {
        (imports["./chia_wallet_sdk_wasm_bg.js"] as any)[key] = value;
      }
    }
    
    // Instantiate WASM
    const wasmModuleInstance = await WebAssembly.instantiate(wasmBytes, imports);
    
    // Set up the WASM module  
    wasmBg.__wbg_set_wasm(wasmModuleInstance.instance.exports);
    
    console.log("✅ WASM initialized for testing");
    return wasmBg; // Return the background module with all functions
  } catch (error) {
    console.error("❌ Failed to initialize WASM:", error);
    throw error;
  }
}

Deno.test("Parse real Chia offer and extract offered/requested assets", async () => {
  // Initialize WASM
  const wasmModule = await initializeWasm();
  
  console.log("🔍 Decoding offer:", REAL_OFFER.substring(0, 50) + "...");
  
  try {
    // Decode the offer using WASM
    const spendBundle = wasmModule.decodeOffer(REAL_OFFER);
    
    assertExists(spendBundle, "SpendBundle should exist");
    console.log("✅ Successfully decoded offer");
    
    // Log the structure to understand what we get
    console.log("📊 SpendBundle keys:", Object.keys(spendBundle));
    
    if (spendBundle.coinSpends) {
      console.log("💰 Number of coin spends:", spendBundle.coinSpends.length);
      
      // Examine each coin spend
      spendBundle.coinSpends.forEach((coinSpend: any, index: number) => {
        console.log(`\n🪙 Coin Spend ${index + 1}:`);
        console.log("  - Keys:", Object.keys(coinSpend));
        
        if (coinSpend.coin) {
          console.log("  - Coin:", {
            coinName: coinSpend.coin.coinName,
            parentCoinInfo: coinSpend.coin.parentCoinInfo,
            puzzleHash: coinSpend.coin.puzzleHash,
            amount: coinSpend.coin.amount
          });
        }
        
        if (coinSpend.puzzleReveal) {
          console.log("  - Puzzle reveal length:", coinSpend.puzzleReveal.length);
        }
        
        if (coinSpend.solution) {
          console.log("  - Solution length:", coinSpend.solution.length);
        }
      });
    }
    
    if (spendBundle.aggregatedSignature) {
      console.log("🔒 Has aggregated signature");
    }
    
    // Try to understand the offer structure better
    console.log("\n🏗️ Full SpendBundle structure:");
    console.log(JSON.stringify(spendBundle, null, 2));
    
    // Basic assertions
    assertEquals(typeof spendBundle, "object", "SpendBundle should be an object");
    assertExists(spendBundle.coinSpends, "Should have coinSpends array");
    
  } catch (error) {
    console.error("❌ Failed to decode offer:", error);
    throw error;
  }
});

Deno.test("Test WASM library functions for offer parsing", async () => {
  const wasmModule = await initializeWasm();
  
  console.log("🔍 Available WASM functions:");
  const functions = Object.keys(wasmModule).filter(key => typeof (wasmModule as any)[key] === 'function');
  functions.forEach(fn => console.log(`  - ${fn}`));
  
  // Test basic encoding/decoding
  try {
    const spendBundle = wasmModule.decodeOffer(REAL_OFFER);
    console.log("✅ decodeOffer works");
    
    // Try to re-encode
    const reEncoded = wasmModule.encodeOffer(spendBundle);
    console.log("✅ encodeOffer works, length:", reEncoded.length);
    
    // Check if we can get the same result
    assertEquals(typeof reEncoded, "string", "Re-encoded offer should be string");
    
  } catch (error) {
    console.error("❌ Encoding/decoding test failed:", error);
    throw error;
  }
});
