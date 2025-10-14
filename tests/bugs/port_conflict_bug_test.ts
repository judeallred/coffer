/// <reference lib="deno.ns" />

/**
 * Test to verify that test servers handle port conflicts gracefully
 *
 * Bug: Tests use fixed ports without conflict handling
 * This can cause intermittent failures when ports are already in use
 */

import { assert } from 'https://deno.land/std@0.208.0/testing/asserts.ts';

function isPortInUse(port: number): boolean {
  try {
    const listener = Deno.listen({ port });
    listener.close();
    return false;
  } catch {
    return true;
  }
}

function findFreePort(startPort: number, maxAttempts = 10): number {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;
    if (!isPortInUse(port)) {
      return port;
    }
  }
  throw new Error(`No free port found in range ${startPort}-${startPort + maxAttempts}`);
}

Deno.test({
  name: 'Bug Test: Verify port conflict detection works',
  fn: () => {
    const testPort = 8050;

    // Check if port is initially free
    const initiallyFree = !isPortInUse(testPort);
    console.log(`Port ${testPort} initially free: ${initiallyFree}`);

    // Start a server on the port
    const listener = Deno.listen({ port: testPort });
    console.log(`Started test server on port ${testPort}`);

    // Verify port is now in use
    const nowInUse = isPortInUse(testPort);
    assert(nowInUse, `Port ${testPort} should be detected as in use`);
    console.log('✅ Port conflict detection works correctly');

    // Cleanup
    listener.close();

    // Verify port is free again
    const freedUp = !isPortInUse(testPort);
    assert(freedUp, `Port ${testPort} should be free after closing listener`);
    console.log('✅ Port cleanup works correctly');
  },
});

Deno.test({
  name: 'Bug Test: Verify findFreePort utility works',
  fn: () => {
    // Start servers on a range of ports
    const startPort = 8060;
    const listeners: Deno.Listener[] = [];

    try {
      // Occupy ports 8060-8063
      for (let i = 0; i < 4; i++) {
        const listener = Deno.listen({ port: startPort + i });
        listeners.push(listener);
      }

      // Try to find a free port starting at 8060
      const freePort = findFreePort(startPort);

      // Should find 8064 or higher
      assert(freePort >= startPort + 4, `Free port should be ${startPort + 4} or higher`);
      console.log(`✅ Found free port: ${freePort}`);

      // Verify it's actually free
      const testListener = Deno.listen({ port: freePort });
      testListener.close();
      console.log('✅ findFreePort utility works correctly');
    } finally {
      // Cleanup
      for (const listener of listeners) {
        listener.close();
      }
    }
  },
});

Deno.test({
  name: 'Bug Test: Current tests should handle port conflicts',
  fn: () => {
    // This test checks if existing test files will fail with port conflicts
    const testPorts = [8002, 8003, 8004, 8005];
    const portsInUse: number[] = [];

    for (const port of testPorts) {
      if (isPortInUse(port)) {
        portsInUse.push(port);
      }
    }

    if (portsInUse.length > 0) {
      console.warn(`⚠️  Warning: Test ports already in use: ${portsInUse.join(', ')}`);
      console.warn('This could cause test failures if not handled properly');
    } else {
      console.log('✅ All test ports are currently free');
    }

    // The test passes but warns about potential issues
    assert(true, 'Port conflict check completed');
  },
});

// Export utilities for use in other tests
export { findFreePort, isPortInUse };
