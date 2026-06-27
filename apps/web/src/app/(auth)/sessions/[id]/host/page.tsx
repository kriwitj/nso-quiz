'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { sessionApi } from '@/lib/api';
import { connectSocket } from '@/lib/socket';
import { cn, getAvatarColor, getInitials } from '@/lib/utils';
import { GameState, SOCKET_EVENTS, type LeaderboardEntry, type QuestionPayload } from '@quiz/shared';
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  CirclePause,
  Flag,
  Play,
  SkipForward,
  TimerReset,
  Trophy,
  Users,
  Copy,
  Check,
  Clock,
  Tv,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface HostSessionPlayer {
  id: string;
  nickname: string;
  avatar: string;
  totalScore: number;
  rank: number | null;
  streak?: number;
}

interface HostSessionData {
  id: string;
  quizId: string;
  roomCode: string;
  status: string;
  quiz: {
    id: string;
    title: string;
    questions: Array<{
      id: string;
      type?: string;
      text: string;
      timeLimit: number;
      points?: number;
      choices: Array<{ id: string; text: string }>;
    }>;
  };
  playerSessions: HostSessionPlayer[];
  leaderboard?: Array<{ playerSessionId: string; nickname: string; avatar: string; totalScore: number; rank: number }>;
}

interface WaitingPlayer {
  playerId: string;
  nickname: string;
  avatar: string;
  score: number;
  streak: number;
  socketId: string;
}

const AVATAR_EMOJIS: Record<string, string> = {
  cat: '🐱',
  dog: '🐶',
  fox: '🦊',
  panda: '🐼',
  lion: '🦁',
  bear: '🐻',
  rabbit: '🐰',
  tiger: '🐯',
};

const CHOICE_COLORS = [
  { bg: 'from-red-500 to-rose-600', hover: 'hover:from-red-600 hover:to-rose-700', icon: '▲', colorName: 'Red' },
  { bg: 'from-blue-500 to-cyan-600', hover: 'hover:from-blue-600 hover:to-cyan-700', icon: '♦', colorName: 'Blue' },
  { bg: 'from-yellow-500 to-amber-600', hover: 'hover:from-yellow-600 hover:to-amber-700', icon: '●', colorName: 'Yellow' },
  { bg: 'from-green-500 to-emerald-600', hover: 'hover:from-green-600 hover:to-emerald-700', icon: '■', colorName: 'Green' },
];

export default function HostSessionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: auth } = useSession();
  const [roomCode, setRoomCode] = useState('');
  const [gameState, setGameState] = useState<GameState>(GameState.WAITING);
  const [players, setPlayers] = useState<WaitingPlayer[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionPayload | null>(null);
  const [questionEnded, setQuestionEnded] = useState(false);

  // Redesign state variables
  const [countdownDuration, setCountdownDuration] = useState(3);
  const [localCountdown, setLocalCountdown] = useState(3);
  const [answersCount, setAnswersCount] = useState(0);
  const [choiceDistribution, setChoiceDistribution] = useState<Record<string, number>>({});
  const [showScoreboard, setShowScoreboard] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [copied, setCopied] = useState(false);
  const [correctChoiceIds, setCorrectChoiceIds] = useState<string[]>([]);
  const [lobbyTheme, setLobbyTheme] = useState<'neon' | 'sunset' | 'mint'>('neon');

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data, isLoading, isError } = useQuery<HostSessionData>({
    queryKey: ['session', id],
    queryFn: () => sessionApi.get(id).then((res) => res.data),
    enabled: Boolean(id),
  });

  const joinUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/join?code=${roomCode || data?.roomCode}`;
  }, [roomCode, data?.roomCode]);

  const qrCodeUrl = useMemo(() => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(joinUrl)}&color=8b5cf6&bgcolor=ffffff`;
  }, [joinUrl]);

  useEffect(() => {
    if (!data) return;

    setRoomCode(data.roomCode);
    setPlayers(
      data.playerSessions.map((player) => ({
        playerId: player.id,
        nickname: player.nickname,
        avatar: player.avatar,
        score: player.totalScore,
        streak: player.streak ?? 0,
        socketId: '',
      })),
    );

    if (data.leaderboard?.length) {
      setLeaderboard(
        data.leaderboard.map((entry) => ({
          rank: entry.rank,
          playerId: entry.playerSessionId,
          nickname: entry.nickname,
          avatar: entry.avatar,
          score: entry.totalScore,
          streak: 0,
        })),
      );
    }

    if (data.status === 'COMPLETED') {
      setGameState(GameState.ENDED);
    }
  }, [data]);

  // Handle Client-Side Start Countdown
  useEffect(() => {
    if (gameState === GameState.ACTIVE) {
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
  }, [gameState]);

  // Handle Question Timer Countdown
  useEffect(() => {
    if (gameState === GameState.QUESTION_ACTIVE && timeRemaining > 0 && !isPaused) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((t) => {
          if (t <= 1) {
            clearInterval(timerRef.current!);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState, timeRemaining, isPaused]);

  useEffect(() => {
    if (!data || !roomCode) return;
    if (!currentQuestion && gameState === GameState.QUESTION_ACTIVE && data.quiz.questions.length > 0) {
      const fallbackIndex = 0;
      const fallbackQuestion = data.quiz.questions[fallbackIndex];
      setCurrentQuestion({
        id: fallbackQuestion.id,
        type: (fallbackQuestion.type as any) ?? 'MULTIPLE_CHOICE',
        text: fallbackQuestion.text,
        timeLimit: fallbackQuestion.timeLimit,
        points: fallbackQuestion.points ?? 1000,
        questionIndex: fallbackIndex,
        totalQuestions: data.quiz.questions.length,
        choices: fallbackQuestion.choices,
      });
      setTimeRemaining(fallbackQuestion.timeLimit);
    }
  }, [currentQuestion, data, gameState, roomCode]);

  useEffect(() => {
    if (!data?.quizId || !auth?.user?.id) return;

    const socket = connectSocket();

    socket.on(
      SOCKET_EVENTS.ROOM_STATE,
      (payload: {
        roomCode?: string;
        state: GameState;
        playerCount?: number;
        currentQuestionIndex?: number;
        totalQuestions?: number;
        countdownDuration?: number;
        serverTimeRemainingMs?: number;
        answersCount?: number;
      }) => {
        if (payload.roomCode) {
          setRoomCode(payload.roomCode);
        }
        setGameState(payload.state);
        setQuestionEnded(payload.state === GameState.QUESTION_ENDED);
        
        if (payload.state === GameState.ACTIVE) {
          setLocalCountdown(payload.countdownDuration ?? countdownDuration);
        }
        
        if (payload.state === GameState.PAUSED) {
          setIsPaused(true);
        } else {
          setIsPaused(false);
        }

        if (payload.state === GameState.QUESTION_ACTIVE) {
          if (typeof payload.serverTimeRemainingMs === 'number') {
            setTimeRemaining(Math.ceil(payload.serverTimeRemainingMs / 1000));
          }
          if (typeof payload.answersCount === 'number') {
            setAnswersCount(payload.answersCount);
          }
        }

        if (
          typeof payload.currentQuestionIndex === 'number' &&
          data.quiz.questions[payload.currentQuestionIndex]
        ) {
          const question = data.quiz.questions[payload.currentQuestionIndex];
          setCurrentQuestion({
            id: question.id,
            type: (question.type as any) ?? 'MULTIPLE_CHOICE',
            text: question.text,
            timeLimit: question.timeLimit,
            points: question.points ?? 1000,
            questionIndex: payload.currentQuestionIndex,
            totalQuestions: payload.totalQuestions ?? data.quiz.questions.length,
            choices: question.choices,
          });
        }
      },
    );

    socket.on(
      SOCKET_EVENTS.ROOM_PLAYERS,
      (payload: { players: WaitingPlayer[]; count: number }) => {
        setPlayers(payload.players);
      },
    );

    socket.on(SOCKET_EVENTS.QUESTION_SHOW, (payload: QuestionPayload) => {
      setCurrentQuestion(payload);
      setQuestionEnded(false);
      setAnswersCount(0);
      setShowScoreboard(false);
      setTimeRemaining(payload.timeLimit);
      setCorrectChoiceIds([]);
      setGameState(GameState.QUESTION_ACTIVE);
    });

    socket.on(SOCKET_EVENTS.QUESTION_END, (payload: { correctChoiceIds: string[]; distribution?: Record<string, number> }) => {
      setQuestionEnded(true);
      setCorrectChoiceIds(payload.correctChoiceIds || []);
      setChoiceDistribution(payload.distribution || {});
      setGameState(GameState.QUESTION_ENDED);
      setTimeRemaining(0);
    });

    socket.on('timer:sync', (payload: { expiryTimestamp: number }) => {
      const remainingSec = Math.max(0, Math.ceil((payload.expiryTimestamp - Date.now()) / 1000));
      setTimeRemaining(remainingSec);
      setIsPaused(false);
    });

    socket.on('answer:submitted', (payload: { answerCount: number }) => {
      setAnswersCount(payload.answerCount);
    });

    socket.on(
      SOCKET_EVENTS.LEADERBOARD_UPDATE,
      (payload: { leaderboard: LeaderboardEntry[] }) => {
        setLeaderboard(payload.leaderboard);
      },
    );

    socket.on(
      SOCKET_EVENTS.GAME_END,
      (payload: { leaderboard: LeaderboardEntry[]; sessionId: string }) => {
        setLeaderboard(payload.leaderboard);
        setGameState(GameState.ENDED);
      },
    );

    socket.on(SOCKET_EVENTS.ERROR, (payload: { message: string }) => {
      toast.error(payload.message);
    });

    socket.emit(SOCKET_EVENTS.ROOM_CREATE, {
      quizId: data.quizId,
      hostId: auth.user.id,
      sessionId: data.id,
    });

    return () => {
      socket.off(SOCKET_EVENTS.ROOM_STATE);
      socket.off(SOCKET_EVENTS.ROOM_PLAYERS);
      socket.off(SOCKET_EVENTS.QUESTION_SHOW);
      socket.off(SOCKET_EVENTS.QUESTION_END);
      socket.off(SOCKET_EVENTS.LEADERBOARD_UPDATE);
      socket.off(SOCKET_EVENTS.GAME_END);
      socket.off(SOCKET_EVENTS.ERROR);
      socket.off('timer:sync');
      socket.off('answer:submitted');
    };
  }, [auth?.user?.id, data?.id, data?.quizId, data?.roomCode, data?.status]);

  const questionProgress = useMemo(() => {
    if (!currentQuestion) return `0 / ${data?.quiz.questions.length ?? 0}`;
    return `${currentQuestion.questionIndex + 1} / ${currentQuestion.totalQuestions}`;
  }, [currentQuestion, data?.quiz.questions.length]);

  const handleStart = () => {
    if (!roomCode) return;
    connectSocket().emit(SOCKET_EVENTS.ROOM_START, { roomCode, countdownDuration });
  };

  const handleNext = () => {
    if (!roomCode) return;
    connectSocket().emit(SOCKET_EVENTS.QUESTION_NEXT, { roomCode });
  };

  const handleSkip = () => {
    if (!roomCode) return;
    connectSocket().emit(SOCKET_EVENTS.QUESTION_SKIP, { roomCode });
  };

  const handleEnd = () => {
    if (!roomCode) return;
    connectSocket().emit(SOCKET_EVENTS.ROOM_END, { roomCode });
  };

  const handlePause = () => {
    if (!roomCode) return;
    connectSocket().emit(SOCKET_EVENTS.ROOM_PAUSE, { roomCode });
  };

  const handleResume = () => {
    if (!roomCode) return;
    connectSocket().emit(SOCKET_EVENTS.ROOM_RESUME, { roomCode });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    toast.success('Join link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground font-display text-lg">Initializing session...</p>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mx-auto max-w-xl p-8">
        <div className="glass-card rounded-3xl p-8 text-center space-y-6">
          <AlertCircle className="mx-auto h-16 w-16 text-rose-400" />
          <h1 className="font-display text-2xl font-bold">Session Unavailable</h1>
          <p className="text-sm text-muted-foreground">This session could not be loaded or is invalid.</p>
          <button onClick={() => router.push('/quizzes')} className="w-full py-3 rounded-xl bg-violet-600 font-semibold text-white">
            Back to Quizzes
          </button>
        </div>
      </div>
    );
  }

  // CHOICE DISTRIBUTION CALCULATION FOR CHARTS
  const maxChoiceAnswers = Math.max(...Object.values(choiceDistribution), 1);

  // RENDER BASED ON GAMESTATE (PRESENTATION-MODE LOBBY AND WORKFLOW)

  // 1. COUNTDOWN VIEW
  if (gameState === GameState.ACTIVE) {
    return (
      <div className="fixed inset-0 bg-[#0a051b] flex flex-col items-center justify-center z-50 text-white select-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.15),transparent_60%)] animate-pulse" />
        <div className="text-center space-y-6 max-w-2xl px-6 relative z-10">
          <p className="text-violet-400 font-display font-semibold tracking-wider text-xl uppercase">
            Get Ready!
          </p>
          <h1 className="text-4xl md:text-5xl font-display font-bold">{data.quiz.title}</h1>
          <p className="text-muted-foreground text-lg">
            Question 1 starting in...
          </p>
          <div className="relative flex items-center justify-center w-56 h-56 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-violet-500/20 scale-110" />
            <div className="absolute inset-0 rounded-full border-4 border-violet-500 border-t-transparent animate-spin duration-1000" />
            <span className="text-8xl md:text-9xl font-display font-black text-violet-400 animate-ping absolute">
              {localCountdown > 0 ? localCountdown : 'Go!'}
            </span>
            <span className="text-8xl md:text-9xl font-display font-black text-white relative">
              {localCountdown > 0 ? localCountdown : 'Go!'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 2. ACTIVE QUESTION VIEW
  if (gameState === GameState.QUESTION_ACTIVE && currentQuestion) {
    const timerPercent = (timeRemaining / currentQuestion.timeLimit) * 100;
    const timerColor = timerPercent > 50 ? 'border-emerald-500 text-emerald-400' : timerPercent > 25 ? 'border-yellow-500 text-yellow-400' : 'border-rose-500 text-rose-400';

    return (
      <div className="fixed inset-0 bg-[#0d0925] flex flex-col z-40 text-white select-none">
        {/* Floating Host Controls Overlay */}
        <div className="absolute top-4 right-4 z-50 flex items-center gap-2 bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-2.5">
          <button onClick={handlePause} disabled={isPaused} className="p-2.5 rounded-xl hover:bg-white/10 text-yellow-300 disabled:opacity-40" title="Pause">
            <CirclePause className="w-5 h-5" />
          </button>
          <button onClick={handleSkip} className="p-2.5 rounded-xl hover:bg-white/10 text-amber-400" title="Skip">
            <SkipForward className="w-5 h-5" />
          </button>
          <button onClick={handleEnd} className="p-2.5 rounded-xl hover:bg-white/10 text-rose-400" title="End Game">
            <Flag className="w-5 h-5" />
          </button>
        </div>

        {/* Pause Screen Overlay */}
        {isPaused && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-45 flex flex-col items-center justify-center">
            <div className="text-center space-y-4">
              <CirclePause className="w-24 h-24 text-yellow-400 mx-auto animate-pulse" />
              <h2 className="text-3xl font-display font-bold">Game Paused</h2>
              <p className="text-muted-foreground mb-6">Presenting shared screen is temporarily paused.</p>
              <button onClick={handleResume} className="px-8 py-3 rounded-xl bg-emerald-600 font-bold hover:bg-emerald-500 transition-colors">
                Resume Presentation
              </button>
            </div>
          </div>
        )}

        {/* Top Panel - Question */}
        <div className="flex-1 flex flex-col justify-center items-center px-6 md:px-12 py-8 max-w-5xl mx-auto w-full text-center">
          <div className="space-y-4 w-full">
            <span className="text-xs md:text-sm font-semibold tracking-widest uppercase text-violet-400 bg-violet-500/10 px-3.5 py-1.5 rounded-full border border-violet-500/20">
              Question {currentQuestion.questionIndex + 1} of {currentQuestion.totalQuestions}
            </span>
            <h1 className="text-3xl md:text-5xl font-display font-extrabold leading-tight tracking-tight mt-4">
              {currentQuestion.text}
            </h1>
          </div>

          {/* Timer and Answers Grid */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-12 mt-10 w-full">
            {/* Circular Timer */}
            <div className="relative flex items-center justify-center w-40 h-40">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="transparent"
                  stroke="currentColor"
                  strokeWidth="8"
                  className={cn("transition-all duration-1000", timerPercent > 50 ? 'text-emerald-500' : timerPercent > 25 ? 'text-yellow-500' : 'text-rose-500')}
                  strokeDasharray={314.16}
                  strokeDashoffset={314.16 - (314.16 * timerPercent) / 100}
                />
              </svg>
              <div className="absolute text-center">
                <span className="text-4xl md:text-5xl font-display font-black block">
                  {timeRemaining}
                </span>
                <span className="text-xs uppercase tracking-widest text-muted-foreground">Seconds</span>
              </div>
            </div>

            {/* Answer count */}
            <div className="text-center md:text-left space-y-2">
              <span className="text-5xl md:text-7xl font-display font-black text-violet-400 block animate-bounce">
                {answersCount}
              </span>
              <p className="text-lg md:text-xl font-medium text-muted-foreground flex items-center gap-2">
                <Users className="w-5 h-5" /> Answers Submitted
              </p>
              <p className="text-sm text-muted-foreground/60">
                Out of {players.length} active player{players.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Panel - 4 choices blocks */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 md:p-8 bg-black/20 border-t border-white/5 w-full">
          {currentQuestion.choices.map((choice, idx) => {
            const colors = CHOICE_COLORS[idx % CHOICE_COLORS.length];
            return (
              <div
                key={choice.id}
                className={cn(
                  "relative flex items-center p-5 md:p-6 rounded-2xl text-left border border-white/10 bg-gradient-to-br min-h-24 md:min-h-28 overflow-hidden",
                  colors.bg
                )}
              >
                <div className="absolute top-2 right-4 text-white/10 text-7xl font-black select-none">
                  {colors.icon}
                </div>
                <div className="flex items-center gap-4 relative z-10">
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl font-black text-white shrink-0 shadow-lg">
                    {colors.icon}
                  </div>
                  <span className="text-lg md:text-xl font-bold tracking-wide drop-shadow-md">
                    {choice.text}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 3. QUESTION ENDED VIEW (RESULTS OR LEADERBOARD)
  if (gameState === GameState.QUESTION_ENDED && currentQuestion) {
    const isLastQuestion = currentQuestion.questionIndex + 1 === currentQuestion.totalQuestions;

    return (
      <div className="fixed inset-0 bg-[#090518] flex flex-col z-40 text-white select-none">
        {/* Floating Host Controls Overlay */}
        <div className="absolute top-4 right-4 z-50 flex items-center gap-2 bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-2">
          {!showScoreboard ? (
            <button
              onClick={() => setShowScoreboard(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-violet-600 text-white font-bold hover:bg-violet-500 transition-colors text-sm"
            >
              <Trophy className="w-4 h-4" /> Show Scoreboard
            </button>
          ) : (
            <button
              onClick={isLastQuestion ? handleEnd : handleNext}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-500 transition-colors text-sm"
            >
              {isLastQuestion ? 'End Game' : 'Next Question'} <ArrowRight className="w-4 h-4" />
            </button>
          )}
          <button onClick={handleEnd} className="p-2.5 rounded-xl hover:bg-white/10 text-rose-400" title="Force End">
            <Flag className="w-4 h-4" />
          </button>
        </div>

        {!showScoreboard ? (
          /* Choice Distribution View */
          <div className="flex-1 flex flex-col justify-between p-6 md:p-12 max-w-5xl mx-auto w-full">
            {/* Header */}
            <div className="text-center space-y-3 mt-4">
              <span className="text-xs uppercase font-bold tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                Time is up!
              </span>
              <h1 className="text-2xl md:text-4xl font-display font-extrabold mt-3 leading-tight">
                {currentQuestion.text}
              </h1>
            </div>

            {/* Answer Distribution Chart */}
            <div className="flex-1 flex items-end justify-center gap-4 md:gap-8 max-w-3xl mx-auto w-full my-8 h-64 md:h-80 border-b border-white/10 pb-2">
              {currentQuestion.choices.map((choice, idx) => {
                const count = choiceDistribution[choice.id] || 0;
                const percent = (count / maxChoiceAnswers) * 100;
                const colors = CHOICE_COLORS[idx % CHOICE_COLORS.length];
                const isCorrect = correctChoiceIds.includes(choice.id);

                return (
                  <div key={choice.id} className="flex-1 flex flex-col items-center justify-end h-full group">
                    <span className="text-sm md:text-lg font-bold mb-2">{count}</span>
                    <div
                      className={cn(
                        "w-full rounded-t-xl bg-gradient-to-t transition-all duration-1000",
                        colors.bg,
                        isCorrect ? "ring-4 ring-emerald-400/60 shadow-[0_0_20px_rgba(52,211,153,0.3)]" : "opacity-40"
                      )}
                      style={{ height: `${Math.max(percent, 8)}%` }}
                    />
                    <div className="mt-3 flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-xl bg-white/5 border border-white/10 text-sm md:text-lg font-black">
                      {colors.icon}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Choices list showing correct answer */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
              {currentQuestion.choices.map((choice, idx) => {
                const isCorrect = correctChoiceIds.includes(choice.id);
                const colors = CHOICE_COLORS[idx % CHOICE_COLORS.length];

                return (
                  <div
                    key={choice.id}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-xl border text-sm md:text-base transition-all",
                      isCorrect
                        ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                        : "bg-white/5 border-white/10 text-muted-foreground opacity-50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold", isCorrect ? "bg-emerald-600" : "bg-white/10")}>
                        {colors.icon}
                      </div>
                      <span className="font-semibold">{choice.text}</span>
                    </div>
                    {isCorrect && (
                      <span className="bg-emerald-500 text-white text-xs px-2.5 py-1 rounded-full font-bold">
                        Correct Choice
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* scoreboard view */
          <div className="flex-1 flex flex-col justify-center items-center p-6 md:p-12 max-w-4xl mx-auto w-full">
            <div className="text-center space-y-3 mb-10">
              <Trophy className="w-16 h-16 text-yellow-400 mx-auto animate-bounce" />
              <h1 className="text-3xl md:text-5xl font-display font-black tracking-tight uppercase">
                Scoreboard
              </h1>
              <p className="text-muted-foreground text-lg">
                Question {currentQuestion.questionIndex + 1} of {currentQuestion.totalQuestions}
              </p>
            </div>

            {/* Leaderboard List */}
            <div className="w-full space-y-3">
              {leaderboard.slice(0, 5).map((entry, idx) => {
                const isTop3 = idx < 3;
                const rankColor = idx === 0 ? 'bg-amber-400 text-black font-black' : idx === 1 ? 'bg-slate-300 text-black font-black' : idx === 2 ? 'bg-amber-700 text-white font-black' : 'bg-white/5 border border-white/10 text-muted-foreground';

                return (
                  <div
                    key={entry.playerId}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-2xl border border-white/10 bg-white/5 transition-transform hover:scale-[1.02]",
                      idx === 0 && "border-amber-400/40 bg-gradient-to-r from-amber-500/10 to-transparent shadow-[0_0_20px_rgba(245,158,11,0.08)]"
                    )}
                  >
                    <span className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-inner", rankColor)}>
                      #{idx + 1}
                    </span>
                    <div className="w-10 h-10 shrink-0 select-none flex items-center justify-center text-3xl md:text-4xl rounded-full overflow-hidden bg-white/5 border border-white/10">
                      {entry.avatar && entry.avatar.startsWith('data:image/') ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={entry.avatar} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <span>{AVATAR_EMOJIS[entry.avatar] || '🐱'}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-lg md:text-xl font-bold">{entry.nickname}</p>
                      {entry.streak > 1 && (
                        <p className="text-xs text-orange-400 flex items-center gap-1 mt-0.5">
                          🔥 Answer Streak ×{entry.streak}!
                        </p>
                      )}
                    </div>
                    <p className="text-xl md:text-2xl font-display font-black text-violet-300">
                      {entry.score.toLocaleString()}
                    </p>
                  </div>
                );
              })}

              {leaderboard.length === 0 && (
                <div className="text-center py-12 text-muted-foreground italic glass-card rounded-2xl">
                  No player scores yet.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // 4. GAME END / PODIUM VIEW
  if (gameState === GameState.ENDED) {
    const sortedPodium = [...leaderboard].slice(0, 3);
    // Reposition as [2nd Place, 1st Place, 3rd Place] for visual podium structure
    const displayPodium = [];
    if (sortedPodium[1]) displayPodium.push({ ...sortedPodium[1], place: 2 });
    if (sortedPodium[0]) displayPodium.push({ ...sortedPodium[0], place: 1 });
    if (sortedPodium[2]) displayPodium.push({ ...sortedPodium[2], place: 3 });

    return (
      <div className="fixed inset-0 bg-[#070312] flex flex-col justify-between p-6 md:p-12 z-40 text-white select-none overflow-hidden">
        {/* CSS Confetti Effect Overlay */}
        <div className="absolute inset-0 pointer-events-none z-45">
          {[...Array(15)].map((_, i) => (
            <div
              key={i}
              className="absolute text-4xl animate-bounce select-none"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${-20 - Math.random() * 50}px`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${3 + Math.random() * 4}s`,
                opacity: 0.6,
                transform: `rotate(${Math.random() * 360}deg)`,
              }}
            >
              🎉🎈✨🏆
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="text-center space-y-3 mt-4 relative z-10">
          <Trophy className="w-16 h-16 text-yellow-400 mx-auto animate-pulse" />
          <h1 className="text-3xl md:text-5xl font-display font-black tracking-tight uppercase">
            Game Over!
          </h1>
          <p className="text-muted-foreground text-lg">{data.quiz.title} final results</p>
        </div>

        {/* 3D Podium Layout */}
        <div className="flex-1 flex items-end justify-center gap-3 md:gap-6 max-w-3xl mx-auto w-full my-12 h-64 md:h-96 relative z-10">
          {displayPodium.map((player) => {
            const is1st = player.place === 1;
            const is2nd = player.place === 2;

            const heightClass = is1st ? 'h-[75%]' : is2nd ? 'h-[50%]' : 'h-[35%]';
            const columnBg = is1st
              ? 'from-amber-400 to-yellow-600 shadow-[0_0_30px_rgba(245,158,11,0.2)]'
              : is2nd
              ? 'from-slate-400 to-slate-600'
              : 'from-amber-700 to-amber-900';

            return (
              <div key={player.playerId} className="flex-1 flex flex-col items-center justify-end h-full">
                {/* Player identity */}
                <div className="text-center space-y-2 mb-4 animate-bounce">
                  <div className="w-16 h-16 md:w-20 md:h-20 select-none flex items-center justify-center text-5xl md:text-6xl rounded-full overflow-hidden bg-white/10 border border-white/20 mx-auto shadow-2xl">
                    {player.avatar && player.avatar.startsWith('data:image/') ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={player.avatar} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <span>{AVATAR_EMOJIS[player.avatar] || '🐱'}</span>
                    )}
                  </div>
                  <p className="font-extrabold text-base md:text-lg truncate max-w-32">{player.nickname}</p>
                  <p className="text-xs md:text-sm font-semibold text-violet-300">
                    {player.score.toLocaleString()} pts
                  </p>
                </div>

                {/* Column */}
                <div
                  className={cn(
                    "w-full rounded-t-3xl bg-gradient-to-b flex flex-col items-center justify-start pt-6 border-t-2 border-white/20 text-black font-display font-black text-4xl md:text-6xl",
                    columnBg,
                    heightClass
                  )}
                >
                  <span className="drop-shadow-md text-white">{player.place}</span>
                  <span className="text-xs md:text-sm uppercase tracking-widest text-white/80 font-bold mt-2">
                    {player.place === 1 ? 'Winner' : player.place === 2 ? '2nd' : '3rd'}
                  </span>
                </div>
              </div>
            );
          })}

          {sortedPodium.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground italic">
              No players joined the game.
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex flex-col sm:flex-row justify-center gap-4 max-w-md mx-auto w-full relative z-10">
          <Link
            href={`/sessions/${id}/results`}
            className="flex-1 text-center py-4 rounded-xl bg-violet-600 hover:bg-violet-500 font-bold transition-all"
          >
            Detailed Breakdown
          </Link>
          <Link
            href="/quizzes"
            className="flex-1 text-center py-4 rounded-xl border border-white/10 hover:bg-white/5 font-bold transition-all"
          >
            Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // DEFAULT/5. LOBBY VIEW (WAITING FOR PLAYERS)
  const themeClasses = {
    neon: 'bg-[#0b051e] text-white',
    sunset: 'bg-[#180512] text-white',
    mint: 'bg-[#03120f] text-white',
  };

  const themeGlows = {
    neon: (
      <>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-violet-500/10 blur-[120px] animate-pulse pointer-events-none animate-duration-[10s]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-blue-500/10 blur-[120px] animate-pulse pointer-events-none animate-duration-[10s]" />
      </>
    ),
    sunset: (
      <>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-rose-500/10 blur-[120px] animate-pulse pointer-events-none animate-duration-[10s]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-orange-500/10 blur-[120px] animate-pulse pointer-events-none animate-duration-[10s]" />
      </>
    ),
    mint: (
      <>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-emerald-500/10 blur-[120px] animate-pulse pointer-events-none animate-duration-[10s]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-teal-500/10 blur-[120px] animate-pulse pointer-events-none animate-duration-[10s]" />
      </>
    ),
  };

  return (
    <div className={cn("fixed inset-0 w-full h-full flex flex-col justify-between p-6 overflow-hidden select-none z-30 transition-colors duration-700", themeClasses[lobbyTheme])}>
      {/* Glow effects */}
      {themeGlows[lobbyTheme]}

      {/* Top Banner Control Panel for Lobby */}
      <div className="glass rounded-3xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10 w-full max-w-6xl mx-auto mt-2">
        <div className="space-y-1">
          <span className="text-xs font-semibold tracking-wider text-violet-400 bg-violet-500/10 px-3 py-1 rounded-full border border-violet-500/20">
            Lobby Screen
          </span>
          <h1 className="text-2xl md:text-3xl font-display font-bold tracking-tight mt-2">
            {data.quiz.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            Customize settings and start the game when players join.
          </p>
        </div>

        {/* Host controls */}
        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          {/* Countdown settings */}
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 shrink-0">
            <span className="text-xs text-muted-foreground">Countdown:</span>
            <select
              value={countdownDuration}
              onChange={(e) => setCountdownDuration(Number(e.target.value))}
              className="bg-[#120d2a] border border-white/10 rounded-lg px-2 py-1 text-sm text-white focus:outline-none"
            >
              <option value={3}>3 Seconds</option>
              <option value={5}>5 Seconds</option>
              <option value={10}>10 Seconds</option>
            </select>
          </div>

          <button
            onClick={handleStart}
            disabled={!roomCode || players.length === 0}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 text-white font-bold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed text-sm shadow-lg"
          >
            <Play className="w-4 h-4 fill-current" /> Start Game
          </button>
        </div>
      </div>

      <div className="flex-1 grid gap-6 lg:grid-cols-[1fr_1.8fr] max-w-6xl w-full mx-auto my-6 relative z-10 items-stretch overflow-hidden">
        {/* Left Col: QR Code and Join Details */}
        <div className="glass rounded-3xl p-4 md:p-6 flex flex-col items-center justify-start md:justify-center text-center space-y-4 md:space-y-5 overflow-y-auto max-h-full">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-muted-foreground">Join Live Game</h2>
            <p className="text-xs text-violet-300">Scan QR Code or copy link below to enter</p>
          </div>

          {/* QR Code Container */}
          <div className="p-3 rounded-2xl bg-white shadow-2xl relative group">
            {roomCode ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrCodeUrl}
                alt="Scan to join"
                className="w-32 h-32 md:w-36 md:h-36 mx-auto select-none animate-fade-in"
                draggable={false}
              />
            ) : (
              <div className="w-32 h-32 md:w-36 md:h-36 flex items-center justify-center text-black font-semibold">
                Generating Code...
              </div>
            )}
          </div>

          {/* Link details */}
          <div className="space-y-3 w-full">
            <button
              onClick={handleCopyLink}
              disabled={!roomCode}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-black/35 border border-white/10 hover:border-violet-500/50 group/btn transition-colors text-left"
            >
              <div className="min-w-0 flex-1">
                <span className="text-[10px] text-muted-foreground block">Join Link</span>
                <span className="font-mono text-xs truncate text-violet-300 block mt-0.5">
                  {joinUrl || 'Waiting for session...'}
                </span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 ml-2 group-hover/btn:bg-violet-600/20 group-hover/btn:border-violet-500/30 transition-colors">
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
              </div>
            </button>

            {/* Room Code Display */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                <span className="text-[10px] text-muted-foreground block">Room Code</span>
                <span className="font-display font-black text-xl tracking-widest text-violet-400 mt-0.5 block">
                  {roomCode || '...'}
                </span>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex flex-col justify-center">
                <span className="text-[10px] text-muted-foreground block">Joined</span>
                <span className="font-display font-black text-xl text-white mt-0.5 block">
                  {players.length} Players
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Players Lobby */}
        <div className="glass rounded-3xl p-6 md:p-8 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
            <h2 className="font-display text-xl font-bold flex items-center gap-2">
              <Users className="w-5 h-5 text-violet-400" />
              Players Lobby
            </h2>
            <span className="text-xs text-muted-foreground font-mono bg-white/5 px-2.5 py-1 rounded-md">
              Live Connection
            </span>
          </div>

          {/* Grid of Players - Circular popping avatars */}
          <div className="flex-1 flex flex-wrap justify-center content-start gap-4 overflow-y-auto max-h-[350px] pr-2 py-4">
            {players.map((player) => (
              <div
                key={player.playerId}
                className="flex flex-col items-center gap-2 animate-bounce-in shrink-0 w-20 text-center"
              >
                {/* Circular Avatar Circle */}
                <div className="relative w-16 h-16 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-4xl shadow-xl transition-all duration-300 hover:scale-110 hover:border-violet-500/50 overflow-hidden">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-violet-500/20 to-transparent animate-pulse" />
                  {player.avatar && player.avatar.startsWith('data:image/') ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={player.avatar} className="w-full h-full object-cover rounded-full select-none" alt="" />
                  ) : (
                    <span className="select-none">{AVATAR_EMOJIS[player.avatar] || '🐱'}</span>
                  )}
                  <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#120d2a] shadow-[0_0_8px_#10b981]" />
                </div>
                {/* Player Name */}
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-black/40 border border-white/10 font-bold max-w-full truncate text-white">
                  {player.nickname}
                </span>
              </div>
            ))}

            {players.length === 0 && (
              <div className="w-full flex flex-col items-center justify-center text-center p-8 text-muted-foreground space-y-4 my-auto">
                <Tv className="w-12 h-12 text-muted-foreground/20 animate-pulse" />
                <div className="space-y-1">
                  <p className="font-semibold text-lg">Waiting for players to join...</p>
                  <p className="text-sm text-muted-foreground/60 max-w-xs mx-auto">
                    Tell your players to scan the QR code or visit the join page to enter the Room Code.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer / Theme Selector */}
      <div className="flex items-center justify-between border-t border-white/5 pt-4 max-w-6xl w-full mx-auto relative z-10">
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Tv className="w-4 h-4" /> Share this screen with your players
        </span>
        
        {/* Theme select buttons */}
        <div className="flex items-center gap-1.5 bg-black/30 border border-white/10 rounded-xl p-1 text-xs">
          <button
            onClick={() => setLobbyTheme('neon')}
            className={cn("px-2.5 py-1.5 rounded-lg transition-colors font-semibold", lobbyTheme === 'neon' ? 'bg-violet-600 text-white' : 'text-muted-foreground hover:text-white')}
          >
            Neon Space
          </button>
          <button
            onClick={() => setLobbyTheme('sunset')}
            className={cn("px-2.5 py-1.5 rounded-lg transition-colors font-semibold", lobbyTheme === 'sunset' ? 'bg-rose-600 text-white' : 'text-muted-foreground hover:text-white')}
          >
            Warm Sunset
          </button>
          <button
            onClick={() => setLobbyTheme('mint')}
            className={cn("px-2.5 py-1.5 rounded-lg transition-colors font-semibold", lobbyTheme === 'mint' ? 'bg-emerald-600 text-white' : 'text-muted-foreground hover:text-white')}
          >
            Cool Mint
          </button>
        </div>
      </div>

      {/* Global CSS for Pop/Bounce effect */}
      <style jsx global>{`
        @keyframes bounceIn {
          0% { transform: scale(0); opacity: 0; }
          70% { transform: scale(1.15); }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-bounce-in {
          animation: bounceIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
        }
      `}</style>
    </div>
  );
}
