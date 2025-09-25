#!/usr/bin/env -S deno run --allow-net --allow-read --allow-write --allow-env --allow-run --watch

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { serveDir } from 'https://deno.land/std@0.208.0/http/file_server.ts';
import { extname } from 'https://deno.land/std@0.208.0/path/extname.ts';
import * as esbuild from 'npm:esbuild@0.19.12';

const PORT = 8000;

console.log(`🚀 Development server running at http://localhost:${PORT}`);
console.log('📁 Serving files from ./src with hot reloading enabled');
console.log('🔧 TypeScript/JSX transpilation enabled with esbuild');

// MIME type mapping for different file extensions
const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.ts': 'application/javascript; charset=utf-8',  // Will be transpiled
  '.tsx': 'application/javascript; charset=utf-8', // Will be transpiled
  '.jsx': 'application/javascript; charset=utf-8', // Will be transpiled
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.wasm': 'application/wasm',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function getMimeType(pathname: string): string {
  const ext = extname(pathname).toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

// Import map from deno.json for resolving bare imports
const IMPORT_MAP: Record<string, string> = {
  'preact': 'https://esm.sh/preact@10.19.2',
  'preact/': 'https://esm.sh/preact@10.19.2/',
  'chia-wallet-sdk-wasm': 'https://esm.sh/chia-wallet-sdk-wasm@0.29.0', // Convert npm: to esm.sh
};

// Transform bare imports to browser-compatible URLs
function transformImports(code: string): string {
  // Helper function to resolve import paths
  const resolveImportPath = (importPath: string): string => {
    // Check if it's already a URL or relative path
    if (importPath.startsWith('http') || importPath.startsWith('./') || importPath.startsWith('../') || importPath.startsWith('/')) {
      return importPath;
    }
    
    // Check for exact matches first
    if (IMPORT_MAP[importPath]) {
      return IMPORT_MAP[importPath];
    }
    
    // Check for prefix matches (like preact/jsx-runtime -> preact/ + jsx-runtime)
    for (const [prefix, url] of Object.entries(IMPORT_MAP)) {
      if (prefix.endsWith('/') && importPath.startsWith(prefix.slice(0, -1))) {
        const resolved = url + importPath.slice(prefix.slice(0, -1).length + 1);
        return resolved;
      }
    }
    
    // If no mapping found, keep as-is (may cause error, but at least we'll see it)
    return importPath;
  };
  
  // Replace static import statements with resolved URLs
  let transformedCode = code.replace(/from\s+["']([^"']+)["']/g, (match, importPath) => {
    const resolved = resolveImportPath(importPath);
    return match.replace(importPath, resolved);
  });
  
  // Replace dynamic imports with resolved URLs
  transformedCode = transformedCode.replace(/import\s*\(\s*["']([^"']+)["']\s*\)/g, (match, importPath) => {
    const resolved = resolveImportPath(importPath);
    return match.replace(importPath, resolved);
  });
  
  // Remove styled-components imports and add a mock styled function
  const hasStyledImport = /import\s+[^'"]*from\s+["']styled-components["']/.test(transformedCode) || 
                          /import\s+["']styled-components["']/.test(transformedCode);
  
  transformedCode = transformedCode.replace(/import\s+[^'"]*from\s+["']styled-components["'];?\s*\n?/g, '');
  transformedCode = transformedCode.replace(/import\s+["']styled-components["'];?\s*\n?/g, '');
  
  // If the file had styled-components imports, add a mock styled function
  if (hasStyledImport) {
    const mockStyled = `
// Mock styled-components replacement - returns regular HTML elements
function styled(tag) {
  return function(templateStrings, ...values) {
    // Return a component that renders the base HTML tag
    return function(props) {
      const { children, className = '', ...otherProps } = props || {};
      return { type: tag, props: { ...otherProps, className, children } };
    };
  };
}
// Add common HTML element shortcuts
styled.div = styled('div');
styled.section = styled('section');
styled.header = styled('header');
styled.main = styled('main');
styled.h1 = styled('h1');
styled.h2 = styled('h2');
styled.h3 = styled('h3');
styled.h4 = styled('h4');
styled.h5 = styled('h5');
styled.h6 = styled('h6');
styled.p = styled('p');
styled.span = styled('span');
styled.button = styled('button');
styled.textarea = styled('textarea');
styled.input = styled('input');
styled.form = styled('form');
styled.label = styled('label');
styled.ul = styled('ul');
styled.li = styled('li');
styled.nav = styled('nav');
styled.aside = styled('aside');
styled.article = styled('article');
styled.footer = styled('footer');
styled.a = styled('a');
styled.img = styled('img');
`;
    transformedCode = mockStyled + transformedCode;
  }
  
  // Remove CSS imports since browsers can't handle them directly via ES modules
  // We'll inject CSS via <link> tags instead
  transformedCode = transformedCode.replace(/import\s+["'][^"']*\.css["'];?\s*\n?/g, '');
  
  // Handle side-effect only imports (like import './styles/global.css')
  transformedCode = transformedCode.replace(/import\s+["']([^"']*\.css)["'];?\s*\n?/g, (match, cssPath) => {
    // Convert to a comment so we can see what was imported
    return `// CSS import removed: ${cssPath}\n`;
  });
  
  return transformedCode;
}

// Transpile TypeScript/JSX to JavaScript using esbuild
async function transpileTypeScript(filePath: string, content: string): Promise<string> {
  try {
    const result = await esbuild.transform(content, {
      loader: extname(filePath).slice(1) as 'ts' | 'tsx' | 'jsx',
      format: 'esm',
      target: 'es2020',
      jsx: 'automatic',
      jsxImportSource: 'preact',
      platform: 'browser',
    });
    
    // Transform bare imports to browser-compatible URLs
    const transformedCode = transformImports(result.code);
    
    return transformedCode;
  } catch (error) {
    console.error(`❌ Transpilation failed for ${filePath}:`, error);
    return `// Transpilation failed: ${error}\nconsole.error('Transpilation failed for ${filePath}:', ${JSON.stringify(String(error))});`;
  }
}

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

    // Handle TypeScript/JSX files with transpilation
    const ext = extname(url.pathname).toLowerCase();
    if (ext === '.ts' || ext === '.tsx' || ext === '.jsx') {
      try {
        const filePath = `./src${url.pathname}`;
        const content = await Deno.readTextFile(filePath);
        const transpiledContent = await transpileTypeScript(filePath, content);
        
        return new Response(transpiledContent, {
          headers: { 
            'content-type': 'application/javascript; charset=utf-8',
            'access-control-allow-origin': '*',
          },
        });
      } catch (error) {
        console.error(`❌ Failed to serve ${url.pathname}:`, error);
        return new Response(`// File not found: ${url.pathname}\nconsole.error('Failed to load:', '${url.pathname}');`, {
          status: 404,
          headers: { 'content-type': 'application/javascript; charset=utf-8' },
        });
      }
    }

    // Handle other static files
    try {
      const filePath = `./src${url.pathname}`;
      const file = await Deno.readFile(filePath);
      const mimeType = getMimeType(url.pathname);
      
      return new Response(file, {
        headers: { 
          'content-type': mimeType,
          'access-control-allow-origin': '*',
        },
      });
    } catch {
      // Fallback to standard serveDir for other cases
      return await serveDir(req, {
        fsRoot: './src',
        urlRoot: '',
        showDirListing: false,
        enableCors: true,
      });
    }
  },
  { port: PORT }
);
