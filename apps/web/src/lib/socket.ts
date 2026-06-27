import { io, Socket } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000';
// When deployed under a basePath (e.g. /nso-quiz), Traefik strips that prefix
// before forwarding to the API container, so the socket.io server sits at /socket.io.
// The client must use <basePath>/socket.io as the path so Traefik can route it.
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
const SOCKET_PATH = BASE_PATH ? `${BASE_PATH}/socket.io` : '/socket.io';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket || !socket.connected) {
    socket = io(WS_URL, {
      path: SOCKET_PATH,
      autoConnect: false,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}

export function connectSocket(token?: string): Socket {
  const s = getSocket();
  if (token) {
    s.auth = { token };
  }
  if (!s.connected) {
    s.connect();
  }
  return s;
}

export function disconnectSocket() {
  if (socket?.connected) {
    socket.disconnect();
  }
  socket = null;
}

export { socket };
