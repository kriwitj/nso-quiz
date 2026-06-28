'use client';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { sessionApi } from '@/lib/api';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { AlertTriangle, Play, RefreshCw, Users, X } from 'lucide-react';

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

export function useSmartHost() {
  const router = useRouter();
  const [checkingQuizId, setCheckingQuizId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);

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

  const handleHost = async (quizId: string) => {
    setCheckingQuizId(quizId);
    try {
      const res = await sessionApi.activeForQuiz(quizId);
      const active: ActiveSession | null = res.data;
      if (!active) {
        createSessionMutation.mutate(quizId);
        return;
      }
      setDialog(active.status === 'PENDING'
        ? { type: 'waiting', session: active, quizId }
        : { type: 'running', session: active, quizId });
    } catch {
      toast.error('ไม่สามารถตรวจสอบเซสชันได้');
    } finally {
      setCheckingQuizId(null);
    }
  };

  const handleResume = () => {
    if (!dialog) return;
    router.push(`/sessions/${dialog.session.id}/host`);
    setDialog(null);
  };

  const handleCancelAndCreate = async () => {
    if (!dialog) return;
    try {
      await cancelSessionMutation.mutateAsync(dialog.session.id);
      createSessionMutation.mutate(dialog.quizId);
    } catch {
      toast.error('ไม่สามารถยกเลิกเซสชันเดิมได้');
    }
  };

  const handleAbortAndCreate = async () => {
    if (!dialog) return;
    try {
      await abortSessionMutation.mutateAsync(dialog.session.id);
      createSessionMutation.mutate(dialog.quizId);
    } catch {
      toast.error('ไม่สามารถยุติเซสชันได้');
    }
  };

  const isChecking = (quizId: string) => checkingQuizId === quizId;
  const isDialogPending =
    cancelSessionMutation.isPending ||
    abortSessionMutation.isPending ||
    createSessionMutation.isPending;

  return { handleHost, handleResume, handleCancelAndCreate, handleAbortAndCreate, isChecking, isDialogPending, dialog, setDialog };
}

/** Drop-in dialog component — render once per page that uses useSmartHost */
export function SmartHostDialog({
  dialog,
  setDialog,
  onResume,
  onCancelAndCreate,
  onAbortAndCreate,
  isPending,
}: {
  dialog: DialogState;
  setDialog: (d: DialogState) => void;
  onResume: () => void;
  onCancelAndCreate: () => void;
  onAbortAndCreate: () => void;
  isPending: boolean;
}) {
  if (!dialog) return null;

  return (
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
                onClick={onResume}
                disabled={isPending}
                className="w-full py-3 rounded-xl bg-nso-primary text-white font-bold text-sm hover:bg-nso-primary-container disabled:opacity-50 transition-colors"
              >
                กลับไปใช้ Session เดิม
              </button>
              <button
                onClick={onCancelAndCreate}
                disabled={isPending}
                className="w-full py-3 rounded-xl border border-destructive/40 text-destructive font-semibold text-sm hover:bg-destructive/5 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {isPending && <RefreshCw className="w-4 h-4 animate-spin" />}
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
                onClick={onResume}
                disabled={isPending}
                className="w-full py-3 rounded-xl bg-nso-primary text-white font-bold text-sm hover:bg-nso-primary-container disabled:opacity-50 transition-colors"
              >
                กลับไป Host Session นี้
              </button>
              <button
                onClick={onAbortAndCreate}
                disabled={isPending}
                className="w-full py-3 rounded-xl border border-destructive/40 text-destructive font-semibold text-sm hover:bg-destructive/5 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {isPending && <RefreshCw className="w-4 h-4 animate-spin" />}
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
  );
}
