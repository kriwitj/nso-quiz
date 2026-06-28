import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { SessionStatus, GameSession } from '@prisma/client';
import { GAME_CONSTANTS } from '@quiz/shared';

@Injectable()
export class SessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async create(quizId: string, hostId: string): Promise<GameSession> {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: { questions: true },
    });
    if (!quiz) throw new NotFoundException('Quiz not found');
    if (quiz.hostId !== hostId) throw new ForbiddenException('Access denied');
    if (quiz.questions.length === 0) {
      throw new BadRequestException('Quiz must have at least one question');
    }

    const roomCode = this.generateRoomCode();
    return this.prisma.gameSession.create({
      data: { quizId, hostId, roomCode, status: SessionStatus.PENDING },
    });
  }

  /** Find active (PENDING or ACTIVE) session for a quiz owned by hostId */
  async findActiveByQuiz(quizId: string, hostId: string) {
    return this.prisma.gameSession.findFirst({
      where: {
        quizId,
        hostId,
        status: { in: [SessionStatus.PENDING, SessionStatus.ACTIVE] },
      },
      include: { _count: { select: { playerSessions: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAll(hostId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [sessions, total] = await Promise.all([
      this.prisma.gameSession.findMany({
        where: { hostId },
        skip,
        take: limit,
        include: {
          quiz: { select: { id: true, title: true } },
          _count: { select: { playerSessions: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.gameSession.count({ where: { hostId } }),
    ]);
    return { items: sessions, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, hostId?: string) {
    const session = await this.prisma.gameSession.findUnique({
      where: { id },
      include: {
        quiz: {
          include: {
            questions: {
              include: { choices: { orderBy: { order: 'asc' } } },
              orderBy: { order: 'asc' },
            },
          },
        },
        playerSessions: {
          include: { answers: true },
          orderBy: { joinedAt: 'asc' },
        },
        leaderboard: { orderBy: { rank: 'asc' } },
      },
    });
    if (!session) throw new NotFoundException('Session not found');
    if (hostId && session.hostId !== hostId) throw new ForbiddenException('Access denied');
    return session;
  }

  /** Cancel a PENDING (WAITING) session — keeps record, kicks players */
  async cancel(id: string, hostId: string) {
    const session = await this.prisma.gameSession.findUnique({ where: { id } });
    if (!session) throw new NotFoundException('Session not found');
    if (session.hostId !== hostId) throw new ForbiddenException('Access denied');
    if (session.status !== SessionStatus.PENDING) {
      throw new BadRequestException('Only WAITING sessions can be cancelled');
    }

    await this.redis.deleteRoom(session.roomCode).catch(() => null);

    return this.prisma.gameSession.update({
      where: { id },
      data: { status: SessionStatus.CANCELLED, endedAt: new Date() },
    });
  }

  /** Abort a RUNNING (ACTIVE) session mid-game — saves current results */
  async abort(id: string, hostId: string) {
    const session = await this.prisma.gameSession.findUnique({ where: { id } });
    if (!session) throw new NotFoundException('Session not found');
    if (session.hostId !== hostId) throw new ForbiddenException('Access denied');
    if (session.status !== SessionStatus.ACTIVE) {
      throw new BadRequestException('Only RUNNING sessions can be aborted');
    }

    await this.redis.deleteRoom(session.roomCode).catch(() => null);

    return this.prisma.gameSession.update({
      where: { id },
      data: { status: SessionStatus.ABORTED, endedAt: new Date() },
    });
  }

  async end(id: string, hostId: string) {
    const session = await this.prisma.gameSession.findUnique({ where: { id } });
    if (!session) throw new NotFoundException('Session not found');
    if (session.hostId !== hostId) throw new ForbiddenException('Access denied');

    await this.redis.deleteRoom(session.roomCode).catch(() => null);

    return this.prisma.gameSession.update({
      where: { id },
      data: { status: SessionStatus.COMPLETED, endedAt: new Date() },
    });
  }

  async getResults(id: string, hostId?: string) {
    const session = await this.prisma.gameSession.findUnique({
      where: { id },
      include: {
        quiz: { select: { title: true } },
        playerSessions: {
          include: {
            answers: {
              include: {
                question: {
                  include: {
                    choices: { orderBy: { order: 'asc' } },
                  },
                },
                choice: true,
              },
            },
          },
          orderBy: { totalScore: 'desc' },
        },
        leaderboard: { orderBy: { rank: 'asc' } },
      },
    });
    if (!session) throw new NotFoundException('Session not found');
    if (hostId && session.hostId !== hostId) throw new ForbiddenException('Access denied');
    return session;
  }

  private generateRoomCode(): string {
    const chars = GAME_CONSTANTS.ROOM_CODE_CHARS;
    let code = '';
    for (let i = 0; i < GAME_CONSTANTS.ROOM_CODE_LENGTH; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }
}
