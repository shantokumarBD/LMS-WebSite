import { io } from "socket.io-client";

const SOCKET_URL =
  import.meta.env.SERVER_URL ||
  import.meta.env.BACKEND_URL ||
  import.meta.env.VITE_SERVER_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  (import.meta.env.API_URL ? import.meta.env.API_URL.replace(/\/api\/v1\/?$/, "") : null) ||
  "http://localhost:4000";

export const socket = io(SOCKET_URL, {
  autoConnect: false, // Don't connect until we have a user
  withCredentials: true,
});
