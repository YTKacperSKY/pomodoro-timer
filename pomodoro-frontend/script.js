// Initialize tooltips and bind audio unlock on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  const tooltipTriggerList = Array.from(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  tooltipTriggerList.forEach(tooltipTriggerEl => {
    new bootstrap.Tooltip(tooltipTriggerEl, {
      delay: { show: 500, hide: 0 }
    });
  });
  // Bind audio unlock on first user interaction
  document.addEventListener('click', unlockAudio, { once: true });
  document.addEventListener('keydown', unlockAudio, { once: true });
});

// WebSocket and timer variables
let ws;
let remaining = 0;
let isRunning = false;
let audioUnlocked = false;
let connectedSessionId = null;
let muteChime;

setInterval(() => {
    // check if ws is null, not open, or not connecting
    if (!ws || (ws.readyState !== WebSocket.OPEN && ws.readyState !== WebSocket.CONNECTING)) {
        initWebSocket();
        console.log('WebSocket timeout detected. Connection re-established...');
    }
}, 1000);

function initWebSocket() {
  ws = new WebSocket('wss://pomodoro-be.ytkacpersky.de');
  ws.onopen = () => {
    const autoSessionId = getSessionIdFromUrlOrStorage();
    if (autoSessionId) {
      document.getElementById('sessionId').value = autoSessionId;
      connect();
    }
    setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 5000);
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === 'timer') {
      remaining = msg.timer.remainingTime;
      isRunning = msg.timer.isRunning;
      connectedSessionId = msg.timer.sessionId;
      updateDisplay();

      const inputSessionId = document.getElementById('sessionId').value.trim();
      const joinButton = document.getElementById('joinSessionButton');
      if (msg.timer.sessionId === inputSessionId) {
        joinButton.disabled = true;
      } else {
        joinButton.disabled = false;
      }

      if (msg.timer.presets && !document.getElementById('presetsModal').classList.contains('show')) {
        document.getElementById('presetPomodoro').value = parseTimeToString(msg.timer.presets.pomodoro);
        document.getElementById('presetShortBreak').value = parseTimeToString(msg.timer.presets.shortBreak);
        document.getElementById('presetLongBreak').value = parseTimeToString(msg.timer.presets.longBreak);
      }

      highlightActivePreset(msg.timer.initialTime, msg.timer.presets);
    } else if (msg.type === 'error') {
      console.log(msg.message);
    }
  };

  ws.onclose = () => {
    document.getElementById('timer').textContent = '--:--';
  };
}

function parseTimeToString(seconds) {
  const minutes = seconds / 60;
  return (minutes % 1 === 0) ? minutes.toString() : minutes.toFixed(1);
}

function getSessionIdFromUrlOrStorage() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id') || localStorage.getItem('lastSessionId');
}

function connect() {
  if (ws?.readyState !== WebSocket.OPEN) {
    window.location.reload();
    return;
  }
  let sessionId = document.getElementById('sessionId').value.trim();
  if (!sessionId) {
    sessionId = getSessionIdFromUrlOrStorage();
    if (!sessionId) {
      return;
    }
    document.getElementById('sessionId').value = sessionId;
  }
  localStorage.setItem('lastSessionId', sessionId);
  ws.send(JSON.stringify({ type: 'joinSession', sessionId }));
  document.getElementById('controls').classList.remove('d-none');
  const newUrl = new URL(window.location);
  newUrl.searchParams.set('id', sessionId);
  window.history.replaceState({}, '', newUrl);
}

window.onload = initWebSocket;

function updateDisplay() {
  const minutes = Math.floor(remaining / 60).toString().padStart(2, '0');
  const seconds = (remaining % 60).toString().padStart(2, '0');
  document.getElementById('timer').textContent = `${minutes}:${seconds}`;
  
  // Update the tab title with the timer
  document.title = `[${minutes}:${seconds}] Pomodoro Timer`;

  if (remaining === 0 && isRunning) {
    const chime = new Audio('chime.mp3');
    chime.play();
  }
  const toggleBtn = document.getElementById('toggleButton');
  if (toggleBtn) {
    toggleBtn.textContent = isRunning ? 'Pause' : 'Start';
    toggleBtn.className = isRunning ? 'btn btn-outline-warning mb-3 me-1' : 'btn btn-outline-success mb-3 me-1';
  }
}

function startTimer() {
  ws.send(JSON.stringify({ type: 'startTimer' }));
}

function pauseTimer() {
  ws.send(JSON.stringify({ type: 'pauseTimer' }));
}

function resetTimer() {
  ws.send(JSON.stringify({ type: 'resetTimer' }));
}

function toggleTimer() {
  if (isRunning) {
    pauseTimer();
  } else {
    startTimer();
  }
}

function setTime() {
  const remainingTime = parseInt(document.getElementById('setTimeSeconds').value, 10);
  if (isNaN(remainingTime) || remainingTime <= 0) {
    alert('Enter a valid time in seconds.');
    return;
  }
  ws.send(JSON.stringify({ type: 'setTime', remainingTime }));
}

function setTimeFromPreset(type) {
  const inputIdMap = {
    pomodoro: 'presetPomodoro',
    shortBreak: 'presetShortBreak',
    longBreak: 'presetLongBreak'
  };
  const str = document.getElementById(inputIdMap[type])?.value;
  const remainingTime = parseStringToTime(str);
  if (remainingTime === null) {
    alert('Invalid time format in presets.');
    return;
  }
  ws.send(JSON.stringify({ type: 'setTime', remainingTime }));
}

function updatePresets() {
  const pomodoro = parseStringToTime(document.getElementById('presetPomodoro').value);
  const shortBreak = parseStringToTime(document.getElementById('presetShortBreak').value);
  const longBreak = parseStringToTime(document.getElementById('presetLongBreak').value);

  if (pomodoro === null || shortBreak === null || longBreak === null) {
    alert("All preset fields must be valid numbers.");
    return;
  }

  ws.send(JSON.stringify({
    type: "setPresets",
    pomodoro,
    shortBreak,
    longBreak
  }));
}

function parseStringToTime(str) {
  str = str.trim();
  const minutes = parseFloat(str);
  if (isNaN(minutes)) return null;
  return Math.round(minutes * 60);
}

function unlockAudio() {
  if (audioUnlocked) return;
  muteChime = new Audio('mutedChime.wav');
  muteChime.play().then(() => {
    audioUnlocked = true;
    document.getElementById('soundWarning').style.display = 'none';
  }).catch((err) => {
    console.warn('Audio not yet allowed:', err);
  });
}

function highlightActivePreset(remainingTime, presets) {
  const presetTimes = {
    pomodoro: presets.pomodoro,
    shortBreak: presets.shortBreak,
    longBreak: presets.longBreak
  };

  Object.keys(presetTimes).forEach(type => {
    const button = document.querySelector(`button[onclick="setTimeFromPreset('${type}')"]`);
    if (button) {
      const isActive = remainingTime === presetTimes[type];
      button.classList.toggle('btn-primary', isActive);
      button.classList.toggle('btn-outline-primary', !isActive);
    }
  });
}

// Modal focus handling to prevent aria-hidden warnings
const presetsModal = document.getElementById('presetsModal');
const gearButton = document.querySelector('[data-bs-target="#presetsModal"]');
presetsModal.addEventListener('hidden.bs.modal', () => {
  if (gearButton) {
    gearButton.focus();
  }
});

function textTypeOnSessionId() {
  if (event.key === 'Enter') {
    connect()
    return;
  }

  const inputSessionId = document.getElementById('sessionId').value.trim();
  const joinButton = document.getElementById('joinSessionButton');
  if (connectedSessionId === inputSessionId) {
    joinButton.disabled = true;
  } else {
    joinButton.disabled = false;
  }
};