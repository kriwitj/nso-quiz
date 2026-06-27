'use client';

import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { analyticsApi } from '@/lib/api';
import { BookOpen, Clock3, Users, Trophy } from 'lucide-react';

interface OverviewData {
  totalQuizzes: number;
  totalSessions: number;
  totalPlayers: number;
  recentSessions?: Array<{
    id: string;
    roomCode: string;
    createdAt: string;
    quiz: { title: string };
    _count: { playerSessions: number };
  }>;
}

interface QuizAnalyticsData {
  quizId: string;
  totalSessions: number;
  totalParticipants: number;
  averageScore: number;
  correctRate: number;
  questionStats: Array<{
    questionId: string;
    questionText: string;
    correctRate: number;
    averageResponseTimeMs: number;
    totalAnswers: number;
  }>;
}

export default function AnalyticsPage() {
  const searchParams = useSearchParams();
  const quizId = searchParams.get('quizId');

  const { data: overview } = useQuery<OverviewData>({
    queryKey: ['analytics', 'overview'],
    queryFn: () => analyticsApi.overview().then((res) => res.data),
  });

  const { data: quizAnalytics } = useQuery<QuizAnalyticsData>({
    queryKey: ['analytics', 'quiz', quizId],
    queryFn: () => analyticsApi.quiz(quizId as string).then((res) => res.data),
    enabled: Boolean(quizId),
  });

  const stats = [
    { label: 'Quizzes', value: overview?.totalQuizzes ?? 0, icon: BookOpen },
    { label: 'Sessions', value: overview?.totalSessions ?? 0, icon: Trophy },
    { label: 'Players', value: overview?.totalPlayers ?? 0, icon: Users },
    {
      label: 'Avg score',
      value: quizAnalytics ? quizAnalytics.averageScore.toLocaleString() : '-',
      icon: Clock3,
    },
  ];

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Analytics</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {quizId
            ? 'Quiz-level performance for the selected quiz.'
            : 'Overview of quiz activity across your sessions.'}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="glass-card rounded-2xl p-5">
            <stat.icon className="h-5 w-5 text-violet-300" />
            <p className="mt-3 text-sm text-muted-foreground">{stat.label}</p>
            <p className="mt-1 text-3xl font-semibold">{stat.value}</p>
          </div>
        ))}
      </div>

      {quizAnalytics ? (
        <div className="glass-card rounded-3xl p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-2xl font-semibold">Question Breakdown</h2>
            <span className="text-sm text-muted-foreground">
              {quizAnalytics.totalSessions} sessions • {quizAnalytics.totalParticipants} participants
            </span>
          </div>
          <div className="space-y-3">
            {quizAnalytics.questionStats.map((question, index) => (
              <div key={question.questionId} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      Question {index + 1}
                    </p>
                    <p className="mt-1 font-medium">{question.questionText}</p>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <p>{Math.round(question.correctRate * 100)}% correct</p>
                    <p>{(question.averageResponseTimeMs / 1000).toFixed(1)}s average</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="glass-card rounded-3xl p-6">
          <h2 className="font-display text-2xl font-semibold">Recent Sessions</h2>
          <div className="mt-4 space-y-3">
            {overview?.recentSessions?.length ? (
              overview.recentSessions.map((session) => (
                <div key={session.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{session.quiz.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">Room {session.roomCode}</p>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <p>{session._count.playerSessions} players</p>
                      <p>{new Date(session.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No analytics data yet.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

