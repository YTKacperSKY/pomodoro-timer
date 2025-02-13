import './style.css';
import { useEffect, useState } from "react";

const WS_URL = "ws://localhost:8080";

export default function Pomodoro() {
    const [time, setTime] = useState(1500);
    const [running, setRunning] = useState(false);
    const [ws, setWs] = useState(null);

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

    useEffect(() => {
        const websocket = new WebSocket(WS_URL);
        setWs(websocket);

        websocket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            setTime(data.time);
            setRunning(data.running);
        };

        // Cleanup WebSocket connection on unmount
        return () => {
            websocket.close();
        };
    }, []); // Empty array ensures this effect runs only once (on mount)

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

    // Save the updated timer values to localStorage when they change
    useEffect(() => {
        localStorage.setItem('pomodoroTime', pomodoroTime);
        localStorage.setItem('shortBreakTime', shortBreakTime);
        localStorage.setItem('longBreakTime', longBreakTime);
    }, [pomodoroTime, shortBreakTime, longBreakTime]);

    // Helper function to convert minutes to seconds
    const convertToSeconds = (minutes) => {
        return minutes * 60;
    };

    return (
        <div>
            <h1>Pomodoro Timer</h1>
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