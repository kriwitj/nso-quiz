import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../../modules/prisma/prisma.service';
import { RedisService } from '../../modules/redis/redis.service';
import { LeaderboardService } from '../../modules/leaderboard/leaderboard.service';
import {
  SOCKET_EVENTS,
  GameState,
  type QuestionPayload,
  type PlayerJoinPayload,
  type RoomState,
} from '@quiz/shared';
import { SessionStatus } from '@prisma/client';

interface PlayerData {
  playerId: string;
  nickname: string;
  avatar: string;
  score: number;
  streak: number;
  socketId: string;
}

@Injectable()
export class GameService {
  private server: Server;
  private readonly logger = new Logger(GameService.name);
  private roomPlayers = new Map<string, Map<string, PlayerData>>();
  private questionTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly leaderboardService: LeaderboardService,
  ) {}

  setServer(server: Server) {
    this.server = server;
  }

  async createRoom(
    client: Socket,
    payload: { quizId: string; hostId: string; sessionId: string },
  ): Promise<RoomState> {
    const session = await this.prisma.gameSession.findUnique({
      where: { id: payload.sessionId },
      include: { quiz: { include: { questions: { include: { choices: true } } } } },
    });
    if (!session) throw new NotFoundException('Session not found');

    const roomCode = session.roomCode;
    const existingRoom = await this.redis.getRoom(roomCode);

    client.join(roomCode);
    client.join(`host:${roomCode}`);

    if (existingRoom) {
      return await this.buildRoomState(roomCode, existingRoom, await this.redis.getPlayerCount(roomCode));
    }

    await this.redis.setRoom(roomCode, {
      sessionId: session.id,
      quizId: session.quizId,
      hostId: payload.hostId,
      state: GameState.WAITING,
      currentQuestionIndex: '0',
      totalQuestions: session.quiz.questions.length.toString(),
      startedAt: session.startedAt?.toISOString() ?? '',
    });

    this.roomPlayers.set(roomCode, new Map());

    return {
      roomCode,
      sessionId: session.id,
      quizId: session.quizId,
      hostId: payload.hostId,
      state: GameState.WAITING,
      currentQuestionIndex: 0,
      totalQuestions: session.quiz.questions.length,
      playerCount: 0,
      startedAt: session.startedAt?.toISOString(),
    };
  }

  async playerJoin(
    server: Server,
    client: Socket,
    payload: PlayerJoinPayload,
  ): Promise<{ playerId: string }> {
    const room = await this.redis.getRoom(payload.roomCode);
    if (!room) throw new NotFoundException('Room not found');

    const isReconnect = Boolean(payload.playerId);
    if (room.state !== GameState.WAITING && !isReconnect) {
      throw new BadRequestException('Game already started');
    }

    let playerSession = payload.playerId
      ? await this.prisma.playerSession.findFirst({
          where: { id: payload.playerId, sessionId: room.sessionId },
        })
      : null;

    if (!playerSession && payload.playerId && room.state !== GameState.WAITING) {
      throw new BadRequestException('Unable to resume this player session');
    }

    if (!playerSession) {
      playerSession = await this.prisma.playerSession.create({
        data: {
          sessionId: room.sessionId,
          nickname: payload.nickname,
          avatar: payload.avatar,
        },
      });
    } else {
      playerSession = await this.prisma.playerSession.update({
        where: { id: playerSession.id },
        data: { leftAt: null },
      });
    }

    await this.redis.addPlayer(payload.roomCode, playerSession.id);

    const players = this.roomPlayers.get(payload.roomCode) || new Map<string, PlayerData>();
    players.set(playerSession.id, {
      playerId: playerSession.id,
      nickname: playerSession.nickname,
      avatar: playerSession.avatar,
      score: playerSession.totalScore,
      streak: playerSession.streak,
      socketId: client.id,
    });
    this.roomPlayers.set(payload.roomCode, players);

    client.join(payload.roomCode);

    client.emit(SOCKET_EVENTS.PLAYER_JOINED, {
      playerId: playerSession.id,
      nickname: playerSession.nickname,
      avatar: playerSession.avatar,
      roomCode: payload.roomCode,
      ...(await this.buildPlayerSnapshot(payload.roomCode, playerSession.id)),
    });

    server.to(payload.roomCode).emit(SOCKET_EVENTS.ROOM_PLAYERS, {
      players: Array.from(players.values()),
      count: players.size,
    });

    await this.emitRoomState(server, payload.roomCode);
    return { playerId: playerSession.id };
  }

  async startGame(server: Server, roomCode: string, countdownDuration = 3) {
    const room = await this.redis.getRoom(roomCode);
    if (!room) throw new NotFoundException('Room not found');

    await this.redis.updateRoomField(roomCode, 'state', GameState.ACTIVE);
    await this.redis.updateRoomField(roomCode, 'startedAt', new Date().toISOString());
    await this.redis.updateRoomField(roomCode, 'countdownDuration', countdownDuration.toString());
    await this.prisma.gameSession.update({
      where: { id: room.sessionId },
      data: { status: SessionStatus.ACTIVE, startedAt: new Date() },
    });

    await this.emitRoomState(server, roomCode);
    setTimeout(() => this.showQuestion(server, roomCode, 0), countdownDuration * 1000);
  }

  async showQuestion(server: Server, roomCode: string, questionIndex: number) {
    const room = await this.redis.getRoom(roomCode);
    if (!room) return;

    const session = await this.prisma.gameSession.findUnique({
      where: { id: room.sessionId },
      include: {
        quiz: {
          include: {
            questions: {
              include: { choices: { orderBy: { order: 'asc' } } },
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });
    if (!session) return;

    const question = session.quiz.questions[questionIndex];
    if (!question) {
      await this.endGame(server, roomCode);
      return;
    }

    await this.redis.updateRoomField(roomCode, 'state', GameState.QUESTION_ACTIVE);
    await this.redis.updateRoomField(roomCode, 'currentQuestionIndex', questionIndex.toString());
    await this.redis.clearAnswers(roomCode);

    const payload: QuestionPayload = {
      id: question.id,
      type: question.type as any,
      text: question.text,
      imageUrl: question.imageUrl || undefined,
      timeLimit: question.timeLimit,
      points: question.points,
      questionIndex,
      totalQuestions: session.quiz.questions.length,
      choices: question.choices.map((choice) => ({
        id: choice.id,
        text: choice.text,
        imageUrl: choice.imageUrl || undefined,
      })),
    };

    await this.redis.setCurrentQuestion(
      roomCode,
      JSON.stringify({
        ...payload,
        correctChoices: question.choices.filter((choice) => choice.isCorrect).map((choice) => choice.id),
      }),
    );

    const expiryTimestamp = Date.now() + question.timeLimit * 1000;
    await this.redis.setTimer(roomCode, expiryTimestamp);
    // Clear any stale pausedAt so resume doesn't miscalculate
    await this.redis.updateRoomField(roomCode, 'pausedAt', '');

    await this.emitRoomState(server, roomCode);
    server.to(roomCode).emit(SOCKET_EVENTS.QUESTION_SHOW, { ...payload, serverTime: Date.now() });

    const timer = setTimeout(() => this.endQuestion(server, roomCode), question.timeLimit * 1000 + 500);
    this.questionTimers.set(roomCode, timer);
  }
  async submitAnswer(
    server: Server,
    client: Socket,
    payload: {
      roomCode: string;
      questionId: string;
      choiceId: string;
      playerId: string;
      submittedAt: number;
    },
  ) {
    const room = await this.redis.getRoom(payload.roomCode);
    if (!room || room.state !== GameState.QUESTION_ACTIVE) return;

    const existing = await this.redis.getAnswer(payload.roomCode, payload.playerId);
    if (existing) return;

    const questionJson = await this.redis.getCurrentQuestion(payload.roomCode);
    if (!questionJson) return;
    const question = JSON.parse(questionJson);

    const timerExpiry = await this.redis.getTimer(payload.roomCode);
    const now = payload.submittedAt || Date.now();
    const timeRemainingMs = timerExpiry ? Math.max(0, timerExpiry - now) : 0;
    const timeLimitMs = question.timeLimit * 1000;
    const responseTimeMs = timeLimitMs - timeRemainingMs;
    const isCorrect = (question.correctChoices || []).includes(payload.choiceId);

    const playerRecord = await this.prisma.playerSession.findUnique({
      where: { id: payload.playerId },
      select: { totalScore: true, streak: true, maxStreak: true },
    });
    if (!playerRecord) return;

    const currentStreak = isCorrect ? playerRecord.streak + 1 : 0;
    const points = this.leaderboardService.calculateScore(
      isCorrect,
      timeRemainingMs,
      timeLimitMs,
      question.points,
      currentStreak,
    );
    const newScore = playerRecord.totalScore + points;

    await this.redis.updateLeaderboard(payload.roomCode, payload.playerId, newScore);
    await this.redis.recordAnswer(
      payload.roomCode,
      payload.playerId,
      JSON.stringify({
        choiceId: payload.choiceId,
        isCorrect,
        points,
        responseTimeMs,
        correctChoiceId: (question.correctChoices || [])[0] ?? '',
      }),
    );

    await this.prisma.playerAnswer.create({
      data: {
        playerSessionId: payload.playerId,
        questionId: payload.questionId,
        choiceId: payload.choiceId,
        isCorrect,
        pointsEarned: points,
        responseTimeMs,
      },
    });

    await this.prisma.playerSession.update({
      where: { id: payload.playerId },
      data: {
        totalScore: newScore,
        streak: currentStreak,
        maxStreak: { set: Math.max(currentStreak, playerRecord.maxStreak ?? 0) },
      },
    });

    const players = this.roomPlayers.get(payload.roomCode);
    const player = players?.get(payload.playerId);
    if (player) {
      player.score = newScore;
      player.streak = currentStreak;
    }

    client.emit(SOCKET_EVENTS.ANSWER_RESULT, {
      correct: isCorrect,
      points,
      totalScore: newScore,
      streak: currentStreak,
      correctChoiceId: (question.correctChoices || [])[0] ?? '',
      timeMs: responseTimeMs,
    });

    const answerCount = await this.redis.getAnswerCount(payload.roomCode);
    server.to(`host:${payload.roomCode}`).emit('answer:submitted', {
      answerCount,
    });

    await this.broadcastLeaderboard(server, payload.roomCode);
  }

  async endQuestion(server: Server, roomCode: string) {
    const timer = this.questionTimers.get(roomCode);
    if (timer) {
      clearTimeout(timer);
      this.questionTimers.delete(roomCode);
    }

    const answers = await this.redis.getAnswers(roomCode);
    const distribution: Record<string, number> = {};

    const questionJson = await this.redis.getCurrentQuestion(roomCode);
    const question = questionJson ? JSON.parse(questionJson) : null;

    if (question && question.choices) {
      question.choices.forEach((choice: any) => {
        distribution[choice.id] = 0;
      });
    }

    Object.values(answers).forEach((answerStr) => {
      try {
        const answer = JSON.parse(answerStr);
        if (answer && answer.choiceId) {
          distribution[answer.choiceId] = (distribution[answer.choiceId] || 0) + 1;
        }
      } catch (e) {
        // Ignore
      }
    });

    await this.redis.updateRoomField(roomCode, 'state', GameState.QUESTION_ENDED);

    await this.emitRoomState(server, roomCode);
    server.to(roomCode).emit(SOCKET_EVENTS.QUESTION_END, {
      correctChoiceIds: question?.correctChoices || [],
      questionId: question?.id,
      distribution,
    });

    await this.broadcastLeaderboard(server, roomCode);
  }

  async nextQuestion(server: Server, roomCode: string) {
    const room = await this.redis.getRoom(roomCode);
    if (!room) return;

    const nextIndex = parseInt(room.currentQuestionIndex || '0', 10) + 1;
    const total = parseInt(room.totalQuestions || '0', 10);

    if (nextIndex >= total) {
      await this.endGame(server, roomCode);
    } else {
      await this.showQuestion(server, roomCode, nextIndex);
    }
  }

  async skipQuestion(server: Server, roomCode: string) {
    await this.endQuestion(server, roomCode);
  }

  async pauseGame(server: Server, roomCode: string) {
    // Clear the auto-end timer so it doesn't fire while paused
    const timer = this.questionTimers.get(roomCode);
    if (timer) {
      clearTimeout(timer);
      this.questionTimers.delete(roomCode);
    }
    // Record exact moment of pause so resume can recalculate remaining time
    await this.redis.updateRoomField(roomCode, 'pausedAt', Date.now().toString());
    await this.redis.updateRoomField(roomCode, 'state', GameState.PAUSED);
    await this.emitRoomState(server, roomCode);
  }

  async resumeGame(server: Server, roomCode: string) {
    const room = await this.redis.getRoom(roomCode);
    if (!room) return;

    // Recalculate remaining time based on when the question was paused
    const expiryStr = await this.redis.getTimer(roomCode);
    const pausedAtStr = room['pausedAt'];
    if (expiryStr && pausedAtStr) {
      const pausedAt = parseInt(pausedAtStr, 10);
      const originalExpiry = parseInt(expiryStr.toString(), 10);
      const remainingAtPause = Math.max(0, originalExpiry - pausedAt);
      // Shift the expiry forward by how long we were paused
      const newExpiry = Date.now() + remainingAtPause;
      await this.redis.setTimer(roomCode, newExpiry);
      // Restart the auto-end timeout
      const newTimer = setTimeout(
        () => this.endQuestion(server, roomCode),
        remainingAtPause + 500,
      );
      this.questionTimers.set(roomCode, newTimer);
    }

    await this.redis.updateRoomField(roomCode, 'pausedAt', '');
    await this.redis.updateRoomField(roomCode, 'state', GameState.QUESTION_ACTIVE);
    // Notify clients with updated server time so they can resync their countdown
    const updatedExpiry = await this.redis.getTimer(roomCode);
    server.to(roomCode).emit('timer:sync', { expiryTimestamp: updatedExpiry });
    await this.emitRoomState(server, roomCode);
  }

  async endGame(server: Server, roomCode: string) {
    const room = await this.redis.getRoom(roomCode);
    if (!room) return;

    const timer = this.questionTimers.get(roomCode);
    if (timer) {
      clearTimeout(timer);
      this.questionTimers.delete(roomCode);
    }

    const leaderboard = await this.leaderboardService.getLiveLeaderboard(
      roomCode,
      await this.getPlayerIdentityMap(room.sessionId),
    );

    await this.leaderboardService.persistLeaderboard(room.sessionId, leaderboard);

    await this.prisma.gameSession.update({
      where: { id: room.sessionId },
      data: { status: SessionStatus.COMPLETED, endedAt: new Date() },
    });

    await Promise.all(
      leaderboard.map((entry) =>
        this.prisma.playerSession.update({
          where: { id: entry.playerId },
          data: { rank: entry.rank },
        }),
      ),
    );

    await this.redis.updateRoomField(roomCode, 'state', GameState.ENDED);
    await this.emitRoomState(server, roomCode);

    server.to(roomCode).emit(SOCKET_EVENTS.GAME_END, {
      leaderboard,
      sessionId: room.sessionId,
    });

    setTimeout(() => this.redis.deleteRoom(roomCode), 30000);
    this.roomPlayers.delete(roomCode);
  }

  async handlePlayerLeave(
    server: Server,
    roomCode: string,
    playerId: string,
    client: Socket,
  ) {
    await this.redis.removePlayer(roomCode, playerId);
    await this.prisma.playerSession
      .update({ where: { id: playerId }, data: { leftAt: new Date() } })
      .catch(() => null);

    const players = this.roomPlayers.get(roomCode);
    if (players) {
      players.delete(playerId);
      server.to(roomCode).emit(SOCKET_EVENTS.PLAYER_LEFT, { playerId });
      server.to(roomCode).emit(SOCKET_EVENTS.ROOM_PLAYERS, {
        players: Array.from(players.values()),
        count: players.size,
      });
    }

    await this.emitRoomState(server, roomCode);
  }
  private async buildRoomState(
    roomCode: string,
    room: Record<string, string>,
    playerCount: number,
  ): Promise<RoomState> {
    const timerExpiry = await this.redis.getTimer(roomCode);
    const pausedAtStr = room['pausedAt'];
    let timeRemainingMs = 0;
    if (timerExpiry && room.state === GameState.QUESTION_ACTIVE) {
      timeRemainingMs = Math.max(0, parseInt(timerExpiry.toString(), 10) - Date.now());
    } else if (timerExpiry && pausedAtStr) {
      timeRemainingMs = Math.max(0, parseInt(timerExpiry.toString(), 10) - parseInt(pausedAtStr, 10));
    }

    const answersCount = await this.redis.getAnswerCount(roomCode);

    return {
      roomCode,
      sessionId: room.sessionId,
      quizId: room.quizId,
      hostId: room.hostId,
      state: room.state as GameState,
      currentQuestionIndex: parseInt(room.currentQuestionIndex || '0', 10),
      totalQuestions: parseInt(room.totalQuestions || '0', 10),
      playerCount,
      startedAt: room.startedAt || undefined,
      countdownDuration: room.countdownDuration ? parseInt(room.countdownDuration, 10) : 3,
      serverTimeRemainingMs: timeRemainingMs,
      answersCount,
    };
  }

  private toPublicQuestion(question: Record<string, any>): QuestionPayload {
    return {
      id: question.id,
      type: question.type,
      text: question.text,
      imageUrl: question.imageUrl,
      timeLimit: question.timeLimit,
      points: question.points,
      questionIndex: question.questionIndex,
      totalQuestions: question.totalQuestions,
      choices: question.choices,
    };
  }

  private async buildPlayerSnapshot(roomCode: string, playerId: string) {
    const room = await this.redis.getRoom(roomCode);
    if (!room) return {};

    const questionJson = await this.redis.getCurrentQuestion(roomCode);
    const rawQuestion = questionJson ? JSON.parse(questionJson) : null;
    const answerJson = await this.redis.getAnswer(roomCode, playerId);
    const answer = answerJson ? JSON.parse(answerJson) : null;
    const playerSession = await this.prisma.playerSession.findUnique({
      where: { id: playerId },
      select: { totalScore: true, streak: true },
    });

    // Compute accurate remaining time for late reconnects
    const timerExpiry = await this.redis.getTimer(roomCode);
    const pausedAtStr = room['pausedAt'];
    let timeRemainingMs = 0;
    if (timerExpiry && room.state === GameState.QUESTION_ACTIVE) {
      timeRemainingMs = Math.max(0, parseInt(timerExpiry.toString(), 10) - Date.now());
    } else if (timerExpiry && pausedAtStr) {
      // Paused: remaining = expiry - pausedAt (frozen)
      timeRemainingMs = Math.max(0, parseInt(timerExpiry.toString(), 10) - parseInt(pausedAtStr, 10));
    }

    return {
      roomState: await this.buildRoomState(roomCode, room, await this.redis.getPlayerCount(roomCode)),
      currentQuestion: rawQuestion ? this.toPublicQuestion(rawQuestion) : null,
      leaderboard: await this.leaderboardService.getLiveLeaderboard(
        roomCode,
        await this.getPlayerIdentityMap(room.sessionId),
      ),
      hasAnswered: Boolean(answer),
      selectedChoiceId: answer?.choiceId ?? null,
      answerResult:
        answer && playerSession
          ? {
              correct: answer.isCorrect,
              points: answer.points,
              totalScore: playerSession.totalScore,
              streak: playerSession.streak,
              correctChoiceId: answer.correctChoiceId ?? '',
              timeMs: answer.responseTimeMs ?? 0,
            }
          : null,
      waitingPlayers: Array.from((this.roomPlayers.get(roomCode) || new Map()).values()),
      // Accurate server-side time remaining for reconnecting players
      serverTimeRemainingMs: timeRemainingMs,
      serverTime: Date.now(),
    };
  }

  private async getPlayerIdentityMap(sessionId: string) {
    const players = await this.prisma.playerSession.findMany({
      where: { sessionId },
      select: { id: true, nickname: true, avatar: true, streak: true },
    });

    return new Map(
      players.map((player) => [
        player.id,
        {
          nickname: player.nickname,
          avatar: player.avatar,
          streak: player.streak,
        },
      ]),
    );
  }

  private async emitRoomState(server: Server, roomCode: string) {
    const room = await this.redis.getRoom(roomCode);
    if (!room) return;

    server.to(roomCode).emit(
      SOCKET_EVENTS.ROOM_STATE,
      await this.buildRoomState(roomCode, room, await this.redis.getPlayerCount(roomCode)),
    );
  }

  private async broadcastLeaderboard(server: Server, roomCode: string) {
    const room = await this.redis.getRoom(roomCode);
    if (!room) return;

    const leaderboard = await this.leaderboardService.getLiveLeaderboard(
      roomCode,
      await this.getPlayerIdentityMap(room.sessionId),
    );

    server.to(roomCode).emit(SOCKET_EVENTS.LEADERBOARD_UPDATE, { leaderboard });
  }
}
