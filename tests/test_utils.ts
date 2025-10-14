/**
 * Shared test utilities for all test files
 * Provides helper functions for common test operations
 */

/**
 * Check if a port is currently in use
 * @param port The port number to check
 * @returns true if port is in use, false if available
 */
export function isPortInUse(port: number): boolean {
  try {
    const listener = Deno.listen({ port });
    listener.close();
    return false;
  } catch {
    return true;
  }
}

/**
 * Find the next available port starting from a given port
 * @param startPort The port to start searching from
 * @param maxAttempts Maximum number of ports to try
 * @returns The first available port found
 * @throws Error if no free port found in range
 */
export function findFreePort(startPort: number, maxAttempts = 20): number {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;
    if (!isPortInUse(port)) {
      return port;
    }
  }
  throw new Error(
    `No free port found in range ${startPort}-${startPort + maxAttempts - 1}`,
  );
}

/**
 * Wait for a server to become available at the given URL
 * @param url The URL to check
 * @param maxAttempts Maximum number of attempts
 * @param delayMs Delay between attempts in milliseconds
 * @returns true when server is ready
 * @throws Error if server doesn't respond after max attempts
 */
export async function waitForServer(
  url: string,
  maxAttempts = 20,
  delayMs = 200,
): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1000) });
      if (response.ok || response.status === 404) {
        // Server is responding (404 is ok, just means the path doesn't exist)
        return;
      }
    } catch {
      // Server not ready yet, continue
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  throw new Error(`Server at ${url} failed to start after ${maxAttempts} attempts`);
}

/**
 * Start a file server on an available port
 * @param directory The directory to serve
 * @param preferredPort The preferred port to use (will find next available if taken)
 * @returns Object with the server process and actual port used
 */
export async function startFileServer(
  directory: string,
  preferredPort: number,
): Promise<{ process: Deno.ChildProcess; port: number; url: string }> {
  const port = findFreePort(preferredPort);

  const process = new Deno.Command('deno', {
    args: [
      'run',
      '--allow-net',
      '--allow-read',
      'https://deno.land/std@0.208.0/http/file_server.ts',
      '--port',
      String(port),
      directory,
    ],
    cwd: Deno.cwd(),
    stdout: 'piped',
    stderr: 'piped',
  }).spawn();

  const url = `http://localhost:${port}`;

  // Wait for server to be ready
  await waitForServer(url);

  return { process, port, url };
}

/**
 * Safely kill a process and wait for it to exit
 * @param process The process to kill
 * @param signal The signal to send (default: SIGTERM)
 */
export async function killProcess(
  process: Deno.ChildProcess,
  signal: Deno.Signal = 'SIGTERM',
): Promise<void> {
  try {
    process.kill(signal);
    await process.status;
  } catch (error) {
    // Process may have already exited
    console.warn('Error killing process:', error);
  }
}
