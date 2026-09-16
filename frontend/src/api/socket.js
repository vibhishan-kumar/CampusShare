import { io } from 'socket.io-client';

// Initialize Socket.IO connection
// In Vite development, requests to /socket.io are proxied to http://localhost:5000
const socket = io('/', {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  transports: ['websocket', 'polling'],
});

export default socket;
