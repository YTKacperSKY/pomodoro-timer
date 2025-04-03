# Synced Pomodoro Timer

The **Synced Pomodoro Timer** is a collaborative productivity tool that allows multiple users to join a shared session and synchronize their Pomodoro timers. It supports real-time updates, customizable presets, and session persistence.

![Frontend Screenshot](http://i.ytkacpersky.de/u/snhu0m.png)

## Features

- **Real-Time Synchronization**: Multiple users can join the same session and see timer updates in real-time.
- **Customizable Presets**: Adjust Pomodoro, short break, and long break durations to suit your workflow.
- **Session Persistence**: Automatically reconnect to the last session using local storage or URL parameters.

## Project Structure

- **Frontend**: A web-based interface built with HTML, Bootstrap, and JavaScript.
- **Backend**: A WebSocket server implemented in Node.js to handle real-time communication.
- **Dockerized Deployment**: Easily deployable using Docker and Docker Compose.

## Prerequisites

- [Docker](https://www.docker.com/) installed on your machine.

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/YTKacperSKY/pomodoro-timer.git
cd pomodoro-timer
```

### 2. Update the Backend URL in the Frontend Script

Edit the `script.js` file in the `pomodoro-frontend` directory to set the correct backend WebSocket URL:

```javascript
// filepath: pomodoro-frontend/script.js
// ...existing code...
ws = new WebSocket('wss://your-backend-url'); // Replace 'your-backend-url' with your backend's actual URL
// ...existing code...
```

### 3. Customize the Docker Compose Setup

Edit the `docker-compose.yml` file to match your domain and email setup:

```yaml
# filepath: docker-compose.yml
# ...existing code...
    environment:
      - VIRTUAL_HOST=your-frontend-domain
      - VIRTUAL_PORT=80
      - LETSENCRYPT_HOST=your-frontend-domain
      - LETSENCRYPT_EMAIL=your-email
# ...existing code...
    environment:
      - VIRTUAL_HOST=your-backend-domain
      - VIRTUAL_PORT=8080
      - LETSENCRYPT_HOST=your-backend-domain
      - LETSENCRYPT_EMAIL=your-email
# ...existing code...
```

### 4. Build and Start the Services

Use Docker Compose to build and start the frontend and backend services.

```bash
docker-compose up --build
```

This will:
- Build the frontend and backend Docker images.
- Start the services on the specified ports.

### 5. Access the Application

- **Frontend**: Open your browser and navigate to `https://your-frontend-domain`.
- **Backend**: The WebSocket server will be running at `wss://your-backend-domain`.

Alternatively, you are free to use my own timer at [https://pomodoro.ytkacpersky.de](https://pomodoro.ytkacpersky.de).

### 6. Stop the Services

To stop the services, run:

```bash
docker-compose down
```

## Development

### Frontend

The frontend code is located in the `pomodoro-frontend` directory. To make changes:
1. Navigate to the directory:
   ```bash
   cd pomodoro-frontend
   ```
2. Edit the `index.html` or `script.js` files as needed.
3. Rebuild the Docker image:
   ```bash
   docker-compose up --build frontend
   ```

### Backend

The backend code is located in the `backend` directory. To make changes:
1. Navigate to the directory:
   ```bash
   cd backend
   ```
2. Edit the `server.js` file as needed.
3. Rebuild the Docker image:
   ```bash
   docker-compose up --build backend
   ```

## Contributing

Contributions are welcome! Please fork the repository, create a feature branch, and submit a pull request.

## License

This project is licensed under the [MIT License](LICENSE).

## Acknowledgments

- [Bootstrap](https://getbootstrap.com/) for the frontend framework.
- [Node.js](https://nodejs.org/) for the backend runtime.
- [Docker](https://www.docker.com/) for containerized deployment.
