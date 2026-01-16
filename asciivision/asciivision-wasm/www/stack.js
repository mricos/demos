#!/usr/bin/env node
/**
 * stack.js - Serve multiple directories under one origin
 * Enables BroadcastChannel communication across apps
 *
 * Usage: node stack.js [port]
 * Config: stack.json
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.argv[2] || 8008;
const CONFIG_FILE = path.join(__dirname, 'stack.json');

// Default config - can be overridden by stack.json
let config = {
    routes: {
        '/': __dirname,
        // Add more routes in stack.json
    }
};

// Load config if exists
if (fs.existsSync(CONFIG_FILE)) {
    try {
        const userConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        config = { ...config, ...userConfig };
        // Resolve relative paths
        for (const [route, dir] of Object.entries(config.routes)) {
            if (!path.isAbsolute(dir)) {
                config.routes[route] = path.resolve(__dirname, dir);
            }
        }
    } catch (e) {
        console.error('Error loading stack.json:', e.message);
    }
}

// MIME types
const MIME = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.mjs': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.wasm': 'application/wasm',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
};

function getMime(filepath) {
    const ext = path.extname(filepath).toLowerCase();
    return MIME[ext] || 'application/octet-stream';
}

function findRoute(urlPath) {
    // Sort routes by length (longest first) for best match
    const routes = Object.keys(config.routes).sort((a, b) => b.length - a.length);

    for (const route of routes) {
        if (urlPath === route || urlPath.startsWith(route + '/') || route === '/') {
            if (route === '/' || urlPath === route || urlPath.startsWith(route + '/')) {
                const relativePath = route === '/' ? urlPath : urlPath.slice(route.length) || '/';
                return {
                    baseDir: config.routes[route],
                    relativePath: relativePath
                };
            }
        }
    }
    return null;
}

const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split('?')[0]);

    // Redirect /route to /route/ for proper relative path resolution
    const routes = Object.keys(config.routes).filter(r => r !== '/');
    for (const route of routes) {
        if (urlPath === route) {
            res.writeHead(301, { 'Location': route + '/' });
            res.end();
            return;
        }
    }

    const match = findRoute(urlPath);
    if (!match) {
        res.writeHead(404);
        res.end('Not found');
        return;
    }

    let filepath = path.join(match.baseDir, match.relativePath);

    // Resolve symlinks for the actual file path
    try {
        filepath = fs.realpathSync(filepath);
    } catch (e) {
        // File doesn't exist, will be caught below
    }

    // Handle directory requests
    if (fs.existsSync(filepath) && fs.statSync(filepath).isDirectory()) {
        filepath = path.join(filepath, 'index.html');
    }

    // Serve file
    fs.readFile(filepath, (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404);
                res.end('Not found: ' + urlPath);
            } else {
                res.writeHead(500);
                res.end('Server error');
            }
            return;
        }

        res.writeHead(200, {
            'Content-Type': getMime(filepath),
            'Access-Control-Allow-Origin': '*',
        });
        res.end(data);
    });
});

server.listen(PORT, () => {
    console.log(`\n🚀 Stack server running at http://localhost:${PORT}\n`);
    console.log('Routes:');
    for (const [route, dir] of Object.entries(config.routes)) {
        console.log(`  ${route.padEnd(20)} → ${dir}`);
    }
    console.log('\nBroadcastChannel enabled across all routes (same origin)\n');
});
