import { Injectable, Inject } from '@nestjs/common';
import { REDIS_CLIENT } from './redis.constants';
import type { Redis } from 'ioredis';
import { REDIS_KEYS, GAME_CONSTANTS } from '@quiz/shared';

@Injectable()
export class RedisService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  // ===== Room Operations =====
  async setRoom(code: string, data: Record<string, string>): Promise<void> {
    await this.redis.hset(REDIS_KEYS.room(code), data);
    await this.redis.expire(REDIS_KEYS.room(code), GAME_CONSTANTS.ROOM_TTL_SECONDS);
  }

  async getRoom(code: string): Promise<Record<string, string> | null> {
    const data = await this.redis.hgetall(REDIS_KEYS.room(code));
    return Object.keys(data).length ? data : null;
  }

  async updateRoomField(code: string, field: string, value: string): Promise<void> {
    await this.redis.hset(REDIS_KEYS.room(code), field, value);
    await this.redis.expire(REDIS_KEYS.room(code), GAME_CONSTANTS.ROOM_TTL_SECONDS);
  }

  async deleteRoom(code: string): Promise<void> {
    const keys = [
      REDIS_KEYS.room(code),
      REDIS_KEYS.roomPlayers(code),
      REDIS_KEYS.roomLeaderboard(code),
      REDIS_KEYS.roomQuestion(code),
      REDIS_KEYS.roomAnswers(code),
      REDIS_KEYS.roomTimer(code),
    ];
    await this.redis.del(...keys);
  }

  // ===== Player Operations =====
  async addPlayer(roomCode: string, playerId: string): Promise<void> {
    await this.redis.sadd(REDIS_KEYS.roomPlayers(roomCode), playerId);
    await this.redis.expire(REDIS_KEYS.roomPlayers(roomCode), GAME_CONSTANTS.ROOM_TTL_SECONDS);
  }

  async removePlayer(roomCode: string, playerId: string): Promise<void> {
    await this.redis.srem(REDIS_KEYS.roomPlayers(roomCode), playerId);
  }

  async getPlayers(roomCode: string): Promise<string[]> {
    return this.redis.smembers(REDIS_KEYS.roomPlayers(roomCode));
  }

  async getPlayerCount(roomCode: string): Promise<number> {
    return this.redis.scard(REDIS_KEYS.roomPlayers(roomCode));
  }

  // ===== Leaderboard Operations =====
  async updateLeaderboard(roomCode: string, playerId: string, score: number): Promise<void> {
    await this.redis.zadd(REDIS_KEYS.roomLeaderboard(roomCode), score, playerId);
    await this.redis.expire(
      REDIS_KEYS.roomLeaderboard(roomCode),
      GAME_CONSTANTS.ROOM_TTL_SECONDS,
    );
  }

  async getLeaderboard(
    roomCode: string,
    topN: number = GAME_CONSTANTS.LEADERBOARD_TOP_N,
  ): Promise<Array<{ playerId: string; score: number }>> {
    const results = await this.redis.zrevrangebyscore(
      REDIS_KEYS.roomLeaderboard(roomCode),
      '+inf',
      '-inf',
      'WITHSCORES',
      'LIMIT',
      0,
      topN,
    );
    const entries: Array<{ playerId: string; score: number }> = [];
    for (let i = 0; i < results.length; i += 2) {
      entries.push({ playerId: results[i], score: parseInt(results[i + 1]) });
    }
    return entries;
  }

  async getPlayerRank(roomCode: string, playerId: string): Promise<number> {
    const rank = await this.redis.zrevrank(REDIS_KEYS.roomLeaderboard(roomCode), playerId);
    return rank !== null ? rank + 1 : 0;
  }

  async getPlayerScore(roomCode: string, playerId: string): Promise<number> {
    const score = await this.redis.zscore(REDIS_KEYS.roomLeaderboard(roomCode), playerId);
    return score ? parseInt(score) : 0;
  }

  // ===== Question State =====
  async setCurrentQuestion(roomCode: string, questionJson: string): Promise<void> {
    await this.redis.set(REDIS_KEYS.roomQuestion(roomCode), questionJson, 'EX', 300);
  }

  async getCurrentQuestion(roomCode: string): Promise<string | null> {
    return this.redis.get(REDIS_KEYS.roomQuestion(roomCode));
  }

  // ===== Answer Tracking =====
  async recordAnswer(
    roomCode: string,
    playerId: string,
    answerJson: string,
  ): Promise<void> {
    await this.redis.hset(REDIS_KEYS.roomAnswers(roomCode), playerId, answerJson);
    await this.redis.expire(REDIS_KEYS.roomAnswers(roomCode), 300);
  }

  async getAnswer(roomCode: string, playerId: string): Promise<string | null> {
    return this.redis.hget(REDIS_KEYS.roomAnswers(roomCode), playerId);
  }

  async clearAnswers(roomCode: string): Promise<void> {
    await this.redis.del(REDIS_KEYS.roomAnswers(roomCode));
  }

  async getAnswers(roomCode: string): Promise<Record<string, string>> {
    return this.redis.hgetall(REDIS_KEYS.roomAnswers(roomCode));
  }

  async getAnswerCount(roomCode: string): Promise<number> {
    return this.redis.hlen(REDIS_KEYS.roomAnswers(roomCode));
  }

  // ===== Timer =====
  async setTimer(roomCode: string, expiryTimestamp: number): Promise<void> {
    await this.redis.set(
      REDIS_KEYS.roomTimer(roomCode),
      expiryTimestamp.toString(),
      'EX',
      300,
    );
  }

  async getTimer(roomCode: string): Promise<number | null> {
    const val = await this.redis.get(REDIS_KEYS.roomTimer(roomCode));
    return val ? parseInt(val) : null;
  }

  // ===== Generic =====
  async get(key: string): Promise<string | null> {
    return this.redis.get(key);
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.redis.set(key, value, 'EX', ttl);
    } else {
      await this.redis.set(key, value);
    }
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }
}
