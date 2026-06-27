'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { sessionApi } from '@/lib/api';
import {
  Trophy, Users, Clock, CheckCircle2, XCircle,
  ArrowLeft, BarChart3, Target, Zap,
} from 'lucide-react';
import { cn, getRankEmoji, getInitials, getAvatarColor } from '@/lib/utils';
import Link from 'next/link';

const AVATAR_EMOJIS: Record<string, string> = { cat: '🐱', dog: '🐶', fox: '🦊', panda: '🐼', lion: '🦁', bear: '🐻', rabbit: '🐰', tiger: '🐯' };

// ─── Types ───────────────────────────────────────────────────────────────────

interface Choice {
  id: string;
  text: string;
  isCorrect: boolean;
  order: number;
}

interface Question {
  id: string;
  text: string;
  points: number;
  timeLimit: number;
  choices: Choice[];
}

interface Answer {
  questionId: string;
  choiceId: string;
  isCorrect: boolean;
  pointsEarned: number;
  responseTimeMs: number;
  question: Question;
  choice: Choice;
}

interface PlayerSession {
  id: string;
  nickname: string;
  avatar: string;
  totalScore: number;
  streak: number;
  maxStreak: number;
  rank: number | null;
  answers: Answer[];
}

interface SessionResults {
  id: string;
  roomCode: string;
  startedAt: string | null;
  endedAt: string | null;
  quiz: { title: string };
  playerSessions: PlayerSession[];
  leaderboard: Array<{
    rank: number;
    playerSessionId: string;
    nickname: string;
    avatar: string;
    totalScore: number;
  }>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function durationMinutes(start: string | null, end: string | null) {
  if (!start || !end) return '—';
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${mins}m ${secs}s`;
}

function pct(n: number, total: number) {
  if (!total) return 0;
  return Math.round((n / total) * 100);
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function SessionResultsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data, isLoading, isError } = useQuery<SessionResults>({
    queryKey: ['session-results', id],
    queryFn: () => sessionApi.results(id).then((r) => r.data),
    enabled: Boolean(id),
  });

  if (isLoading) {
    return (
      <div className="max-w-6xl space-y-4 animate-pulse">
        <div className="glass-card rounded-3xl h-32" />
        <div className="glass-card rounded-3xl h-64" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="max-w-xl mx-auto">
        <div className="glass-card rounded-3xl p-8 text-center">
          <XCircle className="w-10 h-10 text-rose-400 mx-auto mb-4" />
          <h1 className="font-display text-2xl font-bold">Results unavailable</h1>
          <button
            onClick={() => router.push('/sessions')}
            className="mt-6 px-4 py-2 rounded-xl bg-violet-600/20 text-violet-400"
          >
            Back to sessions
          </button>
        </div>
      </div>
    );
  }

  // Build a question list from the first player's answers (they all answered the same questions)
  const questionList: Question[] = Array.from(
    new Map(
      data.playerSessions
        .flatMap((p) => p.answers)
        .map((a) => [a.questionId, a.question]),
    ).values(),
  ).sort((a, b) => {
    // Preserve order using the first seen answer sequence
    const allAnswers = data.playerSessions.flatMap((p) => p.answers);
    return allAnswers.findIndex((x) => x.questionId === a.id) -
      allAnswers.findIndex((x) => x.questionId === b.id);
  });

  const totalPlayers = data.playerSessions.length;

  // Per-question stats
  const questionStats = questionList.map((q) => {
    const answers = data.playerSessions
      .flatMap((p) => p.answers)
      .filter((a) => a.questionId === q.id);
    const correct = answers.filter((a) => a.isCorrect).length;
    const avgMs = answers.length
      ? answers.reduce((sum, a) => sum + a.responseTimeMs, 0) / answers.length
      : 0;

    // Choice distribution
    const distribution: Record<string, number> = {};
    q.choices.forEach((c) => { distribution[c.id] = 0; });
    answers.forEach((a) => {
      if (a.choiceId in distribution) distribution[a.choiceId]++;
    });

    return { q, answers, correct, avgMs, distribution };
  });

  return (
    <div className="max-w-7xl space-y-8">
      {/* Back + header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link
            href="/sessions"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-3 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Sessions
          </Link>
          <h1 className="font-display text-2xl font-bold">{data.quiz.title}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Room <span className="font-mono font-bold text-violet-400">{data.roomCode}</span>
            {' · '}Duration: {durationMinutes(data.startedAt, data.endedAt)}
          </p>
        </div>

        {/* Summary cards */}
        <div className="flex gap-3 flex-wrap">
          {[
            { label: 'Players', value: totalPlayers, icon: Users, color: 'from-violet-500 to-purple-600' },
            { label: 'Questions', value: questionList.length, icon: BarChart3, color: 'from-cyan-500 to-blue-600' },
            {
              label: 'Avg Score',
              value: totalPlayers
                ? Math.round(data.playerSessions.reduce((s, p) => s + p.totalScore, 0) / totalPlayers).toLocaleString()
                : '—',
              icon: Target,
              color: 'from-amber-500 to-orange-600',
            },
          ].map((s) => (
            <div key={s.label} className="glass-card rounded-2xl px-5 py-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center`}>
                <s.icon className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="font-display text-xl font-bold">{s.value}</p>
                <p className="text-muted-foreground text-xs">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Leaderboard ───────────────────────────────────────────────────── */}
      <section className="glass-card rounded-3xl p-6">
        <div className="flex items-center gap-2 mb-6">
          <Trophy className="w-5 h-5 text-amber-400" />
          <h2 className="font-display text-xl font-semibold">Final Leaderboard</h2>
        </div>

        <div className="space-y-2">
          {(data.leaderboard.length ? data.leaderboard : data.playerSessions.map((p, i) => ({
            rank: i + 1,
            playerSessionId: p.id,
            nickname: p.nickname,
            avatar: p.avatar,
            totalScore: p.totalScore,
          }))).map((entry, i) => (
            <div
              key={entry.playerSessionId}
              className={cn(
                'flex items-center gap-4 p-4 rounded-2xl transition-all',
                i === 0 && 'bg-amber-500/10 border border-amber-500/30',
                i === 1 && 'bg-slate-400/10 border border-slate-400/20',
                i === 2 && 'bg-orange-700/10 border border-orange-700/20',
                i > 2 && 'glass',
              )}
            >
              <span className="text-2xl w-10 text-center">{getRankEmoji(entry.rank)}</span>
              <div
                className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-xl flex-shrink-0 overflow-hidden"
              >
                {entry.avatar && entry.avatar.startsWith('data:image/') ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={entry.avatar} className="w-full h-full object-cover" alt="" />
                ) : (
                  <span className="select-none">{AVATAR_EMOJIS[entry.avatar] || '🐱'}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{entry.nickname}</p>
                {(() => {
                  const ps = data.playerSessions.find((p) => p.id === entry.playerSessionId);
                  if (!ps) return null;
                  const correctCount = ps.answers.filter((a) => a.isCorrect).length;
                  return (
                    <p className="text-xs text-muted-foreground">
                      {correctCount}/{ps.answers.length} correct
                      {ps.maxStreak > 1 && (
                        <span className="ml-2 text-orange-400">🔥 Max streak {ps.maxStreak}</span>
                      )}
                    </p>
                  );
                })()}
              </div>
              <span className="font-display text-xl font-bold gradient-text">
                {entry.totalScore.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Per-player detail ─────────────────────────────────────────────── */}
      <section className="glass-card rounded-3xl p-6 overflow-x-auto">
        <div className="flex items-center gap-2 mb-6">
          <Users className="w-5 h-5 text-violet-400" />
          <h2 className="font-display text-xl font-semibold">Player Answer Breakdown</h2>
        </div>

        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="text-left border-b border-white/10">
              <th className="pb-3 pr-4 text-muted-foreground font-medium">Player</th>
              <th className="pb-3 pr-4 text-muted-foreground font-medium text-right">Score</th>
              <th className="pb-3 pr-4 text-muted-foreground font-medium text-center">Correct</th>
              <th className="pb-3 pr-4 text-muted-foreground font-medium text-center">Avg Time</th>
              {questionList.map((q, qi) => (
                <th key={q.id} className="pb-3 px-2 text-muted-foreground font-medium text-center">
                  Q{qi + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {data.playerSessions
              .sort((a, b) => b.totalScore - a.totalScore)
              .map((player) => {
                const correct = player.answers.filter((a) => a.isCorrect).length;
                const avgMs = player.answers.length
                  ? player.answers.reduce((s, a) => s + a.responseTimeMs, 0) / player.answers.length
                  : 0;
                const answerByQ = new Map(player.answers.map((a) => [a.questionId, a]));

                return (
                  <tr key={player.id} className="hover:bg-white/3 transition-colors">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-sm flex-shrink-0 overflow-hidden"
                        >
                          {player.avatar && player.avatar.startsWith('data:image/') ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={player.avatar} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <span className="select-none">{AVATAR_EMOJIS[player.avatar] || '🐱'}</span>
                          )}
                        </div>
                        <span className="font-medium truncate max-w-[120px]">{player.nickname}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-right font-bold gradient-text">
                      {player.totalScore.toLocaleString()}
                    </td>
                    <td className="py-3 pr-4 text-center">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full',
                          pct(correct, player.answers.length) >= 70
                            ? 'bg-green-500/20 text-green-400'
                            : pct(correct, player.answers.length) >= 40
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-rose-500/20 text-rose-400',
                        )}
                      >
                        {correct}/{player.answers.length}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-center text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {(avgMs / 1000).toFixed(1)}s
                      </span>
                    </td>
                    {questionList.map((q) => {
                      const ans = answerByQ.get(q.id);
                      if (!ans) return <td key={q.id} className="py-3 px-2 text-center text-muted-foreground">—</td>;
                      return (
                        <td key={q.id} className="py-3 px-2 text-center">
                          {ans.isCorrect
                            ? <CheckCircle2 className="w-4 h-4 text-green-400 mx-auto" />
                            : <XCircle className="w-4 h-4 text-rose-400 mx-auto" />}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
          </tbody>
        </table>
      </section>

      {/* ── Per-question stats ────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-cyan-400" />
          <h2 className="font-display text-xl font-semibold">Question-by-Question Analysis</h2>
        </div>

        <div className="space-y-4">
          {questionStats.map(({ q, answers, correct, avgMs, distribution }, qi) => (
            <div key={q.id} className="glass-card rounded-2xl p-5">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground mb-1">Q{qi + 1}</p>
                  <p className="font-semibold">{q.text}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-center">
                    <p className={cn(
                      'text-2xl font-display font-bold',
                      pct(correct, answers.length) >= 70 ? 'text-green-400'
                        : pct(correct, answers.length) >= 40 ? 'text-yellow-400' : 'text-rose-400',
                    )}>
                      {pct(correct, answers.length)}%
                    </p>
                    <p className="text-xs text-muted-foreground">correct</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-display font-bold text-violet-400">
                      {(avgMs / 1000).toFixed(1)}s
                    </p>
                    <p className="text-xs text-muted-foreground">avg time</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-display font-bold text-muted-foreground">
                      {answers.length}
                    </p>
                    <p className="text-xs text-muted-foreground">answers</p>
                  </div>
                </div>
              </div>

              {/* Choice distribution bars */}
              <div className="space-y-2">
                {q.choices.map((choice) => {
                  const count = distribution[choice.id] ?? 0;
                  const percent = pct(count, answers.length);
                  return (
                    <div key={choice.id} className="flex items-center gap-3">
                      <div
                        className={cn(
                          'w-5 h-5 rounded flex-shrink-0 flex items-center justify-center',
                          choice.isCorrect ? 'bg-green-500/30' : 'bg-white/10',
                        )}
                      >
                        {choice.isCorrect && <CheckCircle2 className="w-3 h-3 text-green-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className={cn(
                            'text-sm truncate',
                            choice.isCorrect ? 'font-semibold text-green-400' : 'text-muted-foreground',
                          )}>
                            {choice.text}
                          </p>
                          <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                            {count} ({percent}%)
                          </span>
                        </div>
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all duration-500',
                              choice.isCorrect ? 'bg-green-500' : 'bg-white/20',
                            )}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {questionStats.length === 0 && (
            <div className="glass-card rounded-2xl p-8 text-center">
              <Zap className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No answer data yet. Questions will appear once the game is completed.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
