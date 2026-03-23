#!/usr/bin/env node

/**
 * Pong64 Web Server
 *
 * Express + WebSocket server for Pong64 game
 * Bridges OSC/UDP (MIDI-MP) ↔ WebSocket (browser) for flock parameter control
 * Same architecture as cymatica-server.js
 */

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');

// Load transform config (CC -> parameter mapping)
const transformFile = path.join(__dirname, 'pong64-transform.json');
let transformMap = {};
try {
  const cfg = JSON.parse(fs.readFileSync(transformFile, 'utf8'));
  transformMap = cfg.transform || {};
  console.log(`Loaded transforms from ${transformFile}`);
} catch (e) {
  console.error(`Warning: Could not load transform config: ${e.message}`);
}

const config = {
  httpPort: parseInt(process.env.HTTP_PORT || process.argv[2] || 3401),
  oscLocalAddress: "0.0.0.0",
  oscLocalPort: 1983,
  oscMulticast: '239.1.1.1',
  publicDir: path.join(__dirname, '..'),
  metadata: true
};

console.log(`\nPong64 Server`);
console.log(`HTTP: http://0.0.0.0:${config.httpPort}`);
console.log(`WS:   ws://0.0.0.0:${config.httpPort}/ws\n`);

const app = express();
app.use(express.json());
app.use(express.static(config.publicDir));

const currentState = {
  separation: 1.0,
  alignment: 1.0,
  cohesion: 1.0,
  maxSpeed: 8,
  coalescence: 0.5,
  paddleHardness: 0.5,
  turbulence: 0.1,
  visualMode: 0
};

app.get('/health', (req, res) => {
  res.json({ status: 'ok', server: 'pong64', wsClients: wss.clients.size });
});

app.get('/api/state', (req, res) => {
  res.json({ parameters: currentState, connected: wss.clients.size > 0 });
});

const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/ws' });

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'state', data: currentState }));

  ws.on('message', (message) => {
    try {
      const msg = JSON.parse(message);
      if (msg.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
      }
    } catch (e) { /* ignore */ }
  });
});

function broadcastToClients(message) {
  const msgStr = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msgStr);
    }
  });
}

// OSC/UDP multicast listener for MIDI control
const dgram = require('dgram');
const osc = require('osc');
const udpSocket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

udpSocket.on('listening', () => {
  try {
    udpSocket.addMembership(config.oscMulticast);
    console.log(`OSC: joined multicast ${config.oscMulticast}:${config.oscLocalPort}`);
  } catch (err) {
    console.error(`OSC: failed to join multicast: ${err.message}`);
  }
});

const udpPort = new osc.UDPPort({ socket: udpSocket, metadata: config.metadata });

function normalize(midiValue, min, max) {
  return min + (midiValue / 127.0) * (max - min);
}

udpPort.on("message", (oscMsg) => {
  const mapping = transformMap[oscMsg.address];
  if (mapping) {
    const raw = oscMsg.args[0];
    const midiValue = raw && raw.value !== undefined ? raw.value : raw;
    const [min, max] = mapping.normalize || [0, 1];
    const value = normalize(midiValue, min, max);
    const param = mapping.event.replace('pong64.', '');

    currentState[param] = value;
    broadcastToClients({
      type: 'parameter',
      data: { parameter: param, value, timestamp: Date.now() }
    });
  }
});

udpPort.on("error", (err) => console.error("OSC error:", err));

server.listen(config.httpPort, '0.0.0.0', () => {
  console.log(`Pong64 ready: http://localhost:${config.httpPort}\n`);
});

udpSocket.bind(config.oscLocalPort, config.oscLocalAddress, () => {
  try { udpPort.open(); } catch (err) {
    console.error("Failed to open OSC port:", err);
    process.exit(1);
  }
});

process.on('SIGINT', () => { udpPort.close(); server.close(() => process.exit(0)); });
process.on('SIGTERM', () => { udpPort.close(); server.close(() => process.exit(0)); });
