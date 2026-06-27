'use client';

import { useParams } from 'next/navigation';
import { useGame } from '@/hooks/useGame';
import { useGameStore } from '@/stores/game.store';
import { cn, getAvatarColor, getInitials, getRankEmoji } from '@/lib/utils';
import { CheckCircle2, Clock3, XCircle } from 'lucide-react';

const AVATAR_EMOJIS: Record<string, string> = { cat: '🐱', dog: '🐶', fox: '🦊', panda: '🐼', lion: '🦁', bear: '🐻', rabbit: '🐰', tiger: '🐯' };

export default function ResultPage() {
  const { roomCode } = useParams<{ roomCode: string }>();
  useGame(roomCode);

  const { answerResult, leaderboard, myPlayerId, currentQuestion } = useGameStore();
  const myEntry = leaderboard.find((entry) => entry.playerId === myPlayerId);
  const topThree = leaderboard.slice(0, 3);

  return (
    <div className="min-h-screen p-6 md:p-8">
      <div className="mx-auto grid max-w-6xl gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="glass-card rounded-3xl p-8 text-center">
          {answerResult?.correct ? (
            <CheckCircle2 className="mx-auto h-20 w-20 text-emerald-400" />
          ) : (
            <XCircle className="mx-auto h-20 w-20 text-rose-400" />
          )}

          <p className="mt-6 text-sm uppercase tracking-[0.24em] text-muted-foreground">
            Question Result
          </p>
          <h1 className="mt-2 font-display text-4xl font-bold">
            {answerResult?.correct ? 'Correct' : 'Not quite'}
          </h1>

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm text-muted-foreground">Points earned</p>
            <p className="mt-2 font-display text-5xl font-bold text-violet-300">
              +{answerResult?.points?.toLocaleString() ?? 0}
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Total score{' '}
              <span className="font-semibold text-foreground">
                {answerResult?.totalScore?.toLocaleString() ?? 0}
              </span>
            </p>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 text-left">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Streak</p>
              <p className="mt-2 text-2xl font-semibold text-orange-300">
                x{answerResult?.streak ?? 0}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Response Time</p>
              <p className="mt-2 text-2xl font-semibold">
                {answerResult?.timeMs ? (answerResult.timeMs / 1000).toFixed(1) : '0.0'}s
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-dashed border-white/10 p-4 text-sm text-muted-foreground">
            {currentQuestion ? `Question ${currentQuestion.questionIndex + 1} finished.` : 'Question finished.'} Waiting for the host to continue.
          </div>
        </section>

        <section className="space-y-6">
          <div className="glass-card rounded-3xl p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-2xl font-semibold">Live Leaderboard</h2>
              {myEntry && (
                <span className="rounded-full bg-violet-500/15 px-3 py-1 text-sm font-medium text-violet-300">
                  {getRankEmoji(myEntry.rank)} Rank #{myEntry.rank}
                </span>
              )}
            </div>

            {topThree.length > 0 && (
              <div className="grid gap-3 md:grid-cols-3">
                {topThree.map((entry) => (
                  <div
                    key={entry.playerId}
                    className={cn(
                      'rounded-2xl border border-white/10 bg-white/5 p-4 text-center',
                      entry.playerId === myPlayerId && 'border-violet-500/40 bg-violet-500/10',
                    )}
                  >
                    <div
                      className={cn(
                        'mx-auto flex h-14 w-14 items-center justify-center rounded-full text-2xl bg-white/10 border border-white/20 flex-shrink-0 overflow-hidden',
                        entry.playerId === myPlayerId && 'border-violet-500/50 bg-violet-600/20',
                      )}
                    >
                      {entry.avatar && entry.avatar.startsWith('data:image/') ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={entry.avatar} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <span className="select-none">{AVATAR_EMOJIS[entry.avatar] || '🐱'}</span>
                      )}
                    </div>
                    <p className="mt-3 font-semibold">{entry.nickname}</p>
                    <p className="text-sm text-muted-foreground">#{entry.rank}</p>
                    <p className="mt-2 font-display text-2xl font-bold text-violet-300">
                      {entry.score.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 space-y-3">
              {leaderboard.map((entry) => (
                <div
                  key={entry.playerId}
                  className={cn(
                    'flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3',
                    entry.playerId === myPlayerId && 'border-violet-500/40 bg-violet-500/10',
                  )}
                >
                  <span className="w-8 text-center font-mono text-sm text-muted-foreground">#{entry.rank}</span>
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full text-xl bg-white/10 border border-white/20 flex-shrink-0 overflow-hidden"
                  >
                    {entry.avatar && entry.avatar.startsWith('data:image/') ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={entry.avatar} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <span className="select-none">{AVATAR_EMOJIS[entry.avatar] || '🐱'}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {entry.nickname} {entry.playerId === myPlayerId ? '(You)' : ''}
                    </p>
                    <p className="text-xs text-muted-foreground">Streak {entry.streak}</p>
                  </div>
                  <p className="font-semibold text-violet-300">{entry.score.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card rounded-3xl p-6">
            <div className="flex items-start gap-3">
              <Clock3 className="mt-0.5 h-5 w-5 text-muted-foreground" />
              <div>
                <h3 className="font-semibold">Next step</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  This screen will move automatically when the host starts the next question or ends the game.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

