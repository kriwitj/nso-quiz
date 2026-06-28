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
    { label: 'ควิซทั้งหมด', value: overview?.totalQuizzes ?? 0, icon: BookOpen, iconBg: 'bg-nso-primary-fixed/30', iconColor: 'text-nso-primary' },
    { label: 'เซสชันทั้งหมด', value: overview?.totalSessions ?? 0, icon: Trophy, iconBg: 'bg-purple-100', iconColor: 'text-nso-secondary' },
    { label: 'ผู้เล่นทั้งหมด', value: overview?.totalPlayers ?? 0, icon: Users, iconBg: 'bg-teal-50', iconColor: 'text-nso-tertiary' },
    {
      label: 'คะแนนเฉลี่ย',
      value: quizAnalytics ? quizAnalytics.averageScore.toLocaleString() : '—',
      icon: Clock3,
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
    },
  ];

  return (
    <div className="max-w-6xl space-y-6 animate-slide-up">
      <div>
        <h1 className="text-2xl font-bold text-foreground">วิเคราะห์</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {quizId
            ? 'ผลการทดสอบของควิซที่เลือก'
            : 'ภาพรวมกิจกรรมควิซทั้งหมดในระบบ'}
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl border border-nso-outline-variant/30 shadow-card p-5">
            <div className={`w-10 h-10 rounded-xl ${stat.iconBg} flex items-center justify-center`}>
              <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
            </div>
            <p className="mt-4 text-sm text-muted-foreground">{stat.label}</p>
            <p className="mt-1 text-3xl font-bold text-foreground">{stat.value}</p>
          </div>
        ))}
      </div>

      {quizAnalytics ? (
        <div className="bg-white rounded-2xl border border-nso-outline-variant/30 shadow-card p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">รายละเอียดรายคำถาม</h2>
            <span className="text-sm text-muted-foreground">
              {quizAnalytics.totalSessions} เซสชัน · {quizAnalytics.totalParticipants} ผู้เข้าร่วม
            </span>
          </div>
          <div className="space-y-3">
            {quizAnalytics.questionStats.map((question, index) => {
              const pct = Math.round(question.correctRate * 100);
              return (
                <div key={question.questionId} className="rounded-xl border border-nso-outline-variant/30 bg-nso-surface p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                        คำถาม {index + 1}
                      </p>
                      <p className="font-medium text-foreground">{question.questionText}</p>
                    </div>
                    <div className="text-right text-sm text-muted-foreground flex-shrink-0">
                      <p className="font-semibold text-foreground">{pct}% ถูกต้อง</p>
                      <p>{(question.averageResponseTimeMs / 1000).toFixed(1)}s เฉลี่ย</p>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-nso-surface-container overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${pct >= 70 ? 'bg-nso-tertiary' : pct >= 40 ? 'bg-amber-500' : 'bg-destructive'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-nso-outline-variant/30 shadow-card p-6">
          <h2 className="text-lg font-bold text-foreground mb-5">เซสชันล่าสุด</h2>
          <div className="space-y-3">
            {overview?.recentSessions?.length ? (
              overview.recentSessions.map((session) => (
                <div key={session.id} className="rounded-xl border border-nso-outline-variant/30 bg-nso-surface p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">{session.quiz.title}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        รหัสห้อง: <span className="font-mono text-nso-primary">{session.roomCode}</span>
                      </p>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <p className="font-semibold text-foreground">{session._count.playerSessions} ผู้เล่น</p>
                      <p>{new Date(session.createdAt).toLocaleString('th-TH')}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">ยังไม่มีข้อมูลวิเคราะห์</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
