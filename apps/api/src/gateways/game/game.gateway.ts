import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards, Logger } from '@nestjs/common';
import { GameService } from './game.service';
import { SOCKET_EVENTS } from '@quiz/shared';
import type {
  RoomCreatePayload,
  PlayerJoinPayload,
  AnswerSubmitPayload,
} from '@quiz/shared';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/',
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(GameGateway.name);

  // Map: socketId -> { roomCode, playerId, isHost }
  private socketMeta = new Map<
    string,
    { roomCode?: string; playerId?: string; isHost?: boolean }
  >();

  constructor(private readonly gameService: GameService) {
    // Inject server so GameService can emit events
  }

  afterInit(server: Server) {
    this.gameService.setServer(server);
  }

  async handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    this.socketMeta.set(client.id, {});
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    const meta = this.socketMeta.get(client.id);
    if (meta?.roomCode && meta?.playerId && !meta?.isHost) {
      await this.gameService.handlePlayerLeave(
        this.server,
        meta.roomCode,
        meta.playerId,
        client,
      );
    }
    this.socketMeta.delete(client.id);
  }

  // ===== HOST EVENTS =====

  @SubscribeMessage(SOCKET_EVENTS.ROOM_CREATE)
  async handleRoomCreate(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: RoomCreatePayload & { hostId: string; sessionId: string },
  ) {
    try {
      const result = await this.gameService.createRoom(client, payload);
      this.socketMeta.set(client.id, {
        roomCode: result.roomCode,
        isHost: true,
      });
      client.emit(SOCKET_EVENTS.ROOM_STATE, result);
    } catch (err) {
      client.emit(SOCKET_EVENTS.ERROR, { message: err.message });
    }
  }

  @SubscribeMessage(SOCKET_EVENTS.ROOM_START)
  async handleRoomStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomCode: string; countdownDuration?: number },
  ) {
    try {
      await this.gameService.startGame(this.server, payload.roomCode, payload.countdownDuration);
    } catch (err) {
      client.emit(SOCKET_EVENTS.ERROR, { message: err.message });
    }
  }

  @SubscribeMessage(SOCKET_EVENTS.QUESTION_NEXT)
  async handleQuestionNext(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomCode: string },
  ) {
    try {
      await this.gameService.nextQuestion(this.server, payload.roomCode);
    } catch (err) {
      client.emit(SOCKET_EVENTS.ERROR, { message: err.message });
    }
  }

  @SubscribeMessage(SOCKET_EVENTS.QUESTION_SKIP)
  async handleQuestionSkip(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomCode: string },
  ) {
    try {
      await this.gameService.skipQuestion(this.server, payload.roomCode);
    } catch (err) {
      client.emit(SOCKET_EVENTS.ERROR, { message: err.message });
    }
  }

  @SubscribeMessage(SOCKET_EVENTS.ROOM_PAUSE)
  async handleRoomPause(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomCode: string },
  ) {
    try {
      await this.gameService.pauseGame(this.server, payload.roomCode);
    } catch (err) {
      client.emit(SOCKET_EVENTS.ERROR, { message: err.message });
    }
  }

  @SubscribeMessage(SOCKET_EVENTS.ROOM_RESUME)
  async handleRoomResume(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomCode: string },
  ) {
    try {
      await this.gameService.resumeGame(this.server, payload.roomCode);
    } catch (err) {
      client.emit(SOCKET_EVENTS.ERROR, { message: err.message });
    }
  }

  @SubscribeMessage(SOCKET_EVENTS.ROOM_END)
  async handleRoomEnd(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomCode: string },
  ) {
    try {
      await this.gameService.endGame(this.server, payload.roomCode);
    } catch (err) {
      client.emit(SOCKET_EVENTS.ERROR, { message: err.message });
    }
  }

  // ===== PLAYER EVENTS =====

  @SubscribeMessage(SOCKET_EVENTS.PLAYER_JOIN)
  async handlePlayerJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: PlayerJoinPayload,
  ) {
    try {
      const result = await this.gameService.playerJoin(this.server, client, payload);
      this.socketMeta.set(client.id, {
        roomCode: payload.roomCode,
        playerId: result.playerId,
        isHost: false,
      });
    } catch (err) {
      client.emit(SOCKET_EVENTS.ERROR, { message: err.message });
    }
  }

  @SubscribeMessage(SOCKET_EVENTS.ANSWER_SUBMIT)
  async handleAnswerSubmit(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: AnswerSubmitPayload,
  ) {
    try {
      const meta = this.socketMeta.get(client.id);
      if (!meta?.playerId) {
        client.emit(SOCKET_EVENTS.ERROR, { message: 'Not in a game' });
        return;
      }
      await this.gameService.submitAnswer(
        this.server,
        client,
        { ...payload, playerId: meta.playerId },
      );
    } catch (err) {
      client.emit(SOCKET_EVENTS.ERROR, { message: err.message });
    }
  }
}
