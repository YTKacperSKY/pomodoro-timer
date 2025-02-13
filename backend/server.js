const WebSocket = require('ws');
const { parse } = require('url');

const wss = new WebSocket.Server({ port: 8080 });

let sessions = {}; // Store timers for each session

const broadcast = (sessionId, data) => {
    // Create a new object without the `interval` property
    const dataToSend = { ...data };
    delete dataToSend.interval;  // Remove the `interval` property

    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN && client.sessionId === sessionId) {
            client.send(JSON.stringify(dataToSend));
        }
    });
};

wss.on('connection', (ws, req) => {
    const { pathname } = parse(req.url, true);
    const sessionId = pathname.slice(1) || "default";

    ws.sessionId = sessionId;

    // Initialize session if it doesn't exist
    if (!sessions[sessionId]) {
        sessions[sessionId] = { time: 1500, running: false, interval: null, lastSetTime: 1500 };
    }

    const session = sessions[sessionId];

    console.log(`🔗 Client connected to session: ${sessionId}`);
    broadcast(sessionId, session)

    ws.on('message', (message) => {
        const data = JSON.parse(message);
        console.log(`📌 [${sessionId}] Action: ${data.action}`, data.time ? `| Time: ${data.time}s` : '');

        if (data.action === 'start' && !session.running) {
            session.running = true;
            session.interval = setInterval(() => {
                if (session.time > 0) {
                    session.time--;
                    broadcast(sessionId, session);
                } else {
                    clearInterval(session.interval);
                    session.running = false;
                    broadcast(sessionId, session);
                }
            }, 1000);
        } else if (data.action === 'pause') {
            session.running = false;
            clearInterval(session.interval);
            broadcast(sessionId, session);
        } else if (data.action === 'reset') {
            session.time = session.lastSetTime;
            session.running = false;
            clearInterval(session.interval);
            broadcast(sessionId, session);
        } else if (data.action === 'set' && data.time) {
            session.time = data.time;
            session.lastSetTime = data.time; // Save last set time
            session.running = false;
            clearInterval(session.interval);
            broadcast(sessionId, session);
        }
    });

    ws.on('close', () => {
        console.log(`❌ Client disconnected from session: ${sessionId}`);
    });
});