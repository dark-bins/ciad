import { useCallback, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { env } from "../config/env";
import { http } from "../lib/http";
import { ChatMessage, CommandExecution, SessionState } from "../types";

type CommandResultHandler = (execution: CommandExecution) => void;

interface UseChatSessionOptions {
  onExecution?: CommandResultHandler;
}

const mapProviderMessages = (execution: CommandExecution): ChatMessage[] =>
  execution.result.messages.map((message) => ({
    id: `${execution.id}-${message.id ?? crypto.randomUUID()}`,
    author: message.author ?? "provider",
    body: message.body,
    attachments: message.attachments,
    meta: message.meta,
    timestamp: message.timestamp ?? execution.completedAt,
  }));

const flattenHistory = (history: CommandExecution[]): ChatMessage[] => {
  const messages: ChatMessage[] = [];

  for (const item of history) {
    messages.push({
      id: `${item.id}-user`,
      author: "user",
      body: item.payload.raw,
      timestamp: item.startedAt,
    });
    messages.push(...mapProviderMessages(item));
  }

  return messages;
};

export const useChatSession = ({ onExecution }: UseChatSessionOptions = {}) => {
  const [session, setSession] = useState<SessionState | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const connectSocket = useCallback(
    (sessionId: string) => {
      // WebSocket temporalmente deshabilitado - los comandos funcionan por HTTP
      console.log("WebSocket deshabilitado - usando HTTP para comandos");
      setError(null);

      /* WEBSOCKET DESHABILITADO TEMPORALMENTE
      if (socketRef.current) {
        socketRef.current.disconnect();
      }

      const socket = io(env.socketUrl, { transports: ["websocket"], autoConnect: true });

      socket.on("connect", () => {
        socket.emit("join-session", { sessionId });
        setError(null);
      });

      socket.on("connect_error", (cause) => {
        console.error("No se pudo conectar con Socket.IO", cause);
        setError("Problemas al conectar en tiempo real. Reintentando...");
      });

      socket.on("command-result", (execution: CommandExecution) => {
        setSession((prev) => (prev ? { ...prev, history: [...prev.history, execution] } : prev));
        setMessages((prev) => [...prev, ...mapProviderMessages(execution)]);
        onExecution?.(execution);
      });

      socketRef.current = socket;
      */
    },
    [onExecution],
  );

  const startSession = useCallback(
    async (userId: string) => {
      setLoading(true);
      setError(null);
      try {
        // Send userId - backend will prefer JWT token if available, fallback to body
        const { data } = await http.post("/sessions", { userId });
        const sessionData: SessionState = {
          sessionId: data.session.sessionId ?? data.session.id,
          userId: data.session.userId ?? userId,
          history: data.session.history ?? [],
        };
        setSession(sessionData);
        setMessages(flattenHistory(sessionData.history));
        connectSocket(sessionData.sessionId);
        return sessionData;
      } catch (cause) {
        console.error("Error creando la sesion de chat", cause);
        setError("No se pudo iniciar la sesion");
        throw cause;
      } finally {
        setLoading(false);
      }
    },
    [connectSocket],
  );

  const loadHistory = useCallback(async (sessionId: string) => {
    const { data } = await http.get(`/sessions/${sessionId}/history`);
    const history: CommandExecution[] = data.history ?? [];
    setSession((prev) => (prev ? { ...prev, history } : prev));
    setMessages(flattenHistory(history));
  }, []);

  const sendCommand = useCallback(
    async (input: string) => {
      if (!session) {
        throw new Error("No hay sesion activa");
      }

      const timestamp = new Date().toISOString();
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        author: "user",
        body: input,
        timestamp,
      };
      const pendingId = crypto.randomUUID();
      const pendingMessage: ChatMessage = {
        id: pendingId,
        author: "system",
        body: "Procesando consulta...",
        timestamp,
        meta: { status: "pending" },
      };

      setMessages((prev) => [...prev, userMessage, pendingMessage]);

      try {
        // Send userId - backend will prefer JWT token if available, fallback to body
        const { data } = await http.post<{ execution: CommandExecution }>("/commands", {
          sessionId: session.sessionId,
          userId: session.userId,
          input,
        });

        const execution = data.execution;
        setSession((prev) => (prev ? { ...prev, history: [...prev.history, execution] } : prev));

        // Eliminar mensaje pending y agregar respuesta del proveedor
        setMessages((prev) => [
          ...prev.filter((msg) => msg.id !== pendingId),
          ...mapProviderMessages(execution)
        ]);

        onExecution?.(execution);
      } catch (cause) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === pendingId
              ? {
                  ...msg,
                  body: "Ocurrio un error al procesar el comando.",
                  meta: { status: "error" },
                }
              : msg,
          ),
        );
        setError("No se pudo procesar el comando");
        throw cause;
      }
    },
    [session, onExecution],
  );

  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  return {
    session,
    messages,
    loading,
    error,
    startSession,
    loadHistory,
    sendCommand,
    setMessages,
  };
};

