'use client';

import { useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useGame } from '@/hooks/useGame';
import { useGameStore } from '@/stores/game.store';
import { cn, getRankEmoji } from '@/lib/utils';
import { RotateCcw, Home } from 'lucide-react';
import Link from 'next/link';

const AVATAR_EMOJIS: Record<string, string> = { cat: '🐱', dog: '🐶', fox: '🦊', panda: '🐼', lion: '🦁', bear: '🐻', rabbit: '🐰', tiger: '🐯' };
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export default function FinalPage() {
  const { roomCode } = useParams<{ roomCode: string }>();
  useGame(roomCode);

  const { leaderboard, myPlayerId, reset } = useGameStore();
  const clapRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(`${BASE_PATH}/sounds/clap.mp3`);
    audio.volume = 0.7;
    clapRef.current = audio;

    // Try autoplay; if blocked, play on first touch/click (mobile autoplay policy)
    audio.play().catch(() => {
      const unlock = () => {
        audio.play().catch(() => null);
        document.removeEventListener('pointerdown', unlock);
      };
      document.addEventListener('pointerdown', unlock, { once: true });
    });

    return () => {
      audio.pause();
      clapRef.current = null;
    };
  }, []);
  const myEntry = leaderboard.find((entry) => entry.playerId === myPlayerId);

  return (
    <div className="min-h-screen flex flex-col items-center justify-start p-6 pt-12">
      <div className="text-center mb-10">
        <div className="text-6xl mb-4">Final</div>
        <h1 className="font-display text-4xl font-bold mb-2">
          <span className="gradient-text">Game Over!</span>
        </h1>
        {myEntry ? (
          <p className="text-muted-foreground">
            You finished {getRankEmoji(myEntry.rank)} with{' '}
            <span className="font-bold text-foreground">{myEntry.score.toLocaleString()} pts</span>
          </p>
        ) : (
          <p className="text-muted-foreground">Final standings are ready.</p>
        )}
      </div>

      {leaderboard.length >= 1 && (
        <div className="flex items-end gap-4 mb-10 w-full max-w-lg justify-center">
          {leaderboard[1] && (
            <div className="text-center flex-1">
              <div className="w-16 h-16 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-3xl mx-auto mb-2 overflow-hidden shadow-lg">
                {leaderboard[1].avatar && leaderboard[1].avatar.startsWith('data:image/') ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={leaderboard[1].avatar} className="w-full h-full object-cover" alt="" />
                ) : (
                  <span className="select-none">{AVATAR_EMOJIS[leaderboard[1].avatar] || '🐱'}</span>
                )}
              </div>
              <div className="text-3xl mb-1">2nd</div>
              <p className="font-semibold text-sm truncate">{leaderboard[1].nickname}</p>
              <p className="text-muted-foreground text-xs">{leaderboard[1].score.toLocaleString()}</p>
              <div className="mt-2 bg-slate-500/30 rounded-t-xl h-20" />
            </div>
          )}

          {leaderboard[0] && (
            <div className="text-center flex-1">
              <div className="w-20 h-20 rounded-full bg-white/10 border-4 border-yellow-400 flex items-center justify-center text-4xl mx-auto mb-2 overflow-hidden shadow-2xl ring-4 ring-yellow-400/30">
                {leaderboard[0].avatar && leaderboard[0].avatar.startsWith('data:image/') ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={leaderboard[0].avatar} className="w-full h-full object-cover" alt="" />
                ) : (
                  <span className="select-none">{AVATAR_EMOJIS[leaderboard[0].avatar] || '🐱'}</span>
                )}
              </div>
              <div className="text-4xl mb-1">1st</div>
              <p className="font-bold truncate">{leaderboard[0].nickname}</p>
              <p className="gradient-text font-bold">{leaderboard[0].score.toLocaleString()}</p>
              <div className="mt-2 bg-amber-500/30 rounded-t-xl h-32" />
            </div>
          )}

          {leaderboard[2] && (
            <div className="text-center flex-1">
              <div className="w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-2xl mx-auto mb-2 overflow-hidden shadow-md">
                {leaderboard[2].avatar && leaderboard[2].avatar.startsWith('data:image/') ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={leaderboard[2].avatar} className="w-full h-full object-cover" alt="" />
                ) : (
                  <span className="select-none">{AVATAR_EMOJIS[leaderboard[2].avatar] || '🐱'}</span>
                )}
              </div>
              <div className="text-3xl mb-1">3rd</div>
              <p className="font-semibold text-sm truncate">{leaderboard[2].nickname}</p>
              <p className="text-muted-foreground text-xs">{leaderboard[2].score.toLocaleString()}</p>
              <div className="mt-2 bg-orange-800/30 rounded-t-xl h-14" />
            </div>
          )}
        </div>
      )}

      <div className="w-full max-w-md space-y-2 mb-8">
        {leaderboard.slice(3).map((entry) => {
          const isMe = entry.playerId === myPlayerId;
          return (
            <div
              key={entry.playerId}
              className={cn(
                'flex items-center gap-3 p-3 rounded-xl glass',
                isMe && 'border border-violet-500/50 bg-violet-500/10',
              )}
            >
              <span className="text-muted-foreground w-8 text-center font-mono text-sm">#{entry.rank}</span>
              <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-lg overflow-hidden flex-shrink-0">
                {entry.avatar && entry.avatar.startsWith('data:image/') ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={entry.avatar} className="w-full h-full object-cover" alt="" />
                ) : (
                  <span className="select-none">{AVATAR_EMOJIS[entry.avatar] || '🐱'}</span>
                )}
              </div>
              <span className={cn('flex-1 text-sm font-medium', isMe && 'text-violet-400')}>
                {entry.nickname} {isMe && '(You)'}
              </span>
              <span className="font-bold text-sm">{entry.score.toLocaleString()}</span>
            </div>
          );
        })}
      </div>

      <div className="flex gap-4">
        <Link
          href="/join"
          onClick={reset}
          className="flex items-center gap-2 px-6 py-3 rounded-xl glass hover:bg-white/10 transition-colors"
        >
          <RotateCcw className="w-4 h-4" /> Play Again
        </Link>
        <Link
          href="/"
          onClick={reset}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold hover:opacity-90 transition-opacity"
        >
          <Home className="w-4 h-4" /> Home
        </Link>
      </div>
    </div>
  );
}

