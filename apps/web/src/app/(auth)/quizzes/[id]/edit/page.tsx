'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { quizApi } from '@/lib/api';
import { QuestionType } from '@quiz/shared';
import toast from 'react-hot-toast';
import { Trash2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface QuizDetail {
  id: string;
  title: string;
  description?: string;
  isPublic: boolean;
  questions: Array<{
    id: string;
    text: string;
    type: QuestionType;
    timeLimit: number;
    points: number;
    choices: Array<{
      id: string;
      text: string;
      isCorrect: boolean;
    }>;
  }>;
}

const defaultChoices = [
  { text: 'Choice 1', isCorrect: true },
  { text: 'Choice 2', isCorrect: false },
  { text: 'Choice 3', isCorrect: false },
  { text: 'Choice 4', isCorrect: false },
];

export default function EditQuizPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [questionText, setQuestionText] = useState('');
  const [questionType, setQuestionType] = useState<QuestionType>(QuestionType.MULTIPLE_CHOICE);
  const [timeLimit, setTimeLimit] = useState(10);
  const [points, setPoints] = useState(1000);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [choices, setChoices] = useState(defaultChoices);

  const { data, isLoading } = useQuery<QuizDetail>({
    queryKey: ['quiz', id],
    queryFn: () => quizApi.get(id).then((res) => res.data),
    enabled: Boolean(id),
  });

  useEffect(() => {
    if (!data) return;
    setTitle(data.title);
    setDescription(data.description ?? '');
    setIsPublic(data.isPublic);
  }, [data]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['quiz', id] });
    queryClient.invalidateQueries({ queryKey: ['quizzes'] });
  };

  const updateQuiz = useMutation({
    mutationFn: () => quizApi.update(id, { title, description, isPublic }),
    onSuccess: () => {
      toast.success('Quiz updated');
      refresh();
    },
    onError: () => toast.error('Failed to update quiz'),
  });

  const addQuestion = useMutation({
    mutationFn: () =>
      quizApi.addQuestion(id, {
        type: questionType,
        text: questionText,
        timeLimit: Number(timeLimit),
        points: Number(points),
        choices: choices.map((choice, index) => ({
          text: choice.text,
          isCorrect: index === correctIndex,
        })),
      }),
    onSuccess: () => {
      toast.success('Question added');
      setQuestionText('');
      setQuestionType(QuestionType.MULTIPLE_CHOICE);
      setTimeLimit(10);
      setPoints(1000);
      setCorrectIndex(0);
      setChoices(defaultChoices);
      refresh();
    },
    onError: () => toast.error('Failed to add question'),
  });

  const deleteQuestion = useMutation({
    mutationFn: (questionId: string) => quizApi.deleteQuestion(questionId),
    onSuccess: () => {
      toast.success('Question deleted');
      refresh();
    },
    onError: () => toast.error('Failed to delete question'),
  });

  if (isLoading || !data) {
    return <div className="glass-card rounded-3xl p-8">Loading quiz...</div>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <Link
          href={`/quizzes/${id}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Quiz Details
        </Link>
        <h1 className="font-display text-3xl font-bold">Edit Quiz</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Update quiz details and add multiple-choice questions.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="glass-card rounded-3xl p-6 space-y-5">
          <h2 className="font-display text-2xl font-semibold">Quiz Settings</h2>
          <div>
            <label className="mb-2 block text-sm font-medium">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-28 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none" />
          </div>
          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
            <span className="text-sm">Public quiz</span>
          </label>
          <button onClick={() => updateQuiz.mutate()} disabled={updateQuiz.isPending || title.trim().length < 3} className="rounded-xl bg-violet-600 px-5 py-3 font-semibold text-white disabled:opacity-50">
            Save quiz details
          </button>
        </section>

        <section className="glass-card rounded-3xl p-6 space-y-5">
          <h2 className="font-display text-2xl font-semibold">Add Question</h2>
          <div>
            <label className="mb-2 block text-sm font-medium">Question</label>
            <textarea value={questionText} onChange={(e) => setQuestionText(e.target.value)} className="min-h-28 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none" />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium">Type</label>
              <select value={questionType} onChange={(e) => setQuestionType(e.target.value as QuestionType)} className="w-full rounded-xl border border-white/10 bg-[#161622] px-4 py-3 outline-none">
                {Object.values(QuestionType).map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Time limit</label>
              <input type="number" value={timeLimit} onChange={(e) => setTimeLimit(Number(e.target.value))} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none" min={5} max={120} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Points</label>
              <input type="number" value={points} onChange={(e) => setPoints(Number(e.target.value))} className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none" min={0} />
            </div>
          </div>

          <div className="space-y-3">
            {choices.map((choice, index) => (
              <div key={index} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
                <input type="radio" name="correct-choice" checked={correctIndex === index} onChange={() => setCorrectIndex(index)} />
                <input
                  value={choice.text}
                  onChange={(e) =>
                    setChoices((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, text: e.target.value } : item))
                  }
                  className="flex-1 rounded-xl border border-white/10 bg-black/10 px-4 py-2 outline-none"
                />
              </div>
            ))}
          </div>

          <button onClick={() => addQuestion.mutate()} disabled={addQuestion.isPending || questionText.trim().length < 3} className="rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white disabled:opacity-50">
            Add question
          </button>
        </section>
      </div>

      <section className="glass-card rounded-3xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-2xl font-semibold">Questions</h2>
          <span className="text-sm text-muted-foreground">{data.questions.length} total</span>
        </div>

        <div className="space-y-3">
          {data.questions.length ? (
            data.questions.map((question, index) => (
              <div key={question.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Question {index + 1}</p>
                    <p className="mt-1 font-medium">{question.text}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {question.type} • {question.timeLimit}s • {question.points} pts
                    </p>
                  </div>
                  <button onClick={() => deleteQuestion.mutate(question.id)} className="rounded-xl bg-rose-500/15 p-2 text-rose-300" title="Delete question">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {question.choices.map((choice) => (
                    <div key={choice.id} className="rounded-xl border border-white/10 px-3 py-2 text-sm">
                      <span className={choice.isCorrect ? 'text-emerald-300' : 'text-foreground'}>{choice.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No questions yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}


