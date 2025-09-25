#!/usr/bin/env -S deno run --allow-net --allow-read --allow-write --watch

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { serveDir } from 'https://deno.land/std@0.208.0/http/file_server.ts';

const PORT = 8000;

console.log(`🚀 Development server running at http://localhost:${PORT}`);
console.log('📁 Serving files from ./src with hot reloading enabled');

await serve(
  async (req: Request) => {
    const url = new URL(req.url);
    
    // Handle root path
    if (url.pathname === '/') {
      try {
        const html = await Deno.readTextFile('./src/index.html');
        return new Response(html, {
          headers: { 'content-type': 'text/html; charset=utf-8' },
        });
      } catch {
        return new Response('index.html not found', { status: 404 });
      }
    }

    // Serve static files
    return await serveDir(req, {
      fsRoot: './src',
      urlRoot: '',
      showDirListing: false,
      enableCors: true,
    });
  },
  { port: PORT }
);
