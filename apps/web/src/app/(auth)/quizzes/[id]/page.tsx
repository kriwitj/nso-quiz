'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { quizApi, sessionApi } from '@/lib/api';
import { QuestionType } from '@quiz/shared';
import { ArrowLeft, Edit3, Play, BookOpen, Clock, Award, CheckCircle2, Globe, Lock } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

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

const CHOICE_PREFIXES = ['A', 'B', 'C', 'D'];
const CHOICE_BG_CLASSES = [
  'bg-red-500/10 border-red-500/20 text-red-300',
  'bg-blue-500/10 border-blue-500/20 text-blue-300',
  'bg-yellow-500/10 border-yellow-500/20 text-yellow-300',
  'bg-green-500/10 border-green-500/20 text-green-300',
];

export default function QuizDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: quiz, isLoading, isError } = useQuery<QuizDetail>({
    queryKey: ['quiz', id],
    queryFn: () => quizApi.get(id).then((res) => res.data),
    enabled: Boolean(id),
  });

  const startSessionMutation = useMutation({
    mutationFn: () => sessionApi.create(id),
    onSuccess: (res) => {
      toast.success('Game session created!');
      router.push(`/sessions/${res.data.id}/host`);
    },
    onError: () => toast.error('Failed to create session'),
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="glass-card rounded-3xl p-8 animate-pulse space-y-4">
          <div className="h-6 w-24 bg-white/10 rounded" />
          <div className="h-10 w-2/3 bg-white/10 rounded" />
          <div className="h-4 w-1/2 bg-white/5 rounded" />
        </div>
      </div>
    );
  }

  if (isError || !quiz) {
    return (
      <div className="max-w-md mx-auto text-center glass-card rounded-3xl p-8 mt-12">
        <h2 className="text-2xl font-bold mb-4">Quiz not found</h2>
        <p className="text-muted-foreground mb-6">The quiz you are looking for does not exist or has been deleted.</p>
        <Link href="/quizzes" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 text-white font-medium hover:bg-violet-700 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Quizzes
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Back button */}
      <div>
        <Link href="/quizzes" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Quizzes
        </Link>
      </div>

      {/* Hero card */}
      <div className="glass-card rounded-3xl p-6 md:p-8 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
        <div className="space-y-3 flex-1">
          <div className="flex items-center gap-2">
            {quiz.isPublic ? (
              <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Globe className="w-3 h-3" /> Public
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                <Lock className="w-3 h-3" /> Private
              </span>
            )}
            <span className="text-xs px-2.5 py-1 rounded-full bg-white/5 text-muted-foreground border border-white/10">
              {quiz.questions.length} Question{quiz.questions.length !== 1 ? 's' : ''}
            </span>
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight">{quiz.title}</h1>
          {quiz.description ? (
            <p className="text-muted-foreground">{quiz.description}</p>
          ) : (
            <p className="text-muted-foreground/50 italic text-sm">No description provided.</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
          <Link
            href={`/quizzes/${quiz.id}/edit`}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-white/10 hover:bg-white/5 font-semibold transition-colors text-sm"
          >
            <Edit3 className="w-4 h-4" /> Edit Quiz
          </Link>
          <button
            onClick={() => startSessionMutation.mutate()}
            disabled={startSessionMutation.isPending || quiz.questions.length === 0}
            className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            <Play className="w-4 h-4 fill-current" /> Host Live Game
          </button>
        </div>
      </div>

      {/* Questions list title */}
      <div>
        <h2 className="font-display text-xl font-bold flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-violet-400" />
          Questions Preview
        </h2>
      </div>

      {/* Questions list */}
      <div className="space-y-4">
        {quiz.questions.length > 0 ? (
          quiz.questions.map((question, index) => (
            <div key={question.id} className="glass-card rounded-2xl p-5 border border-white/5 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-xs uppercase tracking-[0.16em] text-violet-400 font-semibold">
                    Question {index + 1} ({question.type})
                  </span>
                  <h3 className="font-medium text-lg mt-1">{question.text}</h3>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0 mt-1">
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5">
                    <Clock className="w-3.5 h-3.5" /> {question.timeLimit}s
                  </span>
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5">
                    <Award className="w-3.5 h-3.5" /> {question.points} pts
                  </span>
                </div>
              </div>

              {/* Choices preview */}
              <div className="grid gap-2 sm:grid-cols-2">
                {question.choices.map((choice, i) => {
                  const bgClass = CHOICE_BG_CLASSES[i % CHOICE_BG_CLASSES.length];
                  return (
                    <div
                      key={choice.id}
                      className={`flex items-center justify-between p-3 rounded-xl border text-sm ${
                        choice.isCorrect
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 font-medium'
                          : bgClass
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold opacity-60">{CHOICE_PREFIXES[i]}.</span>
                        <span>{choice.text}</span>
                      </div>
                      {choice.isCorrect && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        ) : (
          <div className="glass-card rounded-2xl p-12 text-center text-muted-foreground">
            <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="font-medium">No questions in this quiz yet</p>
            <p className="text-sm mt-1 mb-4">You need to add at least one question before hosting a live game.</p>
            <Link
              href={`/quizzes/${quiz.id}/edit`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 text-white hover:bg-violet-700 transition-colors text-sm font-semibold"
            >
              Add Questions
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
