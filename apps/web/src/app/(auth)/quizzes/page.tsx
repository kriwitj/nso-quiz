'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { quizApi, sessionApi } from '@/lib/api';
import { Plus, BookOpen, Play, Edit3, Copy, Trash2, BarChart3, Search } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { timeAgo } from '@/lib/utils';

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

export default function QuizzesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery<QuizzesData>({
    queryKey: ['quizzes'],
    queryFn: () => quizApi.list().then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => quizApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizzes'] });
      toast.success('Quiz deleted');
    },
    onError: () => toast.error('Failed to delete quiz'),
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => quizApi.duplicate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizzes'] });
      toast.success('Quiz duplicated');
    },
    onError: () => toast.error('Failed to duplicate quiz'),
  });

  const startSessionMutation = useMutation({
    mutationFn: (quizId: string) => sessionApi.create(quizId),
    onSuccess: (res) => router.push(`/sessions/${res.data.id}/host`),
    onError: () => toast.error('Failed to start session'),
  });

  const filteredQuizzes = data?.items?.filter((q) =>
    q.title.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">My Quizzes</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {data?.total ?? 0} quiz{data?.total !== 1 ? 'zes' : ''} total
          </p>
        </div>
        <Link
          href="/quizzes/new"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" /> New Quiz
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          placeholder="Search quizzes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-violet-500 outline-none transition-colors placeholder:text-muted-foreground"
        />
      </div>

      {/* Quiz List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="glass-card rounded-xl p-6 animate-pulse">
              <div className="h-5 bg-white/10 rounded w-1/3 mb-3" />
              <div className="h-4 bg-white/5 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredQuizzes?.map((quiz) => (
            <div
              key={quiz.id}
              className="glass-card rounded-xl p-5 flex items-center gap-4 group"
            >
              {/* Icon */}
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-600/20 border border-violet-500/20 flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-6 h-6 text-violet-400" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{quiz.title}</p>
                <p className="text-muted-foreground text-sm">
                  {quiz._count?.questions ?? 0} questions ·{' '}
                  {quiz._count?.sessions ?? 0} sessions ·{' '}
                  {timeAgo(quiz.updatedAt)}
                </p>
              </div>

              {/* Action buttons — visible on hover */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Link
                  href={`/analytics?quizId=${quiz.id}`}
                  className="p-2 rounded-lg glass hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
                  title="Analytics"
                >
                  <BarChart3 className="w-4 h-4" />
                </Link>
                <button
                  onClick={() => duplicateMutation.mutate(quiz.id)}
                  disabled={duplicateMutation.isPending}
                  className="p-2 rounded-lg glass hover:bg-white/10 text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
                  title="Duplicate"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <Link
                  href={`/quizzes/${quiz.id}/edit`}
                  className="p-2 rounded-lg glass hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
                  title="Edit"
                >
                  <Edit3 className="w-4 h-4" />
                </Link>
                <button
                  onClick={() => {
                    if (confirm(`Delete "${quiz.title}"? This cannot be undone.`)) {
                      deleteMutation.mutate(quiz.id);
                    }
                  }}
                  disabled={deleteMutation.isPending}
                  className="p-2 rounded-lg glass hover:bg-rose-500/20 text-muted-foreground hover:text-rose-400 disabled:opacity-50 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Host button */}
              <Link
                href={`/quizzes/${quiz.id}`}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600/20 text-violet-400 border border-violet-500/30 text-sm hover:bg-violet-600/30 flex-shrink-0 transition-colors"
              >
                <Play className="w-4 h-4" /> Host
              </Link>
            </div>
          ))}

          {/* Empty state */}
          {!filteredQuizzes?.length && !isLoading && (
            <div className="glass-card rounded-xl p-12 text-center">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="font-semibold text-lg">
                {search ? 'No quizzes match your search' : 'No quizzes yet'}
              </p>
              <p className="text-muted-foreground text-sm mt-1 mb-4">
                {search
                  ? 'Try a different search term'
                  : 'Create your first quiz to get started'}
              </p>
              {!search && (
                <Link
                  href="/quizzes/new"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-medium hover:opacity-90 transition-opacity"
                >
                  <Plus className="w-4 h-4" /> Create Quiz
                </Link>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
