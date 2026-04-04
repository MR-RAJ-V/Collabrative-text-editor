import { io } from 'socket.io-client';
import { socketUrl } from '../config/appConfig';

export const socket = io(socketUrl, {
  autoConnect: false,
});

export const setSocketAuthToken = (token) => {
  socket.auth = token ? { token } : {};
};
