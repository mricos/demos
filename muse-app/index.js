const { BoardShim, BoardIds, LogLevels } = require('brainflow');
const http = require('http');
const { WebSocketServer } = require('ws');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.env.PORT || '3030', 10);
const SAMPLE_DURATION_SEC = parseInt(process.env.MUSE_SAMPLE_DURATION || '0', 10); // 0 = indefinite
const POLL_INTERVAL_MS = parseInt(process.env.MUSE_POLL_INTERVAL || '100', 10);

function parseArgs() {
    const args = process.argv.slice(2);
    const synthetic = args.includes('--synthetic') || process.env.MUSE_BOARD === 'SYNTHETIC_BOARD';
    const serialPort = args.find((_, i) => args[i - 1] === '--serial') || '';
    return { synthetic, serialPort };
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    const { synthetic, serialPort } = parseArgs();

    let boardId = synthetic ? BoardIds.SYNTHETIC_BOARD : BoardIds.MUSE_2_BOARD;
    const params = {};
    if (serialPort) params.serialPort = serialPort;

    BoardShim.setLogLevel(LogLevels.LEVEL_WARN);

    // Try Muse, fall back to synthetic if not found
    let board;
    if (!synthetic) {
        console.log('Attempting to connect to Muse 2...');
        try {
            board = new BoardShim(boardId, params);
            board.prepareSession();
            console.log('Muse 2 connected.');
        } catch (err) {
            console.log(`Muse not found (${err.message || err})`);
            console.log('Falling back to SYNTHETIC board.\n');
            boardId = BoardIds.SYNTHETIC_BOARD;
            board = null;
        }
    }

    if (!board) {
        board = new BoardShim(boardId, params);
        board.prepareSession();
    }

    const isSynthetic = boardId === BoardIds.SYNTHETIC_BOARD;
    const samplingRate = BoardShim.getSamplingRate(boardId);
    const eegChannels = BoardShim.getEegChannels(boardId);
    const eegNames = BoardShim.getEegNames(boardId);

    console.log(`Board: ${isSynthetic ? 'SYNTHETIC' : 'MUSE_2'}`);
    console.log(`Sampling rate: ${samplingRate} Hz`);
    console.log(`EEG channels: ${eegNames.join(', ')}`);

    // HTTP server for the web UI
    const server = http.createServer((req, res) => {
        if (req.url === '/' || req.url === '/index.html') {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(fs.readFileSync(path.join(__dirname, 'index.html')));
        } else {
            res.writeHead(404);
            res.end();
        }
    });

    // WebSocket server
    const wss = new WebSocketServer({ server });

    wss.on('connection', (ws) => {
        console.log('Browser connected');
        ws.send(JSON.stringify({
            type: 'info',
            board: isSynthetic ? 'SYNTHETIC' : 'MUSE_2',
            samplingRate,
            channels: eegNames.slice(0, eegChannels.length),
        }));
        ws.on('close', () => console.log('Browser disconnected'));
    });

    server.listen(PORT, () => {
        console.log(`Web UI: http://localhost:${PORT}`);
    });

    // Start streaming
    board.startStream();
    console.log('Streaming started.\n');

    let running = true;
    const shutdown = () => {
        if (!running) return;
        console.log('\nStopping...');
        running = false;
        board.stopStream();
        board.releaseSession();
        console.log('Session released.');
        wss.close();
        server.close();
        process.exit(0);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    const startTime = Date.now();
    while (running) {
        if (SAMPLE_DURATION_SEC > 0 && (Date.now() - startTime) >= SAMPLE_DURATION_SEC * 1000) {
            shutdown();
            break;
        }

        await sleep(POLL_INTERVAL_MS);

        const data = board.getCurrentBoardData(samplingRate);
        if (data.length === 0 || data[0].length === 0) continue;

        const numSamples = data[0].length;
        const eegData = {};
        eegChannels.forEach((ch, i) => {
            eegData[eegNames[i] || `ch${ch}`] = data[ch];
        });

        const msg = JSON.stringify({ type: 'eeg', samples: numSamples, data: eegData });
        wss.clients.forEach((ws) => {
            if (ws.readyState === 1) ws.send(msg);
        });
    }
}

main().catch(err => {
    console.error('Error:', err.message || err);
    process.exit(1);
});
