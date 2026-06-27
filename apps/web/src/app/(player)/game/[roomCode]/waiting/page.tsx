'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { connectSocket } from '@/lib/socket';
import { GameState, SOCKET_EVENTS, type QuestionPayload, type RoomState, type LeaderboardEntry, type AnswerResultPayload } from '@quiz/shared';
import { useGameStore } from '@/stores/game.store';
import { Zap, Wifi } from 'lucide-react';

const AVATAR_EMOJIS: Record<string, string> = { cat: '🐱', dog: '🐶', fox: '🦊', panda: '🐼', lion: '🦁', bear: '🐻', rabbit: '🐰', tiger: '🐯' };

interface PlayerJoinEvent {
  playerId: string;
  nickname: string;
  avatar: string;
  roomState?: RoomState;
  currentQuestion?: QuestionPayload | null;
  leaderboard?: LeaderboardEntry[];
  hasAnswered?: boolean;
  selectedChoiceId?: string | null;
  answerResult?: AnswerResultPayload | null;
  waitingPlayers?: any[];
  serverTimeRemainingMs?: number;
  serverTime?: number;
}

export default function WaitingRoomPage() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const router = useRouter();
  const {
    roomState,
    gameState,
    setCurrentQuestion,
    setPlayerInfo,
    setGameState,
    setRoomState,
    setLeaderboard,
    setHasAnswered,
    setSelectedChoice,
    setAnswerResult,
    setTimeRemaining,
  } = useGameStore();
  const [playerCount, setPlayerCount] = useState(0);
  const [joined, setJoined] = useState(false);
  const [nickname, setNickname] = useState('');
  const [avatar, setAvatar] = useState('cat');
  const [error, setError] = useState('');
  const [localCountdown, setLocalCountdown] = useState(3);

  useEffect(() => {
    const storedNickname = sessionStorage.getItem('quiz_nickname');
    const storedAvatar = sessionStorage.getItem('quiz_avatar') || 'cat';
    const storedPlayerId = sessionStorage.getItem(`quiz_player_${roomCode}`) || undefined;

    if (!storedNickname) {
      router.push('/join');
      return;
    }

    setNickname(storedNickname);
    setAvatar(storedAvatar);

    const socket = connectSocket();
    socket.emit(SOCKET_EVENTS.PLAYER_JOIN, {
      roomCode,
      nickname: storedNickname,
      avatar: storedAvatar,
      playerId: storedPlayerId,
    });

    socket.on(SOCKET_EVENTS.PLAYER_JOINED, (data: PlayerJoinEvent) => {
      sessionStorage.setItem(`quiz_player_${roomCode}`, data.playerId);
      setPlayerInfo(data.playerId, data.nickname, data.avatar);
      setJoined(true);

      if (data.roomState) {
        setGameState(data.roomState.state);
        setRoomState(data.roomState);
        setPlayerCount(data.roomState.playerCount);

        // Restore full game state for reconnecting players
        if (data.currentQuestion) {
          setCurrentQuestion(data.currentQuestion);

          // Sync timer from server-provided remaining time
          if (typeof data.serverTimeRemainingMs === 'number' && data.serverTimeRemainingMs > 0) {
            setTimeRemaining(Math.ceil(data.serverTimeRemainingMs / 1000));
          }
        }

        if (data.leaderboard?.length) setLeaderboard(data.leaderboard);
        if (data.hasAnswered) {
          setHasAnswered(true);
          if (data.selectedChoiceId) setSelectedChoice(data.selectedChoiceId);
          if (data.answerResult) setAnswerResult(data.answerResult);
        }

        // Navigate to the correct screen for current game phase
        if (data.roomState.state === GameState.QUESTION_ACTIVE) {
          router.replace(`/game/${roomCode}/question`);
        } else if (data.roomState.state === GameState.QUESTION_ENDED) {
          // Show result/review screen (question page with ended state)
          router.replace(`/game/${roomCode}/question`);
        } else if (data.roomState.state === GameState.ENDED) {
          router.replace(`/game/${roomCode}/final`);
        } else if (data.roomState.state === GameState.PAUSED) {
          // Reconnected during pause — wait on question page
          if (data.currentQuestion) router.replace(`/game/${roomCode}/question`);
        }
      }
    });

    socket.on(SOCKET_EVENTS.ROOM_STATE, (data: RoomState) => {
      setGameState(data.state);
      setRoomState(data);
    });
    socket.on(SOCKET_EVENTS.QUESTION_SHOW, () => router.replace(`/game/${roomCode}/question`));
    socket.on(SOCKET_EVENTS.ROOM_PLAYERS, (data: { count: number }) => setPlayerCount(data.count));
    socket.on(SOCKET_EVENTS.ERROR, (data: { message: string }) => setError(data.message));

    return () => {
      socket.off(SOCKET_EVENTS.PLAYER_JOINED);
      socket.off(SOCKET_EVENTS.ROOM_STATE);
      socket.off(SOCKET_EVENTS.QUESTION_SHOW);
      socket.off(SOCKET_EVENTS.ROOM_PLAYERS);
      socket.off(SOCKET_EVENTS.ERROR);
    };
  }, [roomCode, router, setCurrentQuestion, setGameState, setPlayerInfo, setRoomState]);

  // Sync starting countdown timer
  useEffect(() => {
    if (gameState === GameState.ACTIVE) {
      const duration = roomState?.countdownDuration ?? 3;
      setLocalCountdown(duration);
      const interval = setInterval(() => {
        setLocalCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [gameState, roomState?.countdownDuration]);

  if (gameState === GameState.ACTIVE) {
    return (
      <div className="fixed inset-0 bg-[#0d0925] flex flex-col items-center justify-center text-white z-50 select-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.15),transparent_60%)] animate-pulse" />
        <div className="text-center space-y-6 max-w-sm px-6 relative z-10">
          <p className="text-violet-400 font-display font-semibold tracking-wider text-lg uppercase">
            Get Ready!
          </p>
          <h2 className="text-2xl font-display font-bold">Game is Starting</h2>
          <div className="relative flex items-center justify-center w-40 h-40 mx-auto mt-6">
            <div className="absolute inset-0 rounded-full border-4 border-violet-500/20 scale-110" />
            <div className="absolute inset-0 rounded-full border-4 border-violet-500 border-t-transparent animate-spin" />
            <span className="text-6xl font-display font-black text-white">
              {localCountdown > 0 ? localCountdown : 'Go!'}
            </span>
          </div>
          <p className="text-muted-foreground text-sm mt-4">Look at the host screen for questions!</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card rounded-2xl p-8 text-center max-w-sm">
          <p className="text-rose-400 text-lg font-semibold mb-4">{error}</p>
          <button
            onClick={() => router.push('/join')}
            className="px-6 py-3 rounded-xl bg-violet-600/20 text-violet-400"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center max-w-md w-full">
        <div className="relative w-24 h-24 mx-auto mb-8">
          <div
            className="absolute inset-0 rounded-full bg-violet-600/20 animate-pulse"
            style={{ transform: 'scale(1.4)' }}
          />
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center relative z-10">
            <Zap className="w-12 h-12 text-white" />
          </div>
        </div>
        <div className="glass-card rounded-2xl p-8">
          <div className="mb-6">
            <p className="text-muted-foreground text-sm mb-1">Room Code</p>
            <p className="font-display text-4xl font-bold tracking-widest text-violet-400">{roomCode}</p>
          </div>
          {joined ? (
            <>
              <div className="w-16 h-16 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-3xl mx-auto mb-4 overflow-hidden">
                {avatar.startsWith('data:image/') ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatar} className="w-full h-full object-cover rounded-full" alt="Avatar" />
                ) : (
                  <span className="select-none">{AVATAR_EMOJIS[avatar] || '🐱'}</span>
                )}
              </div>
              <h2 className="font-display text-xl font-bold mb-2">{nickname}</h2>
              <div className="flex items-center justify-center gap-2 text-green-400 mb-3">
                <Wifi className="w-4 h-4 animate-pulse" />
                <span className="text-sm">Connected and waiting for host</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {playerCount} player{playerCount === 1 ? '' : 's'} in room
              </p>
            </>
          ) : (
            <div className="flex items-center justify-center gap-2 text-muted-foreground mb-6">
              <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
              <span>Joining...</span>
            </div>
          )}
          <div className="flex items-center justify-center gap-2 mt-6">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-3 h-3 rounded-full bg-violet-500"
                style={{ animation: `bounceDot 1.2s ${i * 0.2}s ease-in-out infinite` }}
              />
            ))}
          </div>
          <p className="text-muted-foreground text-sm mt-4">The game will start soon...</p>
        </div>
      </div>
      <style jsx>{`
        @keyframes bounceDot {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-12px); }
        }
      `}</style>
    </div>
  );
}

