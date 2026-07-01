'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { quizApi } from '@/lib/api';
import { QuestionType } from '@quiz/shared';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Save, CheckCircle2, Plus, Trash2, GripVertical,
  ChevronLeft, ChevronRight, Eye, Bold, Italic, Underline,
  Strikethrough, Link2, ImageIcon, List, ListOrdered, Shuffle, Info, Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ── Types ─────────────────────────────────────────────────── */
interface Choice { id?: string; text: string; isCorrect: boolean }
interface QuizQuestion {
  id: string; text: string; type: QuestionType;
  timeLimit: number; points: number; order: number;
  choices: Choice[];
}
interface QuizDetail {
  id: string; title: string; description?: string;
  isPublic: boolean; questions: QuizQuestion[];
}
interface EditForm {
  text: string; type: QuestionType; timeLimit: number; points: number;
  choices: Choice[]; shuffleChoices: boolean; difficulty: string;
}

/* ── Constants ──────────────────────────────────────────────── */
const TYPE_CONFIG: Partial<Record<QuestionType, { label: string; sub: string }>> = {
  [QuestionType.MULTIPLE_CHOICE]: { label: 'Multiple Choice', sub: 'เลือก 1 คำตอบ' },
  [QuestionType.TRUE_FALSE]:      { label: 'True / False',    sub: 'ถูกหรือผิด' },
  [QuestionType.OPEN_ENDED]:      { label: 'Short Answer',    sub: 'คำตอบสั้น' },
  [QuestionType.POLL]:            { label: 'Poll',             sub: 'โหวต' },
};

const makeChoices = (type: QuestionType): Choice[] => {
  if (type === QuestionType.TRUE_FALSE)
    return [{ text: 'ถูก', isCorrect: true }, { text: 'ผิด', isCorrect: false }];
  if (type === QuestionType.OPEN_ENDED) return [];
  return [
    { text: '', isCorrect: true }, { text: '', isCorrect: false },
    { text: '', isCorrect: false }, { text: '', isCorrect: false },
  ];
};

const blankForm = (): EditForm => ({
  text: '', type: QuestionType.MULTIPLE_CHOICE, timeLimit: 10, points: 1000,
  choices: makeChoices(QuestionType.MULTIPLE_CHOICE),
  shuffleChoices: true, difficulty: 'ปานกลาง',
});

const fromQuestion = (q: QuizQuestion): EditForm => ({
  text: q.text, type: q.type, timeLimit: q.timeLimit, points: q.points,
  choices: q.choices.map(c => ({ id: c.id, text: c.text, isCorrect: c.isCorrect })),
  shuffleChoices: true, difficulty: 'ปานกลาง',
});

/* ── Component ──────────────────────────────────────────────── */
export default function EditQuizPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState<EditForm>(blankForm());
  const [isDirty, setIsDirty] = useState(false);
  const [pendingNav, setPendingNav] = useState<number | 'new' | 'back' | null>(null);

  const { data, isLoading } = useQuery<QuizDetail>({
    queryKey: ['quiz', id],
    queryFn: () => quizApi.get(id).then(r => r.data),
    enabled: Boolean(id),
    staleTime: 0,
  });

  // Re-sync selected question after data refresh (after save/delete)
  useEffect(() => {
    if (!data) return;
    if (selectedIdx !== null) {
      const q = data.questions[selectedIdx];
      if (q && !isDirty) {
        setForm(fromQuestion(q));
      } else if (!q) {
        // selectedIdx is out of bounds (e.g. after delete) — reset
        const fallback = data.questions.length > 0 ? 0 : null;
        setSelectedIdx(fallback);
        if (fallback !== null) setForm(fromQuestion(data.questions[fallback]));
        setIsDirty(false);
      }
    } else if (!isNew && data.questions.length > 0) {
      // No selection yet — auto-select first question
      setSelectedIdx(0);
      setForm(fromQuestion(data.questions[0]));
      setIsDirty(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // Browser close/refresh guard
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  // Keyboard shortcut: Ctrl+Enter → save
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        saveMutation.mutate();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, isNew, selectedIdx]);

  /* ── Navigation guard ─────────────────────────────────────── */
  const doNavigate = useCallback((target: number | 'new' | 'back') => {
    setPendingNav(null);
    if (target === 'back') { router.push('/quizzes'); return; }
    if (target === 'new') {
      setIsNew(true); setSelectedIdx(null); setForm(blankForm()); setIsDirty(false); return;
    }
    if (data?.questions[target]) {
      setSelectedIdx(target); setIsNew(false);
      setForm(fromQuestion(data.questions[target])); setIsDirty(false);
    }
  }, [data, router]);

  const tryNav = (target: number | 'new' | 'back') => {
    if (isDirty) setPendingNav(target);
    else doNavigate(target);
  };

  /* ── Form helpers ─────────────────────────────────────────── */
  const upd = (patch: Partial<EditForm>) => { setForm(p => ({ ...p, ...patch })); setIsDirty(true); };
  const setChoiceText = (i: number, text: string) =>
    upd({ choices: form.choices.map((c, j) => j === i ? { ...c, text } : c) });
  const setCorrect = (i: number) =>
    upd({ choices: form.choices.map((c, j) => ({ ...c, isCorrect: j === i })) });
  const removeChoice = (i: number) => {
    if (form.choices.length <= 2) return;
    upd({ choices: form.choices.filter((_, j) => j !== i) });
  };
  const changeType = (type: QuestionType) => upd({ type, choices: makeChoices(type) });

  /* ── Mutations ────────────────────────────────────────────── */
  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        type: form.type, text: form.text, timeLimit: form.timeLimit,
        points: form.points,
        choices: form.choices.map(c => ({ text: c.text, isCorrect: c.isCorrect })),
      };
      if (isNew) return quizApi.addQuestion(id, payload);
      if (selectedIdx === null) throw new Error('ยังไม่ได้เลือกคำถาม (selectedIdx=null)');
      const q = data?.questions[selectedIdx];
      if (!q) throw new Error(`ไม่พบคำถามที่ตำแหน่ง ${selectedIdx} (มีทั้งหมด ${data?.questions.length ?? 0} ข้อ)`);
      return quizApi.updateQuestion(q.id, payload);
    },
    onSuccess: () => {
      toast.success(isNew ? 'เพิ่มคำถามแล้ว' : 'บันทึกแล้ว');
      setIsDirty(false);
      queryClient.invalidateQueries({ queryKey: ['quiz', id] });
      queryClient.invalidateQueries({ queryKey: ['quizzes'] });
      if (isNew) {
        // Select the newly added question after cache refresh
        queryClient.fetchQuery({ queryKey: ['quiz', id], queryFn: () => quizApi.get(id).then(r => r.data) })
          .then((d: QuizDetail) => {
            const newIdx = d.questions.length - 1;
            setSelectedIdx(newIdx); setIsNew(false);
            setForm(fromQuestion(d.questions[newIdx]));
          });
      }
    },
    onError: (err: any) => {
      // Extract and display the actual error reason from API
      const msg =
        err?.response?.data?.message ??
        err?.response?.data?.error ??
        err?.message ??
        'ไม่สามารถบันทึกได้';
      const status = err?.response?.status;
      const detail = Array.isArray(msg) ? msg.join(', ') : msg;
      toast.error(`บันทึกไม่ได้${status ? ` (${status})` : ''}: ${detail}`, { duration: 6000 });
      console.error('[save error]', err?.response?.data ?? err);
    },
  });

  const saveAndFinish = async () => {
    try {
      await saveMutation.mutateAsync();
      router.push('/quizzes');
    } catch {
      // onError already shows toast — do NOT redirect on failure
    }
  };

  const deleteMutation = useMutation({
    mutationFn: () => quizApi.deleteQuestion(data!.questions[selectedIdx!].id),
    onSuccess: () => {
      toast.success('ลบคำถามแล้ว');
      queryClient.invalidateQueries({ queryKey: ['quiz', id] });
      setSelectedIdx(null); setIsNew(false); setIsDirty(false);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? err?.message ?? 'ไม่สามารถลบได้';
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg, { duration: 5000 });
    },
  });

  /* ── Loading state ────────────────────────────────────────── */
  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-nso-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const selectedQ = selectedIdx !== null ? data.questions[selectedIdx] : null;
  const total = data.questions.length;

  return (
    // Cancel parent padding; fill remaining viewport height
    <div
      className="-mx-4 md:-mx-6 -mt-4 md:-mt-6 -mb-4 md:-mb-6 flex flex-col overflow-hidden bg-[#f8f9fc]"
      style={{ height: 'calc(100dvh - 61px)' }}
    >
      {/* ── Unsaved changes dialog ── */}
      {pendingNav !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-gray-100">
            <h3 className="font-bold text-lg text-foreground mb-1">มีการแก้ไขที่ยังไม่ได้บันทึก</h3>
            <p className="text-sm text-muted-foreground mb-5">คุณต้องการออกโดยไม่บันทึก หรือบันทึกก่อนออก?</p>
            <div className="flex gap-2">
              <button onClick={() => setPendingNav(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-gray-50 transition-colors">
                ยกเลิก
              </button>
              <button onClick={() => doNavigate(pendingNav!)} className="flex-1 py-2.5 rounded-xl bg-rose-500 text-white text-sm font-semibold hover:bg-rose-600 transition-colors">
                ออกโดยไม่บันทึก
              </button>
              <button
                onClick={async () => { await saveMutation.mutateAsync(); doNavigate(pendingNav!); }}
                disabled={saveMutation.isPending}
                className="flex-1 py-2.5 rounded-xl bg-nso-primary text-white text-sm font-semibold hover:bg-nso-primary-container disabled:opacity-50 transition-colors"
              >
                บันทึกและออก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Top bar ── */}
      <header className="flex-none bg-white border-b border-gray-200 px-5 py-0">
        {/* Row 1: breadcrumb + action buttons */}
        <div className="flex items-center gap-3 py-2.5 border-b border-gray-100">
          <button onClick={() => tryNav('back')} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> กลับไปหน้าเนื้อหาแบบทดสอบ
          </button>
          <span className="text-gray-300 text-sm">/</span>
          <span className="text-sm font-semibold text-foreground">แก้ไขคำถาม</span>
          <div className="flex-1" />
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            <Eye className="w-3.5 h-3.5" /> ดูตัวอย่าง
          </button>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || (!selectedQ && !isNew)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-nso-primary text-nso-primary text-xs font-semibold hover:bg-nso-primary/5 disabled:opacity-40 transition-colors"
          >
            {saveMutation.isPending
              ? <span className="w-3.5 h-3.5 border-2 border-nso-primary border-t-transparent rounded-full animate-spin" />
              : <Save className="w-3.5 h-3.5" />}
            บันทึก
          </button>
          <button
            onClick={saveAndFinish}
            disabled={saveMutation.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-nso-primary text-white text-xs font-semibold hover:bg-nso-primary-container disabled:opacity-50 transition-colors shadow-sm"
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> บันทึกและเสร็จสิ้น
          </button>
        </div>
        {/* Row 2: title */}
        <div className="py-2">
          <h1 className="font-bold text-base text-foreground">แก้ไขคำถาม</h1>
          <p className="text-xs text-muted-foreground">จัดการคำถามในแบบทดสอบ &quot;{data.title}&quot;</p>
        </div>
      </header>

      {/* ── 3-column body ── */}
      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* LEFT: Question list */}
        <div className="w-[250px] flex-none border-r border-gray-200 overflow-y-auto bg-white">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">รายการคำถาม</h2>
              <span className="text-xs text-gray-400 font-medium bg-gray-100 px-2 py-0.5 rounded-full">{total} ข้อ</span>
            </div>

            <div className="space-y-1.5">
              {data.questions.map((q, idx) => {
                const cfg = TYPE_CONFIG[q.type];
                const isSelected = !isNew && selectedIdx === idx;
                return (
                  <button
                    key={q.id}
                    onClick={() => tryNav(idx)}
                    className={cn(
                      'w-full text-left p-3 rounded-xl border-2 transition-all',
                      isSelected ? 'border-emerald-400 bg-emerald-50' : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50',
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <span className={cn(
                        'w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5',
                        isSelected ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-500',
                      )}>
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{q.text || '(ไม่มีข้อความ)'}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {cfg?.label ?? q.type} · {q.timeLimit}s · {q.points.toLocaleString()} คะแนน
                        </p>
                      </div>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />}
                    </div>
                  </button>
                );
              })}

              {/* New question (being edited) */}
              {isNew && (
                <div className="w-full text-left p-3 rounded-xl border-2 border-dashed border-nso-primary bg-nso-primary/5">
                  <div className="flex items-start gap-2">
                    <span className="w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5 bg-nso-primary text-white">
                      {total + 1}
                    </span>
                    <p className="text-xs font-semibold text-nso-primary">คำถามใหม่</p>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => tryNav('new')}
              className="mt-3 w-full py-2.5 rounded-xl border-2 border-dashed border-gray-300 text-xs text-gray-500 hover:border-nso-primary hover:text-nso-primary transition-colors flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> เพิ่มคำถามใหม่
            </button>
          </div>
        </div>

        {/* MIDDLE + RIGHT: Question data and choices (blur overlay when no question selected) */}
        <div className="relative flex-1 flex overflow-hidden min-h-0">

        {/* MIDDLE: Question data */}
        <div className="w-[340px] flex-none border-r border-gray-200 overflow-y-auto bg-white">
          <div className="p-5 space-y-5">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">ข้อมูลคำถาม</h2>

            {/* Type selector */}
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-2 block">ประเภทคำถาม</label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(TYPE_CONFIG) as [QuestionType, {label:string;sub:string}][]).map(([type, cfg]) => (
                  <button
                    key={type}
                    onClick={() => changeType(type)}
                    className={cn(
                      'text-left p-3 rounded-xl border-2 transition-all',
                      form.type === type
                        ? 'border-nso-primary bg-nso-primary/5'
                        : 'border-gray-200 hover:border-gray-300 bg-white',
                    )}
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      <div className={cn(
                        'w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                        form.type === type ? 'border-nso-primary bg-nso-primary' : 'border-gray-300',
                      )}>
                        {form.type === type && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                      </div>
                      <span className="text-xs font-semibold text-foreground">{cfg.label}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground pl-5">{cfg.sub}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Question text */}
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-2 block">
                คำถาม <span className="text-rose-400">*</span>
              </label>
              <div className="flex items-center gap-0.5 px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-t-xl border-b-0">
                {[Bold, Italic, Underline, Strikethrough].map((Icon, i) => (
                  <button key={i} type="button" className="p-1.5 rounded hover:bg-gray-200 transition-colors text-gray-500">
                    <Icon className="w-3.5 h-3.5" />
                  </button>
                ))}
                <div className="w-px h-4 bg-gray-300 mx-1" />
                {[Link2, ImageIcon, List, ListOrdered].map((Icon, i) => (
                  <button key={i} type="button" className="p-1.5 rounded hover:bg-gray-200 transition-colors text-gray-500">
                    <Icon className="w-3.5 h-3.5" />
                  </button>
                ))}
              </div>
              <textarea
                value={form.text}
                onChange={e => upd({ text: e.target.value })}
                maxLength={1000}
                rows={5}
                placeholder="พิมพ์คำถามที่นี่..."
                className="w-full border border-gray-200 rounded-b-xl px-3 py-2.5 text-sm text-foreground placeholder:text-gray-400 focus:outline-none focus:border-nso-primary focus:ring-1 focus:ring-nso-primary/20 resize-none"
              />
              <div className="text-right text-[10px] text-gray-400 mt-0.5">{form.text.length} / 1000</div>
            </div>

            {/* Time / Points / Difficulty */}
            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="text-[10px] font-semibold text-gray-500 mb-1.5 flex items-center gap-1">⏱ เวลา (วินาที)</label>
                <input type="number" value={form.timeLimit} min={5} max={120}
                  onChange={e => upd({ timeLimit: Number(e.target.value) })}
                  className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:border-nso-primary" />
                <p className="text-[9px] text-gray-400 mt-1 text-center">แนะนำ 5-60</p>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-gray-500 mb-1.5 block">☆ คะแนน</label>
                <input type="number" value={form.points} min={0} step={100}
                  onChange={e => upd({ points: Number(e.target.value) })}
                  className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:border-nso-primary" />
                <p className="text-[9px] text-gray-400 mt-1 text-center">คะแนนเต็ม</p>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-gray-500 mb-1.5 block">▤ ระดับความยาก</label>
                <select value={form.difficulty} onChange={e => upd({ difficulty: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-1.5 py-2 text-xs focus:outline-none focus:border-nso-primary bg-white">
                  <option>ง่าย</option>
                  <option>ปานกลาง</option>
                  <option>ยาก</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* MIDDLE: Choices */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-5 space-y-3">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest">ตัวเลือกคำตอบ</h2>

            {form.type === QuestionType.OPEN_ENDED ? (
              <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
                <p className="text-sm text-muted-foreground">คำถามประเภทนี้ไม่มีตัวเลือก<br />ผู้เล่นจะพิมพ์คำตอบเอง</p>
              </div>
            ) : (
              <>
                {form.choices.map((choice, idx) => (
                  <div key={idx} className={cn(
                    'flex items-center gap-2.5 bg-white rounded-2xl border-2 px-3 py-3 transition-all',
                    choice.isCorrect ? 'border-emerald-400 bg-emerald-50/40' : 'border-gray-200',
                  )}>
                    <GripVertical className="w-4 h-4 text-gray-300 cursor-grab flex-shrink-0" />
                    <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {idx + 1}
                    </span>
                    <input
                      type="text" value={choice.text}
                      onChange={e => setChoiceText(idx, e.target.value)}
                      placeholder={`ตัวเลือกที่ ${idx + 1}`}
                      className="flex-1 text-sm bg-transparent border-none outline-none text-foreground placeholder:text-gray-400"
                    />
                    <button
                      onClick={() => setCorrect(idx)}
                      className={cn(
                        'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all',
                        choice.isCorrect ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300 hover:border-emerald-400',
                      )}
                    >
                      {choice.isCorrect && <Check className="w-3 h-3 text-white" />}
                    </button>
                    <button onClick={() => removeChoice(idx)}
                      className="w-7 h-7 rounded-lg hover:bg-rose-50 text-gray-400 hover:text-rose-500 flex items-center justify-center flex-shrink-0 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {form.choices.length < 6 && (
                  <button
                    onClick={() => upd({ choices: [...form.choices, { text: '', isCorrect: false }] })}
                    className="w-full py-3 rounded-2xl border-2 border-dashed border-gray-300 text-sm text-gray-400 hover:border-nso-primary hover:text-nso-primary transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> เพิ่มตัวเลือก
                  </button>
                )}

                {/* Shuffle toggle */}
                <div className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Shuffle className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">สลับลำดับตัวเลือกอัตโนมัติ</p>
                      <p className="text-xs text-muted-foreground">แสดงตัวเลือกในลำดับที่แตกต่างกันสำหรับผู้เล่นแต่ละคน</p>
                    </div>
                  </div>
                  <button
                    onClick={() => upd({ shuffleChoices: !form.shuffleChoices })}
                    className={cn('w-11 h-6 rounded-full transition-colors relative flex-shrink-0', form.shuffleChoices ? 'bg-nso-primary' : 'bg-gray-300')}
                  >
                    <div className={cn('w-4 h-4 bg-white rounded-full absolute top-1 transition-transform shadow', form.shuffleChoices ? 'translate-x-6' : 'translate-x-1')} />
                  </button>
                </div>

                {/* Tip */}
                <div className="bg-blue-50 rounded-2xl border border-blue-100 p-3 flex items-center gap-2">
                  <Info className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <p className="text-xs text-blue-700">
                    <span className="font-semibold">เคล็ดลับ:</span> กด Ctrl + Enter เพื่อบันทึกอย่างรวดเร็ว
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

          {/* Blur overlay — shown when no question is selected */}
          {selectedIdx === null && !isNew && (
            <div className="absolute inset-0 z-10 backdrop-blur-sm bg-white/60 flex flex-col items-center justify-center pointer-events-auto">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-8 text-center max-w-xs">
                <div className="w-12 h-12 rounded-2xl bg-nso-primary-fixed/30 flex items-center justify-center mx-auto mb-4">
                  <Plus className="w-6 h-6 text-nso-primary" />
                </div>
                <p className="font-bold text-base text-foreground mb-1">ยังไม่ได้เลือกคำถาม</p>
                <p className="text-sm text-muted-foreground mb-4">เลือกคำถามจากรายการทางซ้าย หรือเพิ่มคำถามใหม่เพื่อเริ่มแก้ไข</p>
                <button
                  onClick={() => tryNav('new')}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-nso-primary text-white text-sm font-semibold hover:bg-nso-primary-container transition-colors mx-auto"
                >
                  <Plus className="w-4 h-4" /> เพิ่มคำถามใหม่
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <footer className="flex-none bg-white border-t border-gray-200 px-5 py-2.5 flex items-center">
        <button
          onClick={() => {
            if (!selectedQ) return;
            if (confirm('ลบคำถามนี้? ไม่สามารถย้อนกลับได้')) deleteMutation.mutate();
          }}
          disabled={!selectedQ || isNew || deleteMutation.isPending}
          className="px-4 py-2 rounded-xl border border-rose-200 text-rose-500 text-sm font-semibold hover:bg-rose-50 disabled:opacity-40 transition-colors"
        >
          ลบคำถาม
        </button>

        {isDirty && (
          <span className="ml-3 text-xs text-amber-600 font-medium">● มีการแก้ไขที่ยังไม่บันทึก</span>
        )}

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <button
            onClick={() => selectedIdx !== null && selectedIdx > 0 && tryNav(selectedIdx - 1)}
            disabled={selectedIdx === null || selectedIdx === 0 || isNew}
            className="flex items-center gap-1 px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> ข้อก่อนหน้า
          </button>
          <button
            onClick={() => selectedIdx !== null && selectedIdx < total - 1 && tryNav(selectedIdx + 1)}
            disabled={selectedIdx === null || selectedIdx >= total - 1 || isNew}
            className="flex items-center gap-1 px-3 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
          >
            ข้อถัดไป <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </footer>
    </div>
  );
}
