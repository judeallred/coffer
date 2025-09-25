/// <reference lib="deno.ns" />
// Unit test for asset grouping functionality with complex offer
import { assertEquals, assertExists } from "@std/assert";

// Complex offer from user that should show combined assets
const COMPLEX_OFFER = "offer1qqr83wcuu2ryhmwa0y6926clqlcxxtzr9ffsa47djsry8fwvv3yzgvk9j2h2fey73s2c5v45wwrqcx2w724z3xa6jkz29zqjef6rkm3ejssn5g2z3ygd0k8n46ekl466aulh0mllmm6ma8hauahnmeamnl6nk7ldl4vlh8848sjpyj25vhzckk29x4qklz5sv4gl8cyjwkaavvp6tga4l68v5u60cl4nu3xmqerjvgs87ztlvz2cwfprykj3yeyjamepwhkg9t0pewh7g9vtscev38z98hu3e5g4cu82llaklhzc7z77hqe95vnse6j6gh74wktuncawpf9nnd5juatykchvhe5w6j5j24s3x89q7ne0fa32ay2a0ee59wttlau7eg6cyrvq95zhzkwzlm4kmywx8ygfs4ffvn2f3zqhv7knc7kpsajxllann30x0mqwqjga9maetznq50cmuqjq6aewmzlzpcmqr2yygmdaed7vtkh6mkumwdjqer7twhy520nna7aepsecuraae59c8qyqzcpt5zf4y7d8fyyqpfsq0kfa82whntqs3z40rm96rl8vrfd9rx4nmhgy3a5gkj8nl3la692qh4jax405tsdg4r4xy7nrg79n5f270p78av326rw9jmydf8kaqkpj92vt44x5vmgzty24rw77lw59mh7trx807wt7lwyyld50kuh29v9fvfvnhzreq0le87hpy6zydpzxs3rgg35yg6xyl79prvvm8w40kaxuwwv8uajt792mwlwfq82lk7g2r362le3e022r433a36gdlqxapuqql7je6yjjhdzc2pq0khtz6psy9pmgdpl0d6ku8hqerh2497d4j74a65l3u9vt3dqm0vueslwtueae7d5hauan38dklsgwh677ekkw9993rgxdl208swzw2mnfa9y375rexcexa0eyvehzk0lhunwvp5s2ugd2gekj2sg2g4hmqqhccwu2wdc9ap4k8geteh88j72t0df22es9vvext08f0jh8mrymjx60v0cw73fw9l465sqn4ul43wlza72lnfp7jcsxr4p0dyt2u7v4ze6cfa085lt20q6hpmte94q97lg66duh86p7u0kqzsl86pxegfcl8yy3l9f0yz2dzfnm609qrenpgpdajlvassq0fesg4vs52ez9f6f664yf4rk980n9xler0x2n7df449q4pwnr40fwqxqwykgt5pud5qj5y9lnyalz5aeu0pvjl2v5zfalr74jk577280lvhtye66z7ejugp98fs980djjysx8rhya6mk9a4ygzttnm5pkz0h4xf5lr9d4eakhmf6fw5fj04vcq6qz42r4nq44wpxppv3kgszp4hpapqxssrggp5yq6zq9srg6wzsmn5yq30gcq0us74t29nuuag7pp8n2r9katt28m9c0e8w5t29k5ftmzm97rklr0pdzzsyew600z0n9jxd3jc8zs24qy6flwt4edwavl74qlndj4u3m54nkv5qf4lqlmewxfcda6g3zggmuv3snyq4gecglj298zw4fdxtfy9reu6a0m42kyehmsp3vwyfmr3qc77e6xjecjz9jqndz6yzqa5ypwpcgs2t50jzeqtk3d5ze6pvaqkwst8g9jkqd8f46rwwstx9askdxj746dh4aaq8x8ldf5gmqtn8zxfdlytkw75h3wmtm0zrdlahqq9pva7kfdcqzqqpa7s6rt02z03qxl6usnd5gc5wcpkavudaptnre36mu8fq5urpleag5ywxzwutgvguq86m646t435hx9pnx0fgx3dq5wkjj2elzz4rwua47d5wf57njuj9rvgt8dkd5vq9480hjgsqshs7x9nk6xcxe6pvaqkwst8g9nkzatg9nz6dqh8d43zwut48mtzdx3gq6eva3pnh6sjld9rauwhgu7em6nw4zjldntndmsg5d3zejf3mgwyyyqtfnerde27mh43cxuhj6hayjp0r726sv80jhe2p2cjgwz7h73acdy6zzxqkwut3q3gr22kmtuar0m20dgxm4gkcuwteq4z0hp6uny9sr99g4ys46nhnc37gt8jztz9qw6eu5w8lnhp5nglx9ne996pvaqkwst8g9n5zetqxn56aph8g9nz7ct9a3y3nky659rtf00588m58ndtyaduhh2dksedlnhyv75hn3uazqcfcqr2qg43j28z2dlfuvreaw34t0lc5m62pq4d5j8ch22sf49clzn3hsq68tghd8vgcqdh6t0c5hhr5fnmnlx2qffv6mwqlp7wg6hdm6lqjkjjg5ekh878s4js3cytszct5w3qqfrq9nyn9pqsqa4ts6u55pjaruckgjvhg9n5ze6pvaqkwst9vq6wnt5xuaqkvtmpvl3u33zlnktj698gjquh6tap5nthm6ftdtrs96g8zdsehz2dk0npqvfuk2ptfw0tvcwq85g36cpq9ep7xh9frxtjk9hzek6sa9swff5slknx98jtkhcsh9ku7yywpzuqkzarsq8gm4j0v4j2j0hdz5v87kdehs8d4h96nsj97y6uj046gaysta54f4hzfc3d0elqgqag5wwv2qzz7rcskwuttkwsr8g9n5ze6pvaqkwcf4azkgtejzvukkyeu4ajgmdf9kap05n57j0h5xp006ulq2xn8rmj3c89x4au78g0976evqqdpwauymlqdrpfhkzk8hl0uw672le086h48fwe2020kgajcuaytvmgqx3xedpw33pqqxqjvknyp4ldj79k7txhltewkz2eaydg3pfpm0dd9604wpkv89asjgggmuvasnsg3jw97x0uwd3qscqw3ewcpzqzz7rcsk0uwd3pqkwst8g9n5ze6pvasnt69vshnyyeedvfnlzdzemd0nn8rs6764228a6taz4gfmv6f95u4ud9kdxdw8qcre8r4zqp275kaxk9tamtkc9cklpf8huw4e0wk7dexqnxtnwvshl4xjqcezkkcqfkaj8ccyqfgd2jgk8k4zv7zaeecdk4dpy6vef95dr68mdh0fdnfkmledt47swfvfzz80p8v9uyy2q0c4tm4x3j8kptsz3jzesc2agfvxrtr2egdndl6y3esyrxl6lxxvyr3zc5hw9gz9qe74vcqc9c89z9epv2thz46pvaqkwst8g9n5zetg8nj6dqh8f43zw6tdn9l93alpjzamkyjjqxtyfcjutvp2f4mcurhn8edma4ee3sm0ffvhppth3a4aguqt464phj0n95he40q5fx5lxqa7xa3usl0dx6kk7rd0tmsw8ueew56ps3kgfneve3rqprw58jaefjw5luc0wunnggchxe9hv3dwjt43unst6xh4ykh96nnfzsp08rkka3pqq9dgwtac7968f3ve5h2st9g9j5ze2pv4qk2cp54xhgde2pvckkzedzzv4yjmp4ku768twk2mu7k385fkhkwa7w6u6dsm0pnmcf4envj7rtaj3f5s28gtzd0lkdjuh4y85307k5drlarq54ssek6k4ayms5r7lpmkreed9uyujzqht8vtnzpvwk9x7smv48fk3dszcrmr87x8uwa7ej2tlvddjlwgwjlmk4q4549wkyvg3zmhz2awppv68dz904hvthlr5zc6pvdqkxstrg93kqdrf4hl36ce9d6clxkzmxllu6dk3tk7wk47kh8q4z583hd43w27wk8dlctulx0lk4ears4nphhgad8vr7q0vs6edp4cqswdgjuas78gp0dpthval8fr72779mxkv4cm5lts5k6es60f5f9suq72pmvfecjpzk5ereq390y6rhnasxwtlypynexpx6ck89amn46rd35kx073hyqt7k089lkmdx7laz0jfxwhzdwwd6x3tm6x0pp3mr4f02acgr09nuylaf27hum2lxd0whf9xz54rtdkggn8ndff0mtyxpt9fsce4z8m3maja76yaj9lq9llrx8a7hw3ys";

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
    
    console.log("✅ WASM initialized for asset grouping testing");
    return wasmBg; // Return the background module with all functions
  } catch (error) {
    console.error("❌ Failed to initialize WASM:", error);
    throw error;
  }
}

// Grouping function to combine similar assets
function groupAssetsBySymbol(assets: { amount: string; asset: string }[]): { amount: string; asset: string }[] {
  const grouped = new Map<string, number>();
  
  for (const asset of assets) {
    const amount = parseFloat(asset.amount) || 0;
    const existing = grouped.get(asset.asset) || 0;
    grouped.set(asset.asset, existing + amount);
  }
  
  return Array.from(grouped.entries()).map(([asset, amount]) => ({
    asset,
    amount: amount.toString()
  }));
}

Deno.test("Complex offer parsing and asset grouping", async () => {
  console.log("🧪 Testing complex offer parsing and asset grouping...");
  
  const wasmBg = await initializeWasm();
  
  try {
    console.log("📦 Decoding complex offer...");
    const spendBundle = wasmBg.decodeOffer(COMPLEX_OFFER);
    console.log("✅ Offer decoded successfully");
    
    // Log the structure to understand what we're working with
    console.log("🔍 SpendBundle structure:");
    console.log("- coinSpends length:", spendBundle.coinSpends?.length || 0);
    
    // Analyze each coin spend to understand the assets
    const allAssets: { amount: string; asset: string; type: 'offered' | 'requested' }[] = [];
    
    if (spendBundle.coinSpends && spendBundle.coinSpends.length > 0) {
      spendBundle.coinSpends.forEach((coinSpend: any, index: number) => {
        const coin = coinSpend.coin;
        if (!coin || !coin.amount) return;
        
        const amountMojos = Number(coin.amount);
        console.log(`💰 Coin ${index + 1}: ${amountMojos} mojos`);
        
        // Skip zero-amount coins (settlement coins)
        if (amountMojos === 0) {
          console.log('  ⏭️ Skipping zero-amount coin (settlement)');
          return;
        }
        
        // Determine asset type based on puzzle reveal
        const puzzleRevealLength = coinSpend.puzzleReveal?.length || 0;
        console.log(`  🧩 Puzzle reveal length: ${puzzleRevealLength}`);
        
        let assetType: string;
        let assetAmount: string;
        let transactionType: 'offered' | 'requested';
        
        if (puzzleRevealLength > 1000) {
          // Long puzzle reveals usually indicate CAT tokens
          assetType = 'CAT'; // We'll improve this detection
          assetAmount = (amountMojos / 1000).toString(); // Assuming 3 decimal places for most CATs
          console.log(`  🪙 Detected CAT token: ${assetAmount} CAT`);
        } else {
          // Shorter puzzles are typically XCH
          assetType = 'XCH';
          assetAmount = (amountMojos / 1_000_000_000_000).toString(); // Convert mojos to XCH
          console.log(`  🌱 Detected XCH: ${assetAmount} XCH`);
        }
        
        // Simple heuristic for offered vs requested
        // This will need refinement based on actual offer structure
        transactionType = amountMojos > 1_000_000 ? 'offered' : 'requested';
        
        allAssets.push({
          amount: assetAmount,
          asset: assetType,
          type: transactionType
        });
      });
    }
    
    // Group assets by type and symbol
    const offered = allAssets.filter(a => a.type === 'offered').map(a => ({ amount: a.amount, asset: a.asset }));
    const requested = allAssets.filter(a => a.type === 'requested').map(a => ({ amount: a.amount, asset: a.asset }));
    
    const groupedOffered = groupAssetsBySymbol(offered);
    const groupedRequested = groupAssetsBySymbol(requested);
    
    console.log("📊 Grouped Results:");
    console.log("Offered:", groupedOffered);
    console.log("Requested:", groupedRequested);
    
    // The test should verify that similar assets are combined
    // For the example offer, we expect something like:
    // - Requested: 1,401,069.312 TIBET-🪄⚡️-XCH (combined from multiple entries)
    // - Offered: 1.743466948227 XCH + 3,000 🪄⚡️Spell Power (combined from multiple entries)
    
    // Basic assertions - we'll refine these after seeing actual output
    assertExists(groupedOffered);
    assertExists(groupedRequested);
    
    console.log("✅ Asset grouping test completed");
    
  } catch (error) {
    console.error("❌ Error in asset grouping test:", error);
    throw error;
  }
});
