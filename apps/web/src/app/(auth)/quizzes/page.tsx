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
  _count?: { questions?: number; sessions?: number };
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
      toast.success('ลบควิซแล้ว');
    },
    onError: () => toast.error('ไม่สามารถลบควิซได้'),
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => quizApi.duplicate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quizzes'] });
      toast.success('ทำสำเนาควิซแล้ว');
    },
    onError: () => toast.error('ไม่สามารถทำสำเนาได้'),
  });

  const startSessionMutation = useMutation({
    mutationFn: (quizId: string) => sessionApi.create(quizId),
    onSuccess: (res) => router.push(`/sessions/${res.data.id}/host`),
    onError: () => toast.error('ไม่สามารถเริ่มเซสชันได้'),
  });

  const filteredQuizzes = data?.items?.filter((q) =>
    q.title.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="max-w-5xl space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">ควิซของฉัน</h1>
          <p className="text-muted-foreground text-sm mt-1">
            ทั้งหมด {data?.total ?? 0} ควิซ
          </p>
        </div>
        <Link
          href="/quizzes/new"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-nso-primary text-white text-sm font-semibold hover:bg-nso-primary-container transition-colors shadow-primary"
        >
          <Plus className="w-4 h-4" /> สร้างควิซใหม่
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          placeholder="ค้นหาควิซ..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-nso-outline-variant/50 focus:border-nso-primary focus:ring-2 focus:ring-nso-primary/20 outline-none transition-all text-foreground placeholder:text-muted-foreground/60"
        />
      </div>

      {/* Quiz List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-nso-outline-variant/30 p-6 animate-pulse">
              <div className="h-5 bg-nso-surface-container rounded w-1/3 mb-3" />
              <div className="h-4 bg-nso-surface-low rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredQuizzes?.map((quiz) => (
            <div
              key={quiz.id}
              className="bg-white rounded-xl border border-nso-outline-variant/30 shadow-card p-5 flex items-center gap-4 group hover:shadow-card-hover transition-shadow"
            >
              <div className="w-12 h-12 rounded-xl bg-nso-primary-fixed/30 border border-nso-primary-fixed flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-6 h-6 text-nso-primary" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">{quiz.title}</p>
                <p className="text-muted-foreground text-sm mt-0.5">
                  {quiz._count?.questions ?? 0} คำถาม ·{' '}
                  {quiz._count?.sessions ?? 0} เซสชัน ·{' '}
                  {timeAgo(quiz.updatedAt)}
                </p>
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Link
                  href={`/analytics?quizId=${quiz.id}`}
                  className="p-2 rounded-lg text-muted-foreground hover:text-nso-primary hover:bg-nso-primary-fixed/20 transition-colors"
                  title="วิเคราะห์"
                >
                  <BarChart3 className="w-4 h-4" />
                </Link>
                <button
                  onClick={() => duplicateMutation.mutate(quiz.id)}
                  disabled={duplicateMutation.isPending}
                  className="p-2 rounded-lg text-muted-foreground hover:text-nso-primary hover:bg-nso-primary-fixed/20 disabled:opacity-50 transition-colors"
                  title="ทำสำเนา"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <Link
                  href={`/quizzes/${quiz.id}/edit`}
                  className="p-2 rounded-lg text-muted-foreground hover:text-nso-primary hover:bg-nso-primary-fixed/20 transition-colors"
                  title="แก้ไข"
                >
                  <Edit3 className="w-4 h-4" />
                </Link>
                <button
                  onClick={() => {
                    if (confirm(`ลบ "${quiz.title}"? ไม่สามารถย้อนกลับได้`)) {
                      deleteMutation.mutate(quiz.id);
                    }
                  }}
                  disabled={deleteMutation.isPending}
                  className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-50 transition-colors"
                  title="ลบ"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => startSessionMutation.mutate(quiz.id)}
                disabled={startSessionMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-nso-primary text-white text-sm font-semibold hover:bg-nso-primary-container disabled:opacity-50 flex-shrink-0 transition-colors"
              >
                <Play className="w-4 h-4" /> Host
              </button>
            </div>
          ))}

          {!filteredQuizzes?.length && !isLoading && (
            <div className="bg-white rounded-2xl border border-nso-outline-variant/30 shadow-card p-12 text-center">
              <div className="w-14 h-14 rounded-2xl bg-nso-primary-fixed/30 flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-7 h-7 text-nso-primary" />
              </div>
              <p className="font-bold text-lg text-foreground">
                {search ? 'ไม่พบควิซที่ค้นหา' : 'ยังไม่มีควิซ'}
              </p>
              <p className="text-muted-foreground text-sm mt-1 mb-5">
                {search ? 'ลองค้นหาด้วยคำอื่น' : 'สร้างควิซแรกของคุณเพื่อเริ่มต้น'}
              </p>
              {!search && (
                <Link
                  href="/quizzes/new"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-nso-primary text-white text-sm font-semibold hover:bg-nso-primary-container transition-colors"
                >
                  <Plus className="w-4 h-4" /> สร้างควิซ
                </Link>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
