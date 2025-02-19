import './style.css';
import { useEffect, useState } from "react";

export default function Pomodoro() {
    const [time, setTime] = useState(1500);
    const [running, setRunning] = useState(false);
    const [ws, setWs] = useState(null);

    // Persistent state for the session name
    const [sessionName, setSessionName] = useState('');

    // Temporary state for input field
    const [tempSessionName, setTempSessionName] = useState('');

    // Load initial timer values from localStorage or use default values
    const [pomodoroTime, setPomodoroTime] = useState(() => {
        const savedPomodoroTime = localStorage.getItem('pomodoroTime');
        return savedPomodoroTime ? Number(savedPomodoroTime) : 25;
    });

    const [shortBreakTime, setShortBreakTime] = useState(() => {
        const savedShortBreakTime = localStorage.getItem('shortBreakTime');
        return savedShortBreakTime ? Number(savedShortBreakTime) : 5;
    });

    const [longBreakTime, setLongBreakTime] = useState(() => {
        const savedLongBreakTime = localStorage.getItem('longBreakTime');
        return savedLongBreakTime ? Number(savedLongBreakTime) : 15;
    });

    // Audio setup for chime
    const [audio] = useState(new Audio('/chime.mp3'));

    const connectWebSocket = (encodedSessionName) => {
        const WS_URL = `wss://pomodoro-be.ytkacpersky.de/${encodedSessionName}`;

        const websocket = new WebSocket(WS_URL);
        setWs(websocket);

        websocket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            setTime(data.time);
            setRunning(data.running);
        };

        // Cleanup WebSocket connection on unmount or when sessionName changes
        return () => websocket.close();
    };

    useEffect(() => {
        // Get session name from URL query parameters only on first load
        const urlParams = new URLSearchParams(window.location.search);
        const querySessionName = urlParams.get('session') || localStorage.getItem('sessionName') || ''; // Use localStorage if no session parameter

        // Only set the sessionName if it's not already set
        if (sessionName === '') {
            setSessionName(querySessionName);
            setTempSessionName(querySessionName); // Set the initial value of the text field
        }
    }, []); // This effect runs only on component mount

    useEffect(() => {
        const encodedSessionName = sessionName.trim().length === 0 ? "" : sessionName.replace(/\s+/g, '_');
        // Initialize WebSocket only once
        const cleanupWebSocket = connectWebSocket(encodedSessionName);

        // Update the URL with the new session name
        if (sessionName.trim().length > 0) {
            window.history.pushState({}, '', `?session=${encodedSessionName}`);
        } else {
            window.history.pushState({}, '', window.location.pathname); // Remove session from URL if empty
        }

        // Cleanup WebSocket connection on unmount
        return cleanupWebSocket;
    }, [sessionName]); // Only reconnect if sessionName changes

    const sendAction = (action, newTime = null) => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ action, time: newTime }));
        }
    };

    const handleStartStop = () => {
        if (running) {
            sendAction("pause");
        } else {
            sendAction("start");
        }
    };

    // Save timer values to localStorage
    useEffect(() => {
        localStorage.setItem('pomodoroTime', pomodoroTime);
        localStorage.setItem('shortBreakTime', shortBreakTime);
        localStorage.setItem('longBreakTime', longBreakTime);
    }, [pomodoroTime, shortBreakTime, longBreakTime]);

    // Helper function to convert minutes to seconds
    const convertToSeconds = (minutes) => {
        return minutes * 60;
    };

    // Play chime when timer hits 0
    useEffect(() => {
        if (time === 0 && running) {
            audio.play();
        }
    }, [time, running, audio]);

    // Handle session name change button click or Enter press
    const handleSessionChange = () => {
        const newSessionName = tempSessionName.trim().length === 0 ? "" : tempSessionName.replace(/\s+/g, '_');
        setSessionName(newSessionName);
        localStorage.setItem('sessionName', newSessionName); // Save session name to localStorage
    };

    const handleKeyPress = (e) => {
        if (e.key === "Enter") {
            handleSessionChange();
        }
    };

    return (
        <div>
            <h1>Pomodoro Timer</h1>
            
            <div>
                <label>
                    Session Name (max 16 chars): 
                    <input
                        type="text"
                        maxLength="16"
                        value={tempSessionName}
                        onChange={(e) => setTempSessionName(e.target.value)} // Update temp session name on input change
                        onKeyPress={handleKeyPress} // Update session name on Enter key press
                        placeholder="Enter session name"
                    />
                </label>
                <button onClick={handleSessionChange}>Change Session</button>
            </div>

            <div>
                <button onClick={() => sendAction("set", convertToSeconds(pomodoroTime))}>Pomodoro</button>
                <button onClick={() => sendAction("set", convertToSeconds(shortBreakTime))}>Short Break</button>
                <button onClick={() => sendAction("set", convertToSeconds(longBreakTime))}>Long Break</button>
            </div>

            <div>
                <label>
                    Pomodoro Time (minutes): 
                    <input
                        type="number"
                        value={pomodoroTime}
                        onChange={(e) => setPomodoroTime(Number(e.target.value))}
                        min="1"
                    />
                </label>
                <br />
                <label>
                    Short Break Time (minutes): 
                    <input
                        type="number"
                        value={shortBreakTime}
                        onChange={(e) => setShortBreakTime(Number(e.target.value))}
                        min="1"
                    />
                </label>
                <br />
                <label>
                    Long Break Time (minutes): 
                    <input
                        type="number"
                        value={longBreakTime}
                        onChange={(e) => setLongBreakTime(Number(e.target.value))}
                        min="1"
                    />
                </label>
            </div>

            <h2>{Math.floor(time / 60)}:{String(time % 60).padStart(2, "0")}</h2>
            <button onClick={handleStartStop}>
                {running ? "Stop" : "Start"}
            </button>
            <button onClick={() => sendAction("reset")}>Reset</button>
        </div>
    );
}