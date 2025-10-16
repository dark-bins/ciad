import { Server as HttpServer } from "http";
import { Server as IOServer, Socket, ServerOptions } from "socket.io";
import env from "../config/env";
import { CommandExecution } from "../types/command";
import { logger } from "../core/logger";

export class SocketGateway {
  private io: IOServer;

  constructor(server: HttpServer) {
    const options: Partial<ServerOptions> = {};
    if (env.CORS_ORIGIN) {
      options.cors = {
        origin: env.CORS_ORIGIN.split(",").map((item) => item.trim()),
        credentials: true,
      };
    }

    this.io = new IOServer(server, options);

    this.io.on("connection", (socket) => this.handleConnection(socket));
  }

  private handleConnection(socket: Socket) {
    logger.info("Socket conectado", { socketId: socket.id });

    socket.on("join-session", ({ sessionId }: { sessionId: string }) => {
      if (!sessionId) {
        return;
      }
      socket.join(sessionId);
      logger.debug("Socket unido a la sesion", { sessionId, socketId: socket.id });
    });

    socket.on("disconnect", () => {
      logger.info("Socket desconectado", { socketId: socket.id });
    });
  }

  emitCommandExecution(execution: CommandExecution) {
    this.io.to(execution.sessionId).emit("command-result", execution);
  }
}

export const createSocketGateway = (server: HttpServer) => new SocketGateway(server);
