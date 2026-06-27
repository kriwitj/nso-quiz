import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { GAME_CONSTANTS } from '@quiz/shared';
import { LeaderboardEntry } from '@quiz/shared';

@Injectable()
export class LeaderboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  calculateScore(
    isCorrect: boolean,
    timeRemainingMs: number,
    timeLimitMs: number,
    points: number,
    streak: number,
  ): number {
    if (!isCorrect) return 0;
    const timePercentage = Math.max(0, timeRemainingMs / timeLimitMs);
    const baseScore = Math.round(points * timePercentage);
    const streakBonus =
      streak >= GAME_CONSTANTS.STREAK_BONUS_THRESHOLD
        ? Math.round(
            baseScore *
              GAME_CONSTANTS.STREAK_BONUS_RATE *
              Math.min(streak - 2, GAME_CONSTANTS.MAX_STREAK_BONUS_MULTIPLIER),
          )
        : 0;
    return baseScore + streakBonus;
  }

  async getLiveLeaderboard(
    roomCode: string,
    playerMap: Map<string, { nickname: string; avatar: string; streak: number }>,
  ): Promise<LeaderboardEntry[]> {
    const entries = await this.redis.getLeaderboard(roomCode);
    return entries.map((entry, index) => {
      const player = playerMap.get(entry.playerId);
      return {
        rank: index + 1,
        playerId: entry.playerId,
        nickname: player?.nickname || 'Unknown',
        avatar: player?.avatar || 'default',
        score: entry.score,
        streak: player?.streak || 0,
      };
    });
  }

  async persistLeaderboard(
    sessionId: string,
    entries: LeaderboardEntry[],
  ): Promise<void> {
    await this.prisma.leaderboardEntry.deleteMany({ where: { sessionId } });
    await this.prisma.leaderboardEntry.createMany({
      data: entries.map((e) => ({
        sessionId,
        playerSessionId: e.playerId,
        nickname: e.nickname,
        avatar: e.avatar,
        totalScore: e.score,
        rank: e.rank,
      })),
    });
  }
}
