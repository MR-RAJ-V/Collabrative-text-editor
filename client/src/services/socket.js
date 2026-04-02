import { io } from 'socket.io-client';

const URL = import.meta.env.VITE_SOCKET_URL
  || (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:5000');

export const socket = io(URL, {
  autoConnect: false,
});

export const setSocketAuthToken = (token) => {
  socket.auth = token ? { token } : {};
};
