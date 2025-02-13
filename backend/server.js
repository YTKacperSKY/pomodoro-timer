const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });

let timer = { time: 1500, running: false };
let interval = null;
let lastSetTime = 1500;  // Store the last set time

const broadcast = (data) => {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
};

wss.on('connection', (ws) => {
    console.log('🔗 New client connected');
    ws.send(JSON.stringify(timer));

    ws.on('message', (message) => {
        const data = JSON.parse(message);
        console.log(`📌 Action received: ${data.action}`, data.time ? `| Time: ${data.time}s` : '');

        if (data.action === 'start' && !timer.running) {
            timer.running = true;
            interval = setInterval(() => {
                if (timer.time > 0) {
                    timer.time--;
                    broadcast(timer);
                } else {
                    clearInterval(interval);
                    timer.running = false;
                    broadcast(timer);
                }
            }, 1000);
        } else if (data.action === 'pause') {
            timer.running = false;
            clearInterval(interval);
            interval = null;
            broadcast(timer);
        } else if (data.action === 'reset') {
            timer.time = lastSetTime;  // Reset to last set time
            timer.running = false;
            clearInterval(interval);
            interval = null;
            broadcast(timer);
        } else if (data.action === 'set' && data.time) {
            lastSetTime = data.time;  // Update last set time
            timer.time = data.time;
            timer.running = false;
            clearInterval(interval);
            interval = null;
            broadcast(timer);
        }
    });

    ws.on('close', () => {
        console.log('❌ Client disconnected');
    });
});