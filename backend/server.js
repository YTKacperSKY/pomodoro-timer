const WebSocket = require('ws');
const http = require('http');

const PORT = process.env.PORT || 8080;
const server = http.createServer();
const wss = new WebSocket.Server({ server });

const defaultPomodoro = 5 //25 * 60; // Default time in seconds
const defaultShortBreak = 5 * 60; // Default short break time in seconds
const defaultLongBreak = 15 * 60; // Default long break time in seconds
const defaultRunning = false; // Default running state

const sessions = new Map();


wss.on('connection', (ws, req) => {
    console.log('Client connected from', req.socket.remoteAddress);
    ws.remoteAddress = req.socket.remoteAddress;
    ws.sessionId = null;

    ws.on('message', (message) => {
        let data;
        try {
            data = JSON.parse(message);
        } catch (error) {
            sendError(ws, 'Invalid JSON format');
            return;
        }

        if (!data.type) {
            sendError(ws, 'Missing message type');
            return;
        }

        switch (data.type) {
            case 'joinSession':
                handleJoinSession(ws, data);
                break;
            case 'startTimer':
                handleStartTimer(ws);
                break;
            case 'pauseTimer':
                handlePauseTimer(ws);
                break;
            case 'resetTimer':
                handleResetTimer(ws);
                break;
            case 'setTime':
                handleSetTime(ws, data);
                break;
            case 'setPresets':
                handleSetPresets(ws, data);
                break;
            case 'leaveSession':
                handleLeaveSession(ws);
                break;
            case 'ping':
                handlePing(ws);
                break;
            default:
                sendError(ws, 'Unknown message type');
                break;
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected from', ws.remoteAddress);
        handleLeaveSession(ws);
    });
});

// --- HANDLER FUNCTIONS ---

function handleJoinSession(ws, data) {
    const sessionId = data.sessionId;
    if (!sessionId) {
        sendError(ws, 'No session name provided');
        return;
    }

    // Leave previous session, if present
    if (ws.sessionId && ws.sessionId !== sessionId) {
        handleLeaveSession(ws);
    }

    ws.sessionId = sessionId;

    if (!sessions.has(sessionId)) {
        sessions.set(sessionId, {
            sessionId,
            isRunning: defaultRunning,
            remainingTime: defaultPomodoro,
            initialTime: defaultPomodoro,
            presets: {
                pomodoro: defaultPomodoro,
                shortBreak: defaultShortBreak,
                longBreak: defaultLongBreak
            }
        });
    }

    const session = sessions.get(sessionId);
    sendTimerState(ws, session);
}

function handleStartTimer(ws) {
    withSession(ws, (session, sessionId) => {
        if(session.isRunning) {
            sendError(ws, 'Timer already running');
            return;
        }
    
        session.isRunning = true;
        broadcast(sessionId);
        session.interval = setInterval(() => {
            if ( session.remainingTime > 0) {
                session.remainingTime--;
            } else {
                clearInterval(session.interval);
                session.isRunning = false;
            }
            broadcast(sessionId);
        }, 1000);
    });    
}

function handlePauseTimer(ws) {
    withSession(ws, (session, sessionId) => {
        session.isRunning = false;
        clearInterval(session.interval);
        broadcast(sessionId);
    });
}

function handleResetTimer(ws) {
    withSession(ws, (session, sessionId) => {
        session.remainingTime = session.initialTime;
        session.isRunning = false;
        clearInterval(session.interval);
        broadcast(sessionId);
    });
}

function handleSetTime(ws, data) {
    withSession(ws, (session, sessionId) => {
        const inputTime = data.remainingTime;

        if (typeof inputTime === 'number') {
            session.remainingTime = inputTime;
            session.initialTime = inputTime;
            session.isRunning = false;
            clearInterval(session.interval);
            broadcast(sessionId);
        } else {
            sendError(ws, 'Input not a number');
        }
    });
}

function handleSetPresets(ws, data) {
    withSession(ws, (session, sessionId) => {
        const {pomodoro, shortBreak, longBreak} = data;

        if (typeof pomodoro === 'number' && typeof shortBreak === 'number' && typeof longBreak === 'number') {
            session.presets.pomodoro = pomodoro;
            session.presets.shortBreak = shortBreak;
            session.presets.longBreak = longBreak;
            broadcast(sessionId)
        } else {
            sendError(ws, 'Input not a number');
        }
    });
}

function handleLeaveSession(ws) {
    ws.sessionId = null;
}

function handlePing(ws) {
    ws.send(JSON.stringify({ type: 'pong' }));
}

function broadcast(sessionId) {
    if (!sessionId || !sessions.has(sessionId)) {
        return;
    }

    const session = sessions.get(sessionId);

    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN && client.sessionId === sessionId) {
            sendTimerState(client, session)
        }
    });
}

function sendTimerState(ws, session) {
    const sessionToSend = { ...session }
    delete sessionToSend.interval;
    ws.send(JSON.stringify({
        type: 'timer',
        timer: sessionToSend
    }))
}

function withSession(ws, handler) {
  const sessionId = ws.sessionId;
  if (!sessionId || !sessions.has(sessionId)) {
    sendError(ws, 'Session not found');
    return;
  }

  const session = sessions.get(sessionId);
  handler(session, sessionId);
}

function sendError(ws, message) {
    console.error('Error: %s by %s', message, ws.remoteAddress);
    ws.send(JSON.stringify({
        type: 'error',
        message
    }));
}

// start server
server.listen(PORT, () => {
    console.log(`WebSocket server running on ws://localhost:${PORT}`);
});