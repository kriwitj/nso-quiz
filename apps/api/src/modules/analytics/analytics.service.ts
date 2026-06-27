import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(hostId: string) {
    const [totalQuizzes, totalSessions, recentSessions] = await Promise.all([
      this.prisma.quiz.count({ where: { hostId } }),
      this.prisma.gameSession.count({ where: { hostId } }),
      this.prisma.gameSession.findMany({
        where: { hostId },
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          quiz: { select: { title: true } },
          _count: { select: { playerSessions: true } },
        },
      }),
    ]);

    const totalPlayers = await this.prisma.playerSession.count({
      where: { session: { hostId } },
    });

    return { totalQuizzes, totalSessions, totalPlayers, recentSessions };
  }

  async getQuizAnalytics(quizId: string) {
    const sessions = await this.prisma.gameSession.findMany({
      where: { quizId, status: 'COMPLETED' },
      include: {
        playerSessions: {
          include: {
            answers: { include: { question: true, choice: true } },
          },
        },
      },
    });

    const totalSessions = sessions.length;
    const totalParticipants = sessions.reduce(
      (sum, s) => sum + s.playerSessions.length,
      0,
    );

    const allAnswers = sessions.flatMap((s) =>
      s.playerSessions.flatMap((ps) => ps.answers),
    );

    const correctAnswers = allAnswers.filter((a) => a.isCorrect).length;
    const correctRate = allAnswers.length > 0 ? correctAnswers / allAnswers.length : 0;

    const avgScore =
      totalParticipants > 0
        ? sessions.reduce(
            (sum, s) =>
              sum + s.playerSessions.reduce((ps, p) => ps + p.totalScore, 0),
            0,
          ) / totalParticipants
        : 0;

    // Per question stats
    const questions = await this.prisma.question.findMany({
      where: { quizId },
      include: { choices: true },
    });

    const questionStats = questions.map((q) => {
      const qAnswers = allAnswers.filter((a) => a.questionId === q.id);
      const qCorrect = qAnswers.filter((a) => a.isCorrect).length;
      const choiceDist: Record<string, number> = {};
      q.choices.forEach((c) => (choiceDist[c.id] = 0));
      qAnswers.forEach((a) => {
        if (a.choiceId) choiceDist[a.choiceId] = (choiceDist[a.choiceId] || 0) + 1;
      });
      const avgResponseTime =
        qAnswers.length > 0
          ? qAnswers.reduce((sum, a) => sum + a.responseTimeMs, 0) / qAnswers.length
          : 0;

      return {
        questionId: q.id,
        questionText: q.text,
        correctRate: qAnswers.length > 0 ? qCorrect / qAnswers.length : 0,
        averageResponseTimeMs: avgResponseTime,
        choiceDistribution: choiceDist,
        totalAnswers: qAnswers.length,
      };
    });

    return {
      quizId,
      totalSessions,
      totalParticipants,
      averageScore: Math.round(avgScore),
      correctRate: Math.round(correctRate * 100) / 100,
      questionStats,
    };
  }

  async getSessionAnalytics(sessionId: string) {
    return this.prisma.gameSession.findUnique({
      where: { id: sessionId },
      include: {
        quiz: { select: { title: true } },
        playerSessions: {
          include: { answers: true },
          orderBy: { totalScore: 'desc' },
        },
        leaderboard: { orderBy: { rank: 'asc' } },
      },
    });
  }
}
