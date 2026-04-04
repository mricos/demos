const http = require('http');
const { WebSocketServer, WebSocket } = require('ws');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = parseInt(process.env.PORT || '3030', 10);
const SAMPLE_DURATION_SEC = parseInt(process.env.EEG_SAMPLE_DURATION || '0', 10);
const POLL_INTERVAL_MS = parseInt(process.env.EEG_POLL_INTERVAL || '100', 10);

const PROFILES = {
    muse2: {
        name: 'Muse 2',
        samplingRate: 256,
        channels: ['TP9', 'AF7', 'AF8', 'TP10'],
        bands: ['delta', 'theta', 'alpha', 'beta', 'gamma'],
    },
    tgam: {
        name: 'TGAM',
        samplingRate: 512,
        channels: ['Raw'],
        bands: ['delta', 'theta', 'lowAlpha', 'highAlpha', 'lowBeta', 'highBeta', 'lowGamma', 'midGamma'],
        baudRate: 57600,
    },
};

// ── Muse 2 synthetic generator ─────────────────────
// 4 channels @ 256 Hz, simulates alpha/theta/beta + noise per channel

class Muse2Synthetic {
    constructor() {
        this.samplingRate = 256;
        this.channels = ['TP9', 'AF7', 'AF8', 'TP10'];
        this.t = 0;
        // Slightly different frequency mix per channel for realism
        this._mix = [
            { alpha: 60, theta: 30, beta: 15, noise: 40 },  // TP9
            { alpha: 80, theta: 25, beta: 20, noise: 35 },  // AF7
            { alpha: 75, theta: 28, beta: 18, noise: 38 },  // AF8
            { alpha: 55, theta: 35, beta: 12, noise: 42 },  // TP10
        ];
    }

    poll(numSamples) {
        const data = {};
        this.channels.forEach((ch, ci) => {
            const m = this._mix[ci];
            const arr = new Array(numSamples);
            let t = this.t;
            for (let i = 0; i < numSamples; i++) {
                arr[i] = m.alpha * Math.sin(2 * Math.PI * 10 * t)
                       + m.theta * Math.sin(2 * Math.PI * 6 * t)
                       + m.beta  * Math.sin(2 * Math.PI * 20 * t)
                       + (Math.random() - 0.5) * m.noise;
                t += 1 / this.samplingRate;
            }
            data[ch] = arr;
        });
        this.t += numSamples / this.samplingRate;
        return data;
    }
}

// ── TGAM synthetic generator ───────────────────────
// 1 channel @ 512 Hz + attention/meditation/bands at 1 Hz

class TGAMSynthetic {
    constructor() {
        this.samplingRate = 512;
        this.t = 0;
        this.attention = 50;
        this.meditation = 50;
        this.lastMetricsTime = 0;
    }

    poll(numSamples) {
        const raw = new Array(numSamples);
        for (let i = 0; i < numSamples; i++) {
            raw[i] = 80 * Math.sin(2 * Math.PI * 10 * this.t)
                   + 40 * Math.sin(2 * Math.PI * 6 * this.t)
                   + 20 * Math.sin(2 * Math.PI * 20 * this.t)
                   + (Math.random() - 0.5) * 60;
            this.t += 1 / this.samplingRate;
        }
        return { Raw: raw };
    }

    getMetrics() {
        const now = Date.now();
        if (now - this.lastMetricsTime < 1000) return null;
        this.lastMetricsTime = now;

        this.attention = Math.max(0, Math.min(100, this.attention + (Math.random() - 0.5) * 8));
        this.meditation = Math.max(0, Math.min(100, this.meditation + (Math.random() - 0.5) * 8));

        return {
            attention: Math.round(this.attention),
            meditation: Math.round(this.meditation),
            signal: 0,
            bands: {
                delta: 10000 + Math.random() * 5000,
                theta: 8000 + Math.random() * 4000,
                lowAlpha: 6000 + Math.random() * 3000,
                highAlpha: 5000 + Math.random() * 3000,
                lowBeta: 3000 + Math.random() * 2000,
                highBeta: 2000 + Math.random() * 1500,
                lowGamma: 1000 + Math.random() * 1000,
                midGamma: 500 + Math.random() * 500,
            },
        };
    }
}

// ── TGAM ThinkGear protocol parser ─────────────────
// Ported from coilflow/eeg/tgam/python/tui/mindwave-stream.py
// Protocol: [0xAA] [0xAA] [PLENGTH] [PAYLOAD...] [CHECKSUM]

const TG = {
    SYNC: 0xAA,
    RAW_VALUE: 0x80,
    POOR_SIGNAL: 0x02,
    ATTENTION: 0x04,
    MEDITATION: 0x05,
    BLINK: 0x16,
    ASIC_EEG_POWER: 0x83,
};

class TGAMParser {
    constructor(onRaw, onMetrics) {
        this.onRaw = onRaw;
        this.onMetrics = onMetrics;
        this._state = 'sync1';
        this._plength = 0;
        this._payload = [];
        this._bytesRead = 0;
    }

    feed(data) {
        for (let i = 0; i < data.length; i++) {
            this._processByte(data[i]);
        }
    }

    _processByte(b) {
        switch (this._state) {
            case 'sync1':
                if (b === TG.SYNC) this._state = 'sync2';
                break;
            case 'sync2':
                this._state = b === TG.SYNC ? 'plength' : 'sync1';
                break;
            case 'plength':
                if (b > 169) { this._state = 'sync1'; break; }
                this._plength = b;
                this._payload = [];
                this._bytesRead = 0;
                this._state = 'payload';
                break;
            case 'payload':
                this._payload.push(b);
                this._bytesRead++;
                if (this._bytesRead >= this._plength) this._state = 'checksum';
                break;
            case 'checksum':
                const sum = this._payload.reduce((a, v) => a + v, 0);
                if (b === (~sum & 0xFF)) this._parsePayload(this._payload);
                this._state = 'sync1';
                break;
        }
    }

    _parsePayload(payload) {
        let i = 0;
        const metrics = {};
        while (i < payload.length) {
            const code = payload[i++];

            if (code === TG.RAW_VALUE) {
                const vl = payload[i++];
                if (vl === 2 && i + 1 < payload.length) {
                    let val = (payload[i] << 8) | payload[i + 1];
                    if (val >= 32768) val -= 65536;
                    i += 2;
                    this.onRaw(val);
                } else {
                    i += vl || 0;
                }
            } else if (code === TG.POOR_SIGNAL) {
                metrics.signal = payload[i++];
            } else if (code === TG.ATTENTION) {
                metrics.attention = payload[i++];
            } else if (code === TG.MEDITATION) {
                metrics.meditation = payload[i++];
            } else if (code === TG.BLINK) {
                metrics.blink = payload[i++];
            } else if (code === TG.ASIC_EEG_POWER) {
                const vl = payload[i++];
                if (vl === 24 && i + 23 < payload.length) {
                    const bands = {};
                    const names = ['delta', 'theta', 'lowAlpha', 'highAlpha',
                                   'lowBeta', 'highBeta', 'lowGamma', 'midGamma'];
                    for (let b = 0; b < 8; b++) {
                        bands[names[b]] = (payload[i] << 16) | (payload[i + 1] << 8) | payload[i + 2];
                        i += 3;
                    }
                    metrics.bands = bands;
                } else {
                    i += vl || 0;
                }
            } else {
                break;
            }
        }
        if (Object.keys(metrics).length > 0) this.onMetrics(metrics);
    }
}

// ── Real TGAM serial connection ────────────────────

class TGAMSerial {
    constructor(serialPort, broadcast) {
        this.samplingRate = 512;
        this._rawBuffer = [];
        this._broadcast = broadcast;

        const { SerialPort } = require('serialport');
        this._port = new SerialPort({ path: serialPort, baudRate: 57600 });

        this._parser = new TGAMParser(
            (val) => { this._rawBuffer.push(val); },
            (metrics) => {
                this._broadcast(JSON.stringify({
                    type: 'metrics',
                    attention: metrics.attention || 0,
                    meditation: metrics.meditation || 0,
                    signal: metrics.signal || 0,
                    bands: metrics.bands || null,
                }));
            },
        );

        this._port.on('data', (data) => this._parser.feed(data));
        this._port.on('error', (err) => console.error('Serial error:', err.message));
        console.log(`TGAM serial opened: ${serialPort} @ 57600 baud`);
    }

    poll(numSamples) {
        return { Raw: this._rawBuffer.splice(0, Math.min(this._rawBuffer.length, numSamples)) };
    }

    close() {
        if (this._port && this._port.isOpen) this._port.close();
    }
}

// ── Real Muse 2 via BrainFlow ──────────────────────

class Muse2BrainFlow {
    constructor(serialPort) {
        const { BoardShim, BoardIds, LogLevels } = require('brainflow');
        BoardShim.setLogLevel(LogLevels.LEVEL_WARN);

        const boardId = BoardIds.MUSE_2_BOARD;
        const params = {};
        if (serialPort) params.serialPort = serialPort;

        this.board = new BoardShim(boardId, params);
        this.board.prepareSession();

        this.samplingRate = BoardShim.getSamplingRate(boardId);
        this.eegChannels = BoardShim.getEegChannels(boardId);
        this.channels = BoardShim.getEegNames(boardId);
    }

    startStream() { this.board.startStream(); }

    poll() {
        const data = this.board.getCurrentBoardData(this.samplingRate);
        if (data.length === 0 || data[0].length === 0) return null;
        const eegData = {};
        this.eegChannels.forEach((ch, i) => {
            eegData[this.channels[i] || `ch${ch}`] = data[ch];
        });
        return eegData;
    }

    close() {
        this.board.stopStream();
        this.board.releaseSession();
    }
}

// ── CLI args ───────────────────────────────────────

function parseArgs() {
    const args = process.argv.slice(2);

    if (args.includes('--relay')) return { mode: 'relay' };

    let profile = process.env.EEG_PROFILE || 'muse2';
    if (args.includes('--tgam')) profile = 'tgam';
    else if (args.includes('--muse2')) profile = 'muse2';
    const profileArg = args.find((_, i) => args[i - 1] === '--profile');
    if (profileArg && PROFILES[profileArg]) profile = profileArg;

    const serialPort = args.find((_, i) => args[i - 1] === '--serial')
        || process.env.EEG_SERIAL_PORT || '';
    const relayUrl = args.find((_, i) => args[i - 1] === '--relay-url')
        || process.env.EEG_RELAY_URL || '';

    return { mode: 'device', profile, serialPort, relayUrl };
}

// ── Static file server ─────────────────────────────

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

function serveStatic(req, res) {
    let filePath;
    if (req.url === '/' || req.url === '/index.html') {
        filePath = path.join(__dirname, 'index.html');
    } else if (req.url.startsWith('/mesa/') || req.url.startsWith('/shared/')) {
        filePath = path.join(__dirname, '..', req.url);
    } else {
        res.writeHead(404); res.end(); return;
    }
    try {
        const ext = path.extname(filePath);
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
        res.end(fs.readFileSync(filePath));
    } catch {
        res.writeHead(404); res.end();
    }
}

// ── Relay mode ─────────────────────────────────────

async function runRelay() {
    const registry = new Map();
    const server = http.createServer(serveStatic);
    const wss = new WebSocketServer({ server });

    wss.on('connection', (ws) => {
        registry.forEach(entry => ws.send(JSON.stringify(entry.info)));
        let clientSourceId = null;
        ws.on('message', (raw) => {
            let msg;
            try { msg = JSON.parse(raw); } catch { return; }
            if (msg.type === 'info' && msg.sourceId) {
                clientSourceId = msg.sourceId;
                registry.set(msg.sourceId, { ws, info: msg });
            }
            wss.clients.forEach(client => {
                if (client !== ws && client.readyState === 1) client.send(raw.toString());
            });
        });
        ws.on('close', () => {
            if (clientSourceId) {
                registry.delete(clientSourceId);
                wss.clients.forEach(client => {
                    if (client.readyState === 1) {
                        client.send(JSON.stringify({ type: 'source_leave', sourceId: clientSourceId }));
                    }
                });
            }
        });
    });

    server.listen(PORT, () => console.log(`Relay: http://localhost:${PORT}`));
    const shutdown = () => { wss.close(); server.close(); process.exit(0); };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
}

// ── Device mode ────────────────────────────────────

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function runDevice(opts) {
    const { profile: profileName, serialPort, relayUrl } = opts;
    const profile = PROFILES[profileName];
    const sourceId = crypto.randomBytes(4).toString('hex');

    let source = null;     // real hardware source
    let synthetic = null;  // synthetic fallback
    let samplingRate = profile.samplingRate;
    let channels = profile.channels;

    console.log(`Profile: ${profile.name} (${profileName})`);

    // Try real hardware, fall back to synthetic
    if (profileName === 'muse2') {
        if (serialPort || true) { // always attempt BLE connect
            try {
                source = new Muse2BrainFlow(serialPort);
                samplingRate = source.samplingRate;
                channels = source.channels;
                console.log('Muse 2 connected.');
            } catch (err) {
                console.log(`Muse not found (${err.message || err})`);
                console.log('Using Muse 2 synthetic data.\n');
                source = null;
            }
        }
        if (!source) synthetic = new Muse2Synthetic();
    } else if (profileName === 'tgam') {
        // Real serial or synthetic — decided after server starts (needs broadcast)
    }

    console.log(`Sampling rate: ${samplingRate} Hz`);
    console.log(`Channels: ${channels.join(', ')}`);

    const server = http.createServer(serveStatic);
    const wss = new WebSocketServer({ server });

    const infoMsg = {
        type: 'info', sourceId, profile: profileName,
        board: profile.name + (source ? '' : ' (synthetic)'),
        samplingRate, channels, bands: profile.bands,
    };

    wss.on('connection', (ws) => {
        console.log('Browser connected');
        ws.send(JSON.stringify(infoMsg));
        ws.on('close', () => console.log('Browser disconnected'));
    });

    server.listen(PORT, () => console.log(`Web UI: http://localhost:${PORT}`));

    let relayWs = null;
    function connectRelay() {
        if (!relayUrl) return;
        try {
            relayWs = new WebSocket(relayUrl);
            relayWs.on('open', () => { relayWs.send(JSON.stringify(infoMsg)); });
            relayWs.on('close', () => { relayWs = null; setTimeout(connectRelay, 3000); });
            relayWs.on('error', () => { relayWs = null; });
        } catch { setTimeout(connectRelay, 3000); }
    }
    connectRelay();

    function broadcast(msg) {
        wss.clients.forEach(ws => { if (ws.readyState === 1) ws.send(msg); });
        if (relayWs && relayWs.readyState === 1) relayWs.send(msg);
    }

    // Initialize TGAM after broadcast is available
    if (profileName === 'tgam') {
        if (serialPort) {
            source = new TGAMSerial(serialPort, broadcast);
        } else {
            console.log('No serial port — using TGAM synthetic data');
            synthetic = new TGAMSynthetic();
        }
    }

    if (source && source.startStream) source.startStream();
    console.log('Streaming started.\n');

    let running = true;
    const shutdown = () => {
        if (!running) return;
        console.log('\nStopping...');
        running = false;
        if (source && source.close) source.close();
        if (relayWs) relayWs.close();
        console.log('Session released.');
        wss.close(); server.close(); process.exit(0);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    const startTime = Date.now();
    while (running) {
        if (SAMPLE_DURATION_SEC > 0 && (Date.now() - startTime) >= SAMPLE_DURATION_SEC * 1000) {
            shutdown(); break;
        }
        await sleep(POLL_INTERVAL_MS);

        // Poll from real hardware or synthetic
        const poller = source || synthetic;
        if (!poller) continue;

        const numSamples = Math.round(samplingRate * POLL_INTERVAL_MS / 1000);
        const eegData = poller.poll(numSamples);
        if (!eegData) continue;

        // Check if any channel has data
        const firstCh = Object.keys(eegData)[0];
        if (!firstCh || eegData[firstCh].length === 0) continue;

        broadcast(JSON.stringify({
            type: 'eeg', sourceId, profile: profileName,
            samples: eegData[firstCh].length, data: eegData,
        }));

        // TGAM metrics (synthetic only — real serial pushes via callback)
        if (synthetic && synthetic.getMetrics) {
            const metrics = synthetic.getMetrics();
            if (metrics) {
                broadcast(JSON.stringify({
                    type: 'metrics', sourceId, profile: profileName,
                    attention: metrics.attention, meditation: metrics.meditation,
                    signal: metrics.signal, bands: metrics.bands,
                }));
            }
        }
    }
}

const opts = parseArgs();
if (opts.mode === 'relay') {
    runRelay().catch(err => { console.error('Relay error:', err); process.exit(1); });
} else {
    runDevice(opts).catch(err => { console.error('Error:', err); process.exit(1); });
}
