const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api";
const socketUrl = import.meta.env.VITE_SOCKET_URL ?? "http://localhost:4000";

export const env = {
  apiBase,
  socketUrl,
};
