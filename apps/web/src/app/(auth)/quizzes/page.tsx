'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { quizApi, sessionApi } from '@/lib/api';
import { Plus, BookOpen, Play, Edit3, Copy, Trash2, BarChart3, Search, X, AlertTriangle, RefreshCw, Users } from 'lucide-react';
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

interface ActiveSession {
  id: string;
  roomCode: string;
  status: 'PENDING' | 'ACTIVE';
  _count: { playerSessions: number };
}

type DialogState =
  | { type: 'waiting'; session: ActiveSession; quizId: string }
  | { type: 'running'; session: ActiveSession; quizId: string }
  | null;

export default function QuizzesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [checkingQuizId, setCheckingQuizId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);

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

  const createSessionMutation = useMutation({
    mutationFn: (quizId: string) => sessionApi.create(quizId),
    onSuccess: (res) => {
      setDialog(null);
      router.push(`/sessions/${res.data.id}/host`);
    },
    onError: () => toast.error('ไม่สามารถเริ่มเซสชันได้'),
  });

  const cancelSessionMutation = useMutation({
    mutationFn: (id: string) => sessionApi.cancel(id),
  });

  const abortSessionMutation = useMutation({
    mutationFn: (id: string) => sessionApi.abort(id),
  });

  /** Smart host: check for active session first, then decide */
  const handleHost = async (quizId: string) => {
    setCheckingQuizId(quizId);
    try {
      const res = await sessionApi.activeForQuiz(quizId);
      const active: ActiveSession | null = res.data;

      if (!active) {
        // No active session → create immediately
        createSessionMutation.mutate(quizId);
        return;
      }

      if (active.status === 'PENDING') {
        setDialog({ type: 'waiting', session: active, quizId });
      } else {
        setDialog({ type: 'running', session: active, quizId });
      }
    } catch {
      toast.error('ไม่สามารถตรวจสอบเซสชันได้');
    } finally {
      setCheckingQuizId(null);
    }
  };

  /** Resume existing session */
  const handleResume = () => {
    if (!dialog) return;
    router.push(`/sessions/${dialog.session.id}/host`);
    setDialog(null);
  };

  /** Cancel WAITING session → create new */
  const handleCancelAndCreate = async () => {
    if (!dialog) return;
    try {
      await cancelSessionMutation.mutateAsync(dialog.session.id);
      createSessionMutation.mutate(dialog.quizId);
    } catch {
      toast.error('ไม่สามารถยกเลิกเซสชันเดิมได้');
    }
  };

  /** Abort RUNNING session → create new */
  const handleAbortAndCreate = async () => {
    if (!dialog) return;
    try {
      await abortSessionMutation.mutateAsync(dialog.session.id);
      createSessionMutation.mutate(dialog.quizId);
    } catch {
      toast.error('ไม่สามารถยุติเซสชันได้');
    }
  };

  const filteredQuizzes = data?.items?.filter((q) =>
    q.title.toLowerCase().includes(search.toLowerCase()),
  );

  const isDialogPending =
    cancelSessionMutation.isPending ||
    abortSessionMutation.isPending ||
    createSessionMutation.isPending;

  return (
    <div className="max-w-5xl space-y-5 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">ควิซของฉัน</h1>
          <p className="text-muted-foreground text-sm mt-0.5">ทั้งหมด {data?.total ?? 0} ควิซ</p>
        </div>
        <Link
          href="/quizzes/new"
          className="flex items-center gap-1.5 px-3 md:px-4 py-2 md:py-2.5 rounded-xl bg-nso-primary text-white text-sm font-semibold hover:bg-nso-primary-container transition-colors shadow-primary flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">สร้างควิซใหม่</span>
          <span className="sm:hidden">ใหม่</span>
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
            <div key={i} className="bg-white rounded-xl border border-nso-outline-variant/30 p-5 animate-pulse">
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
              className="bg-white rounded-xl border border-nso-outline-variant/30 shadow-card p-4 md:p-5 hover:shadow-card-hover transition-shadow"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-nso-primary-fixed/30 border border-nso-primary-fixed flex items-center justify-center flex-shrink-0 mt-0.5">
                  <BookOpen className="w-5 h-5 text-nso-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate text-sm md:text-base">{quiz.title}</p>
                  <p className="text-muted-foreground text-xs md:text-sm mt-0.5">
                    {quiz._count?.questions ?? 0} คำถาม · {quiz._count?.sessions ?? 0} เซสชัน · {timeAgo(quiz.updatedAt)}
                  </p>
                </div>
                <button
                  onClick={() => handleHost(quiz.id)}
                  disabled={checkingQuizId === quiz.id || createSessionMutation.isPending}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-nso-primary text-white text-xs font-semibold hover:bg-nso-primary-container disabled:opacity-50 transition-colors"
                >
                  {checkingQuizId === quiz.id ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Play className="w-3.5 h-3.5" />
                  )}
                  <span className="hidden sm:inline">Host</span>
                </button>
              </div>

              <div className="mt-3 pt-3 border-t border-nso-outline-variant/20 flex items-center gap-1">
                <Link
                  href={`/analytics?quizId=${quiz.id}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-muted-foreground hover:text-nso-primary hover:bg-nso-primary-fixed/20 transition-colors text-xs font-medium"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">วิเคราะห์</span>
                </Link>
                <Link
                  href={`/quizzes/${quiz.id}/edit`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-muted-foreground hover:text-nso-primary hover:bg-nso-primary-fixed/20 transition-colors text-xs font-medium"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">แก้ไข</span>
                </Link>
                <button
                  onClick={() => duplicateMutation.mutate(quiz.id)}
                  disabled={duplicateMutation.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-muted-foreground hover:text-nso-primary hover:bg-nso-primary-fixed/20 disabled:opacity-50 transition-colors text-xs font-medium"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">ทำสำเนา</span>
                </button>
                <button
                  onClick={() => {
                    if (confirm(`ลบ "${quiz.title}"? ไม่สามารถย้อนกลับได้`)) {
                      deleteMutation.mutate(quiz.id);
                    }
                  }}
                  disabled={deleteMutation.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-50 transition-colors text-xs font-medium ml-auto"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">ลบ</span>
                </button>
              </div>
            </div>
          ))}

          {!filteredQuizzes?.length && !isLoading && (
            <div className="bg-white rounded-2xl border border-nso-outline-variant/30 shadow-card p-10 text-center">
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

      {/* Dialog overlay */}
      {dialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-nso-outline-variant/30 overflow-hidden">
            {dialog.type === 'waiting' && (
              <>
                <div className="flex items-start justify-between gap-3 p-6 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <h2 className="font-bold text-foreground text-base">มี Session ที่ยังไม่ได้เริ่ม</h2>
                      <p className="text-muted-foreground text-sm">คุณต้องการทำอะไรกับ Session นี้?</p>
                    </div>
                  </div>
                  <button onClick={() => setDialog(null)} className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Session info */}
                <div className="mx-6 mb-5 rounded-xl bg-nso-surface border border-nso-outline-variant/30 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">PIN ห้อง</p>
                      <p className="font-mono font-extrabold text-2xl text-nso-primary tracking-widest">
                        {dialog.session.roomCode}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground mb-1">ผู้เล่นในห้อง</p>
                      <p className="font-bold text-lg text-foreground flex items-center gap-1 justify-end">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        {dialog.session._count.playerSessions} คน
                      </p>
                    </div>
                  </div>
                </div>

                <div className="px-6 pb-6 space-y-2">
                  <button
                    onClick={handleResume}
                    disabled={isDialogPending}
                    className="w-full py-3 rounded-xl bg-nso-primary text-white font-bold text-sm hover:bg-nso-primary-container disabled:opacity-50 transition-colors"
                  >
                    กลับไปใช้ Session เดิม
                  </button>
                  <button
                    onClick={handleCancelAndCreate}
                    disabled={isDialogPending}
                    className="w-full py-3 rounded-xl border border-destructive/40 text-destructive font-semibold text-sm hover:bg-destructive/5 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                  >
                    {(cancelSessionMutation.isPending || createSessionMutation.isPending) && (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    )}
                    ยกเลิก Session เดิม และสร้างใหม่
                  </button>
                  <p className="text-center text-xs text-muted-foreground pt-1">
                    ผู้เล่น {dialog.session._count.playerSessions} คนในห้องจะถูกเตะออก
                  </p>
                </div>
              </>
            )}

            {dialog.type === 'running' && (
              <>
                <div className="flex items-start justify-between gap-3 p-6 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <Play className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <h2 className="font-bold text-foreground text-base">Session กำลังดำเนินอยู่</h2>
                      <p className="text-muted-foreground text-sm">คุณต้องการทำอะไร?</p>
                    </div>
                  </div>
                  <button onClick={() => setDialog(null)} className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="mx-6 mb-5 rounded-xl bg-nso-surface border border-nso-outline-variant/30 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">PIN ห้อง</p>
                      <p className="font-mono font-extrabold text-2xl text-emerald-600 tracking-widest">
                        {dialog.session.roomCode}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                      <span className="text-sm font-semibold text-emerald-600">LIVE</span>
                    </div>
                  </div>
                </div>

                <div className="px-6 pb-6 space-y-2">
                  <button
                    onClick={handleResume}
                    disabled={isDialogPending}
                    className="w-full py-3 rounded-xl bg-nso-primary text-white font-bold text-sm hover:bg-nso-primary-container disabled:opacity-50 transition-colors"
                  >
                    กลับไป Host Session นี้
                  </button>
                  <button
                    onClick={handleAbortAndCreate}
                    disabled={isDialogPending}
                    className="w-full py-3 rounded-xl border border-destructive/40 text-destructive font-semibold text-sm hover:bg-destructive/5 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                  >
                    {(abortSessionMutation.isPending || createSessionMutation.isPending) && (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    )}
                    ยุติ Session และสร้างใหม่
                  </button>
                  <p className="text-center text-xs text-muted-foreground pt-1">
                    ผลคะแนนที่บันทึกไว้จะยังคงอยู่ในประวัติ
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
