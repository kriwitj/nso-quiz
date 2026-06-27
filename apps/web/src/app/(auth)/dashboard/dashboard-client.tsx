'use client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { analyticsApi, quizApi, sessionApi } from '@/lib/api';
import { BookOpen, Play, Users, TrendingUp, Plus, ArrowRight, Trophy } from 'lucide-react';
import Link from 'next/link';
import { timeAgo } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface DashboardClientProps {
  userName: string;
}

interface QuizItem {
  id: string;
  title: string;
  updatedAt: string;
  _count?: {
    questions?: number;
    sessions?: number;
  };
}

interface QuizzesData {
  items: QuizItem[];
  total: number;
}

interface OverviewData {
  totalQuizzes: number;
  totalSessions: number;
  totalPlayers: number;
}

export function DashboardClient({ userName }: DashboardClientProps) {
  const router = useRouter();

  const { data: overview } = useQuery<OverviewData>({
    queryKey: ['analytics', 'overview'],
    queryFn: () => analyticsApi.overview().then((r) => r.data),
  });

  const { data: quizzes } = useQuery<QuizzesData>({
    queryKey: ['quizzes'],
    queryFn: () => quizApi.list().then((r) => r.data),
  });

  const startSession = useMutation({
    mutationFn: (quizId: string) => sessionApi.create(quizId),
    onSuccess: (res) => router.push(`/sessions/${res.data.id}/host`),
    onError: () => toast.error('Failed to start session'),
  });

  const stats = [
    {
      label: 'Total Quizzes',
      value: overview?.totalQuizzes ?? 0,
      icon: BookOpen,
      color: 'from-violet-500 to-purple-600',
    },
    {
      label: 'Sessions Run',
      value: overview?.totalSessions ?? 0,
      icon: Play,
      color: 'from-pink-500 to-rose-600',
    },
    {
      label: 'Total Players',
      value: overview?.totalPlayers ?? 0,
      icon: Users,
      color: 'from-cyan-500 to-blue-600',
    },
    {
      label: 'Active Now',
      value: 0,
      icon: TrendingUp,
      color: 'from-green-500 to-emerald-600',
    },
  ];

  const firstName = userName?.split(' ')[0] ?? 'there';

  return (
    <div className="space-y-8 max-w-7xl">
      {/* Greeting */}
      <div>
        <h1 className="font-display text-3xl font-bold">
          Welcome back, <span className="gradient-text">{firstName}</span> 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          Ready to quiz? Here is your activity at a glance.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="glass-card rounded-2xl p-5">
            <div
              className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-3`}
            >
              <s.icon className="w-5 h-5 text-white" />
            </div>
            <p className="font-display text-3xl font-bold">{s.value.toLocaleString()}</p>
            <p className="text-muted-foreground text-sm mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-4">
        <Link
          href="/quizzes/new"
          className="glass-card rounded-2xl p-6 flex items-center gap-4 hover:bg-white/5 transition-all group"
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Plus className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-semibold">Create New Quiz</p>
            <p className="text-muted-foreground text-sm">
              Build a quiz with multiple question types
            </p>
          </div>
          <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all" />
        </Link>

        <Link
          href="/sessions"
          className="glass-card rounded-2xl p-6 flex items-center gap-4 hover:bg-white/5 transition-all group"
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <p className="font-semibold">Session History</p>
            <p className="text-muted-foreground text-sm">
              Review past game results and analytics
            </p>
          </div>
          <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all" />
        </Link>
      </div>

      {/* Recent Quizzes */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-semibold">Recent Quizzes</h2>
          <Link
            href="/quizzes"
            className="text-sm text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors"
          >
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="space-y-3">
          {quizzes?.items?.slice(0, 5).map((quiz) => (
            <div
              key={quiz.id}
              className="glass-card rounded-xl p-4 flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-600/20 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-5 h-5 text-violet-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{quiz.title}</p>
                <p className="text-muted-foreground text-sm">
                  {quiz._count?.questions ?? 0} questions ·{' '}
                  {timeAgo(quiz.updatedAt)}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Link
                  href={`/quizzes/${quiz.id}/edit`}
                  className="px-3 py-1.5 rounded-lg glass text-sm hover:bg-white/10 transition-colors"
                >
                  Edit
                </Link>
                <button
                  onClick={() => startSession.mutate(quiz.id)}
                  disabled={startSession.isPending}
                  className="px-3 py-1.5 rounded-lg bg-violet-600/20 text-violet-400 border border-violet-500/30 text-sm hover:bg-violet-600/30 disabled:opacity-50 transition-colors"
                >
                  Host
                </button>
              </div>
            </div>
          ))}

          {!quizzes?.items?.length && (
            <div className="glass-card rounded-xl p-8 text-center">
              <BookOpen className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium">No quizzes yet</p>
              <p className="text-muted-foreground text-sm mb-4">
                Create your first quiz to get started
              </p>
              <Link
                href="/quizzes/new"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600/20 text-violet-400 border border-violet-500/30 text-sm hover:bg-violet-600/30 transition-colors"
              >
                <Plus className="w-4 h-4" /> Create Quiz
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
