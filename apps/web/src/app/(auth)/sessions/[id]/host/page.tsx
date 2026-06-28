'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { sessionApi } from '@/lib/api';
import { connectSocket } from '@/lib/socket';
import { cn, getInitials } from '@/lib/utils';
import { GameState, SOCKET_EVENTS, type LeaderboardEntry, type QuestionPayload } from '@quiz/shared';
import {
  AlertCircle,
  ArrowRight,
  CirclePause,
  Flag,
  ImagePlus,
  Play,
  SkipForward,
  Trophy,
  Users,
  Copy,
  Check,
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
  cat: '🐱', dog: '🐶', fox: '🦊', panda: '🐼',
  lion: '🦁', bear: '🐻', rabbit: '🐰', tiger: '🐯',
};

const CHOICE_COLORS = [
  { bg: 'from-red-500 to-rose-600', icon: '▲' },
  { bg: 'from-blue-500 to-cyan-600', icon: '♦' },
  { bg: 'from-yellow-500 to-amber-600', icon: '●' },
  { bg: 'from-green-500 to-emerald-600', icon: '■' },
];

/* ── Theme definitions ─────────────────────────────────────── */
type ThemeKey = 'neon' | 'sunset' | 'mint' | 'ocean' | 'nso' | 'custom';

interface ThemeConfig {
  label: string;
  bg: string;
  accentColor: string;
  cardStyle: string;
  textColor: string;
  glow?: string;
  qrColor: string;
  activeBtnBg: string;
}

const THEMES: Record<ThemeKey, ThemeConfig> = {
  neon: {
    label: 'Neon Space',
    bg: 'bg-[#0b051e]',
    accentColor: 'text-violet-400',
    cardStyle: 'bg-white/5 backdrop-blur-md border border-white/10',
    textColor: 'text-white',
    qrColor: '8b5cf6',
    activeBtnBg: 'bg-violet-600',
    glow: 'radial-gradient(ellipse at 20% 30%, rgba(139,92,246,0.15) 0%, transparent 60%), radial-gradient(ellipse at 80% 70%, rgba(59,130,246,0.12) 0%, transparent 60%)',
  },
  sunset: {
    label: 'Warm Sunset',
    bg: 'bg-[#1a0a12]',
    accentColor: 'text-rose-400',
    cardStyle: 'bg-white/5 backdrop-blur-md border border-white/10',
    textColor: 'text-white',
    qrColor: 'f43f5e',
    activeBtnBg: 'bg-rose-600',
    glow: 'radial-gradient(ellipse at 20% 30%, rgba(244,63,94,0.15) 0%, transparent 60%), radial-gradient(ellipse at 80% 70%, rgba(251,146,60,0.12) 0%, transparent 60%)',
  },
  mint: {
    label: 'Cool Mint',
    bg: 'bg-[#031510]',
    accentColor: 'text-emerald-400',
    cardStyle: 'bg-white/5 backdrop-blur-md border border-white/10',
    textColor: 'text-white',
    qrColor: '10b981',
    activeBtnBg: 'bg-emerald-600',
    glow: 'radial-gradient(ellipse at 20% 30%, rgba(16,185,129,0.15) 0%, transparent 60%), radial-gradient(ellipse at 80% 70%, rgba(20,184,166,0.12) 0%, transparent 60%)',
  },
  ocean: {
    label: 'Deep Ocean',
    bg: 'bg-[#020c1b]',
    accentColor: 'text-cyan-400',
    cardStyle: 'bg-white/5 backdrop-blur-md border border-white/10',
    textColor: 'text-white',
    qrColor: '06b6d4',
    activeBtnBg: 'bg-cyan-600',
    glow: 'radial-gradient(ellipse at 30% 20%, rgba(6,182,212,0.15) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, rgba(59,130,246,0.15) 0%, transparent 60%)',
  },
  nso: {
    label: 'NSO Blue',
    bg: 'bg-[#001f5c]',
    accentColor: 'text-blue-200',
    cardStyle: 'bg-white/8 backdrop-blur-md border border-white/15',
    textColor: 'text-white',
    qrColor: '0046ad',
    activeBtnBg: 'bg-blue-500',
    glow: 'radial-gradient(ellipse at 20% 30%, rgba(0,70,173,0.3) 0%, transparent 60%), radial-gradient(ellipse at 80% 70%, rgba(107,56,212,0.2) 0%, transparent 60%)',
  },
  custom: {
    label: 'กำหนดเอง',
    bg: '',
    accentColor: 'text-white/80',
    cardStyle: 'bg-white/10 backdrop-blur-md border border-white/15',
    textColor: 'text-white',
    qrColor: 'ffffff',
    activeBtnBg: 'bg-white/20',
    glow: '',
  },
};

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

  const [countdownDuration, setCountdownDuration] = useState(3);
  const [localCountdown, setLocalCountdown] = useState(3);
  const [answersCount, setAnswersCount] = useState(0);
  const [choiceDistribution, setChoiceDistribution] = useState<Record<string, number>>({});
  const [showScoreboard, setShowScoreboard] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [copied, setCopied] = useState(false);
  const [correctChoiceIds, setCorrectChoiceIds] = useState<string[]>([]);

  // Theme state
  const [lobbyTheme, setLobbyTheme] = useState<ThemeKey>('neon');
  const [customBgColor, setCustomBgColor] = useState('#0b051e');
  const [customBgImage, setCustomBgImage] = useState('');
  const [showCustomPanel, setShowCustomPanel] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { data, isLoading, isError } = useQuery<HostSessionData>({
    queryKey: ['session', id],
    queryFn: () => sessionApi.get(id).then((res) => res.data),
    enabled: Boolean(id),
  });

  /* Fix: include basePath in join URL */
  const joinUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
    return `${window.location.origin}${basePath}/join?code=${roomCode || data?.roomCode}`;
  }, [roomCode, data?.roomCode]);

  const theme = THEMES[lobbyTheme];

  const qrCodeUrl = useMemo(() => {
    const qrColor = lobbyTheme === 'custom' ? '0046ad' : theme.qrColor;
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(joinUrl)}&color=${qrColor}&bgcolor=ffffff`;
  }, [joinUrl, lobbyTheme, theme.qrColor]);

  /* Compute background style for the outer container */
  const bgStyle = useMemo(() => {
    if (lobbyTheme === 'custom') {
      if (customBgImage) {
        return { backgroundImage: `url(${customBgImage})`, backgroundSize: 'cover', backgroundPosition: 'center' };
      }
      return { backgroundColor: customBgColor };
    }
    return {};
  }, [lobbyTheme, customBgColor, customBgImage]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCustomBgImage(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (!data) return;
    setRoomCode(data.roomCode);
    setPlayers(
      data.playerSessions.map((p) => ({ playerId: p.id, nickname: p.nickname, avatar: p.avatar, score: p.totalScore, streak: p.streak ?? 0, socketId: '' })),
    );
    if (data.leaderboard?.length) {
      setLeaderboard(data.leaderboard.map((e) => ({ rank: e.rank, playerId: e.playerSessionId, nickname: e.nickname, avatar: e.avatar, score: e.totalScore, streak: 0 })));
    }
    if (data.status === 'COMPLETED') setGameState(GameState.ENDED);
  }, [data]);

  useEffect(() => {
    if (gameState === GameState.ACTIVE) {
      const interval = setInterval(() => {
        setLocalCountdown((prev) => { if (prev <= 1) { clearInterval(interval); return 0; } return prev - 1; });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [gameState]);

  useEffect(() => {
    if (gameState === GameState.QUESTION_ACTIVE && timeRemaining > 0 && !isPaused) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((t) => { if (t <= 1) { clearInterval(timerRef.current!); return 0; } return t - 1; });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameState, timeRemaining, isPaused]);

  useEffect(() => {
    if (!data || !roomCode) return;
    if (!currentQuestion && gameState === GameState.QUESTION_ACTIVE && data.quiz.questions.length > 0) {
      const q = data.quiz.questions[0];
      setCurrentQuestion({ id: q.id, type: (q.type as any) ?? 'MULTIPLE_CHOICE', text: q.text, timeLimit: q.timeLimit, points: q.points ?? 1000, questionIndex: 0, totalQuestions: data.quiz.questions.length, choices: q.choices });
      setTimeRemaining(q.timeLimit);
    }
  }, [currentQuestion, data, gameState, roomCode]);

  useEffect(() => {
    if (!data?.quizId || !auth?.user?.id) return;
    const socket = connectSocket();

    socket.on(SOCKET_EVENTS.ROOM_STATE, (payload: any) => {
      if (payload.roomCode) setRoomCode(payload.roomCode);
      setGameState(payload.state);
      setQuestionEnded(payload.state === GameState.QUESTION_ENDED);
      if (payload.state === GameState.ACTIVE) setLocalCountdown(payload.countdownDuration ?? countdownDuration);
      setIsPaused(payload.state === GameState.PAUSED);
      if (payload.state === GameState.QUESTION_ACTIVE) {
        if (typeof payload.serverTimeRemainingMs === 'number') setTimeRemaining(Math.ceil(payload.serverTimeRemainingMs / 1000));
        if (typeof payload.answersCount === 'number') setAnswersCount(payload.answersCount);
      }
      if (typeof payload.currentQuestionIndex === 'number' && data.quiz.questions[payload.currentQuestionIndex]) {
        const q = data.quiz.questions[payload.currentQuestionIndex];
        setCurrentQuestion({ id: q.id, type: (q.type as any) ?? 'MULTIPLE_CHOICE', text: q.text, timeLimit: q.timeLimit, points: q.points ?? 1000, questionIndex: payload.currentQuestionIndex, totalQuestions: payload.totalQuestions ?? data.quiz.questions.length, choices: q.choices });
      }
    });

    socket.on(SOCKET_EVENTS.ROOM_PLAYERS, (payload: { players: WaitingPlayer[]; count: number }) => setPlayers(payload.players));
    socket.on(SOCKET_EVENTS.QUESTION_SHOW, (payload: QuestionPayload) => {
      setCurrentQuestion(payload); setQuestionEnded(false); setAnswersCount(0);
      setShowScoreboard(false); setTimeRemaining(payload.timeLimit);
      setCorrectChoiceIds([]); setGameState(GameState.QUESTION_ACTIVE);
    });
    socket.on(SOCKET_EVENTS.QUESTION_END, (payload: { correctChoiceIds: string[]; distribution?: Record<string, number> }) => {
      setQuestionEnded(true); setCorrectChoiceIds(payload.correctChoiceIds || []);
      setChoiceDistribution(payload.distribution || {}); setGameState(GameState.QUESTION_ENDED); setTimeRemaining(0);
    });
    socket.on('timer:sync', (payload: { expiryTimestamp: number }) => {
      setTimeRemaining(Math.max(0, Math.ceil((payload.expiryTimestamp - Date.now()) / 1000)));
      setIsPaused(false);
    });
    socket.on('answer:submitted', (payload: { answerCount: number }) => setAnswersCount(payload.answerCount));
    socket.on(SOCKET_EVENTS.LEADERBOARD_UPDATE, (payload: { leaderboard: LeaderboardEntry[] }) => setLeaderboard(payload.leaderboard));
    socket.on(SOCKET_EVENTS.GAME_END, (payload: { leaderboard: LeaderboardEntry[]; sessionId: string }) => {
      setLeaderboard(payload.leaderboard); setGameState(GameState.ENDED);
    });
    socket.on(SOCKET_EVENTS.ERROR, (payload: { message: string }) => toast.error(payload.message));

    socket.emit(SOCKET_EVENTS.ROOM_CREATE, { quizId: data.quizId, hostId: auth.user.id, sessionId: data.id });

    return () => {
      socket.off(SOCKET_EVENTS.ROOM_STATE); socket.off(SOCKET_EVENTS.ROOM_PLAYERS);
      socket.off(SOCKET_EVENTS.QUESTION_SHOW); socket.off(SOCKET_EVENTS.QUESTION_END);
      socket.off(SOCKET_EVENTS.LEADERBOARD_UPDATE); socket.off(SOCKET_EVENTS.GAME_END);
      socket.off(SOCKET_EVENTS.ERROR); socket.off('timer:sync'); socket.off('answer:submitted');
    };
  }, [auth?.user?.id, data?.id, data?.quizId, data?.status]);

  const handleStart = () => { if (roomCode) connectSocket().emit(SOCKET_EVENTS.ROOM_START, { roomCode, countdownDuration }); };
  const handleNext = () => { if (roomCode) connectSocket().emit(SOCKET_EVENTS.QUESTION_NEXT, { roomCode }); };
  const handleSkip = () => { if (roomCode) connectSocket().emit(SOCKET_EVENTS.QUESTION_SKIP, { roomCode }); };
  const handleEnd = () => { if (roomCode) connectSocket().emit(SOCKET_EVENTS.ROOM_END, { roomCode }); };
  const handlePause = () => { if (roomCode) connectSocket().emit(SOCKET_EVENTS.ROOM_PAUSE, { roomCode }); };
  const handleResume = () => { if (roomCode) connectSocket().emit(SOCKET_EVENTS.ROOM_RESUME, { roomCode }); };
  const handleCopyLink = () => {
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    toast.success('คัดลอกลิงก์แล้ว!');
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0b051e] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-white/60 text-lg">กำลังโหลดเซสชัน...</p>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-[#0b051e] flex items-center justify-center p-8">
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8 text-center space-y-6 max-w-md w-full text-white">
          <AlertCircle className="mx-auto h-16 w-16 text-rose-400" />
          <h1 className="text-2xl font-bold">เซสชันไม่พร้อมใช้งาน</h1>
          <p className="text-sm text-white/60">ไม่สามารถโหลดเซสชันนี้ได้ หรืออาจเป็นเซสชันที่ไม่ถูกต้อง</p>
          <button onClick={() => router.push('/quizzes')} className="w-full py-3 rounded-xl bg-violet-600 font-semibold text-white hover:bg-violet-500 transition-colors">
            กลับไปยังควิซ
          </button>
        </div>
      </div>
    );
  }

  const maxChoiceAnswers = Math.max(...Object.values(choiceDistribution), 1);

  /* ── 1. COUNTDOWN ── */
  if (gameState === GameState.ACTIVE) {
    return (
      <div className={cn('fixed inset-0 flex flex-col items-center justify-center z-50 text-white select-none', theme.bg)} style={bgStyle}>
        <div className="absolute inset-0" style={{ background: theme.glow }} />
        <div className="text-center space-y-6 max-w-2xl px-6 relative z-10">
          <p className={cn('font-semibold tracking-wider text-xl uppercase', theme.accentColor)}>เตรียมพร้อม!</p>
          <h1 className="text-4xl md:text-5xl font-bold">{data.quiz.title}</h1>
          <p className="text-white/60 text-lg">คำถามแรกจะเริ่มใน...</p>
          <div className="relative flex items-center justify-center w-48 h-48 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-white/5 scale-110" />
            <div className="absolute inset-0 rounded-full border-4 border-white/30 border-t-transparent animate-spin" />
            <span className="text-7xl md:text-8xl font-black text-white relative">
              {localCountdown > 0 ? localCountdown : 'เริ่ม!'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  /* ── 2. QUESTION ACTIVE ── */
  if (gameState === GameState.QUESTION_ACTIVE && currentQuestion) {
    const timerPercent = (timeRemaining / currentQuestion.timeLimit) * 100;
    const timerStroke = timerPercent > 50 ? '#10b981' : timerPercent > 25 ? '#f59e0b' : '#ef4444';

    return (
      <div className={cn('fixed inset-0 flex flex-col z-40 text-white select-none', theme.bg)} style={bgStyle}>
        <div className="absolute inset-0" style={{ background: theme.glow }} />

        {/* Floating host controls */}
        <div className="absolute top-4 right-4 z-50 flex items-center gap-2 bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-2">
          <button onClick={handlePause} disabled={isPaused} className="p-2.5 rounded-xl hover:bg-white/10 text-yellow-300 disabled:opacity-40" title="หยุดชั่วคราว"><CirclePause className="w-5 h-5" /></button>
          <button onClick={handleSkip} className="p-2.5 rounded-xl hover:bg-white/10 text-amber-400" title="ข้ามคำถาม"><SkipForward className="w-5 h-5" /></button>
          <button onClick={handleEnd} className="p-2.5 rounded-xl hover:bg-white/10 text-rose-400" title="จบเกม"><Flag className="w-5 h-5" /></button>
        </div>

        {isPaused && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-45 flex flex-col items-center justify-center">
            <CirclePause className="w-24 h-24 text-yellow-400 mx-auto animate-pulse mb-4" />
            <h2 className="text-3xl font-bold text-white mb-2">หยุดชั่วคราว</h2>
            <p className="text-white/60 mb-6">การนำเสนอหน้าจอหยุดชั่วคราวแล้ว</p>
            <button onClick={handleResume} className="px-8 py-3 rounded-xl bg-emerald-600 font-bold hover:bg-emerald-500 text-white transition-colors">ดำเนินต่อ</button>
          </div>
        )}

        <div className="flex-1 flex flex-col justify-center items-center px-6 md:px-12 py-8 max-w-5xl mx-auto w-full text-center relative z-10">
          <span className={cn('text-xs font-semibold tracking-widest uppercase px-4 py-1.5 rounded-full border', theme.accentColor, 'bg-white/5 border-white/20')}>
            คำถาม {currentQuestion.questionIndex + 1} / {currentQuestion.totalQuestions}
          </span>
          <h1 className="text-3xl md:text-5xl font-extrabold leading-tight mt-5">
            {currentQuestion.text}
          </h1>

          <div className="flex flex-col md:flex-row items-center justify-center gap-12 mt-10 w-full">
            {/* Circular timer */}
            <div className="relative flex items-center justify-center w-36 h-36">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                <circle cx="60" cy="60" r="50" fill="transparent" stroke={timerStroke} strokeWidth="8"
                  strokeDasharray={314.16} strokeDashoffset={314.16 - (314.16 * timerPercent) / 100}
                  className="transition-all duration-1000" />
              </svg>
              <div className="absolute text-center">
                <span className="text-4xl font-black block">{timeRemaining}</span>
                <span className="text-[10px] uppercase tracking-widest text-white/40">วินาที</span>
              </div>
            </div>

            <div className="text-center space-y-2">
              <span className={cn('text-5xl md:text-7xl font-black block', theme.accentColor)}>
                {answersCount}
              </span>
              <p className="text-lg text-white/60 flex items-center gap-2 justify-center">
                <Users className="w-5 h-5" /> คำตอบที่ส่งแล้ว
              </p>
              <p className="text-sm text-white/40">จาก {players.length} ผู้เล่น</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 bg-black/20 border-t border-white/5 w-full relative z-10">
          {currentQuestion.choices.map((choice, idx) => {
            const c = CHOICE_COLORS[idx % CHOICE_COLORS.length];
            return (
              <div key={choice.id} className={cn('relative flex items-center p-5 rounded-2xl border border-white/10 bg-gradient-to-br min-h-20 overflow-hidden', c.bg)}>
                <div className="absolute top-2 right-4 text-white/10 text-7xl font-black select-none">{c.icon}</div>
                <div className="flex items-center gap-4 relative z-10">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl font-black text-white shrink-0">{c.icon}</div>
                  <span className="text-lg font-bold drop-shadow-md">{choice.text}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  /* ── 3. QUESTION ENDED ── */
  if (gameState === GameState.QUESTION_ENDED && currentQuestion) {
    const isLastQuestion = currentQuestion.questionIndex + 1 === currentQuestion.totalQuestions;

    return (
      <div className={cn('fixed inset-0 flex flex-col z-40 text-white select-none', theme.bg)} style={bgStyle}>
        <div className="absolute inset-0" style={{ background: theme.glow }} />

        <div className="absolute top-4 right-4 z-50 flex items-center gap-2 bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-2">
          {!showScoreboard ? (
            <button onClick={() => setShowScoreboard(true)} className={cn('flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-white font-bold transition-colors text-sm', theme.activeBtnBg)}>
              <Trophy className="w-4 h-4" /> ดูคะแนน
            </button>
          ) : (
            <button onClick={isLastQuestion ? handleEnd : handleNext} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-500 transition-colors text-sm">
              {isLastQuestion ? 'จบเกม' : 'คำถามถัดไป'} <ArrowRight className="w-4 h-4" />
            </button>
          )}
          <button onClick={handleEnd} className="p-2.5 rounded-xl hover:bg-white/10 text-rose-400" title="จบเกม"><Flag className="w-4 h-4" /></button>
        </div>

        {!showScoreboard ? (
          <div className="flex-1 flex flex-col justify-between p-6 md:p-12 max-w-5xl mx-auto w-full relative z-10">
            <div className="text-center space-y-3 mt-4">
              <span className="text-xs uppercase font-bold tracking-widest text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">หมดเวลา!</span>
              <h1 className="text-2xl md:text-4xl font-extrabold mt-3 leading-tight">{currentQuestion.text}</h1>
            </div>

            <div className="flex-1 flex items-end justify-center gap-4 md:gap-8 max-w-3xl mx-auto w-full my-8 h-64 border-b border-white/10 pb-2">
              {currentQuestion.choices.map((choice, idx) => {
                const count = choiceDistribution[choice.id] || 0;
                const pct = (count / maxChoiceAnswers) * 100;
                const c = CHOICE_COLORS[idx % CHOICE_COLORS.length];
                const isCorrect = correctChoiceIds.includes(choice.id);
                return (
                  <div key={choice.id} className="flex-1 flex flex-col items-center justify-end h-full">
                    <span className="text-sm font-bold mb-2">{count}</span>
                    <div className={cn('w-full rounded-t-xl bg-gradient-to-t transition-all duration-1000', c.bg, isCorrect ? 'ring-4 ring-emerald-400/60' : 'opacity-40')} style={{ height: `${Math.max(pct, 8)}%` }} />
                    <div className="mt-3 w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-base font-black">{c.icon}</div>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
              {currentQuestion.choices.map((choice, idx) => {
                const isCorrect = correctChoiceIds.includes(choice.id);
                const c = CHOICE_COLORS[idx % CHOICE_COLORS.length];
                return (
                  <div key={choice.id} className={cn('flex items-center justify-between p-4 rounded-xl border text-sm transition-all', isCorrect ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300' : 'bg-white/5 border-white/10 text-white/40 opacity-50')}>
                    <div className="flex items-center gap-3">
                      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold', isCorrect ? 'bg-emerald-600' : 'bg-white/10')}>{c.icon}</div>
                      <span className="font-semibold">{choice.text}</span>
                    </div>
                    {isCorrect && <span className="bg-emerald-500 text-white text-xs px-2.5 py-1 rounded-full font-bold">ถูกต้อง</span>}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-center items-center p-6 md:p-12 max-w-4xl mx-auto w-full relative z-10">
            <Trophy className="w-14 h-14 text-yellow-400 mx-auto animate-bounce mb-4" />
            <h1 className="text-3xl md:text-5xl font-black tracking-tight uppercase mb-2">คะแนน</h1>
            <p className="text-white/60 text-lg mb-8">คำถาม {currentQuestion.questionIndex + 1} / {currentQuestion.totalQuestions}</p>
            <div className="w-full space-y-3">
              {leaderboard.slice(0, 5).map((entry, idx) => {
                const rankBg = idx === 0 ? 'bg-amber-400 text-black' : idx === 1 ? 'bg-slate-300 text-black' : idx === 2 ? 'bg-amber-700 text-white' : 'bg-white/5 border border-white/10 text-white/60';
                return (
                  <div key={entry.playerId} className={cn('flex items-center gap-4 p-4 rounded-2xl border border-white/10 bg-white/5', idx === 0 && 'border-amber-400/40 bg-amber-500/10')}>
                    <span className={cn('w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold shadow-inner', rankBg)}>#{idx + 1}</span>
                    <div className="w-10 h-10 shrink-0 flex items-center justify-center text-3xl rounded-full bg-white/5 border border-white/10 overflow-hidden">
                      {entry.avatar?.startsWith('data:image/') ? <img src={entry.avatar} className="w-full h-full object-cover" alt="" /> : <span>{AVATAR_EMOJIS[entry.avatar] || '🐱'}</span>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-lg font-bold">{entry.nickname}</p>
                      {entry.streak > 1 && <p className="text-xs text-orange-400">🔥 ×{entry.streak} streak</p>}
                    </div>
                    <p className={cn('text-xl font-black', theme.accentColor)}>{entry.score.toLocaleString()}</p>
                  </div>
                );
              })}
              {leaderboard.length === 0 && <p className="text-center py-12 text-white/40 italic">ยังไม่มีคะแนน</p>}
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ── 4. GAME ENDED / PODIUM ── */
  if (gameState === GameState.ENDED) {
    const sorted = [...leaderboard].slice(0, 3);
    const podium = [];
    if (sorted[1]) podium.push({ ...sorted[1], place: 2 });
    if (sorted[0]) podium.push({ ...sorted[0], place: 1 });
    if (sorted[2]) podium.push({ ...sorted[2], place: 3 });

    return (
      <div className={cn('fixed inset-0 flex flex-col justify-between p-6 md:p-12 z-40 text-white select-none overflow-hidden', theme.bg)} style={bgStyle}>
        <div className="absolute inset-0" style={{ background: theme.glow }} />

        <div className="text-center space-y-3 mt-4 relative z-10">
          <Trophy className="w-16 h-16 text-yellow-400 mx-auto animate-pulse" />
          <h1 className="text-3xl md:text-5xl font-black tracking-tight uppercase">เสร็จสิ้น!</h1>
          <p className="text-white/60 text-lg">ผลการแข่งขัน: {data.quiz.title}</p>
        </div>

        <div className="flex-1 flex items-end justify-center gap-3 md:gap-6 max-w-3xl mx-auto w-full my-12 h-64 md:h-96 relative z-10">
          {podium.map((player) => {
            const is1st = player.place === 1;
            const is2nd = player.place === 2;
            const h = is1st ? 'h-[75%]' : is2nd ? 'h-[50%]' : 'h-[35%]';
            const colBg = is1st ? 'from-amber-400 to-yellow-600' : is2nd ? 'from-slate-400 to-slate-600' : 'from-amber-700 to-amber-900';
            return (
              <div key={player.playerId} className="flex-1 flex flex-col items-center justify-end h-full">
                <div className="text-center space-y-2 mb-4 animate-bounce">
                  <div className="w-16 h-16 md:w-20 md:h-20 flex items-center justify-center text-5xl rounded-full bg-white/10 border border-white/20 mx-auto shadow-2xl overflow-hidden">
                    {player.avatar?.startsWith('data:image/') ? <img src={player.avatar} className="w-full h-full object-cover" alt="" /> : <span>{AVATAR_EMOJIS[player.avatar] || '🐱'}</span>}
                  </div>
                  <p className="font-extrabold text-base truncate max-w-32">{player.nickname}</p>
                  <p className={cn('text-xs font-semibold', theme.accentColor)}>{player.score.toLocaleString()} pts</p>
                </div>
                <div className={cn('w-full rounded-t-3xl bg-gradient-to-b flex flex-col items-center justify-start pt-6 border-t-2 border-white/20 font-black text-4xl md:text-6xl', colBg, h)}>
                  <span className="drop-shadow-md text-white">{player.place}</span>
                </div>
              </div>
            );
          })}
          {sorted.length === 0 && <p className="text-white/40 italic absolute inset-0 flex items-center justify-center">ไม่มีผู้เล่น</p>}
        </div>

        <div className="flex flex-col sm:flex-row justify-center gap-4 max-w-md mx-auto w-full relative z-10">
          <Link href={`/sessions/${id}/results`} className={cn('flex-1 text-center py-4 rounded-xl font-bold transition-all text-white', theme.activeBtnBg)}>ดูสถิติละเอียด</Link>
          <Link href="/quizzes" className="flex-1 text-center py-4 rounded-xl border border-white/10 hover:bg-white/5 font-bold transition-all">กลับหน้าหลัก</Link>
        </div>
      </div>
    );
  }

  /* ── 5. LOBBY (DEFAULT) ── */
  return (
    <div
      className={cn('fixed inset-0 w-full h-full flex flex-col justify-between p-4 md:p-6 overflow-hidden select-none z-30 transition-colors duration-700', lobbyTheme !== 'custom' && theme.bg, theme.textColor)}
      style={bgStyle}
    >
      {/* Background glow / overlay */}
      {lobbyTheme !== 'custom' && <div className="absolute inset-0 pointer-events-none" style={{ background: theme.glow }} />}
      {lobbyTheme === 'custom' && customBgImage && (
        <div className="absolute inset-0 bg-black/50 pointer-events-none" />
      )}

      {/* ── Top Control Panel ── */}
      <div className={cn('rounded-2xl md:rounded-3xl p-4 md:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10 w-full max-w-6xl mx-auto', theme.cardStyle)}>
        <div className="space-y-1 min-w-0 flex-1">
          <span className={cn('text-xs font-semibold tracking-wider px-3 py-1 rounded-full border bg-white/5 border-white/20', theme.accentColor)}>
            Lobby Screen
          </span>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight mt-2 truncate">{data.quiz.title}</h1>
          <p className="text-sm text-white/50">ปรับแต่งการตั้งค่าและเริ่มเกมเมื่อผู้เล่นเข้าร่วม</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto flex-shrink-0">
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
            <span className="text-xs text-white/50">นับถอยหลัง:</span>
            <select
              value={countdownDuration}
              onChange={(e) => setCountdownDuration(Number(e.target.value))}
              className="bg-black/30 border border-white/10 rounded-lg px-2 py-1 text-sm text-white focus:outline-none"
            >
              <option value={3}>3 วินาที</option>
              <option value={5}>5 วินาที</option>
              <option value={10}>10 วินาที</option>
            </select>
          </div>

          <button
            onClick={handleStart}
            disabled={!roomCode || players.length === 0}
            className={cn('flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-white font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed text-sm shadow-lg flex-1 sm:flex-initial', theme.activeBtnBg, 'hover:opacity-90')}
          >
            <Play className="w-4 h-4 fill-current" /> เริ่มเกม
          </button>
        </div>
      </div>

      {/* ── Main Content: QR + Players ── */}
      <div className="flex-1 grid gap-4 md:gap-6 lg:grid-cols-[1fr_1.8fr] max-w-6xl w-full mx-auto my-4 relative z-10 items-stretch overflow-hidden min-h-0">
        {/* Left: QR + join info */}
        <div className={cn('rounded-2xl md:rounded-3xl p-4 md:p-6 flex flex-col items-center text-center space-y-4 overflow-y-auto', theme.cardStyle)}>
          <div>
            <h2 className="text-sm font-semibold text-white/60">เข้าร่วมเกม</h2>
            <p className={cn('text-xs mt-0.5', theme.accentColor)}>สแกน QR Code หรือกรอกรหัสห้อง</p>
          </div>

          <div className="p-3 rounded-2xl bg-white shadow-2xl">
            {roomCode ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrCodeUrl} alt="Scan to join" className="w-32 h-32 md:w-40 md:h-40 mx-auto select-none" draggable={false} />
            ) : (
              <div className="w-32 h-32 md:w-40 md:h-40 flex items-center justify-center text-black/40 text-sm">กำลังสร้าง...</div>
            )}
          </div>

          <div className="space-y-3 w-full">
            <button
              onClick={handleCopyLink}
              disabled={!roomCode}
              className={cn('w-full flex items-center justify-between p-3 rounded-xl border border-white/10 hover:border-white/30 transition-colors text-left bg-black/20')}
            >
              <div className="min-w-0 flex-1">
                <span className="text-[10px] text-white/40 block">Join Link</span>
                <span className={cn('font-mono text-xs truncate block mt-0.5', theme.accentColor)}>
                  {joinUrl || 'รอการเชื่อมต่อ...'}
                </span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 ml-2">
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-white/40" />}
              </div>
            </button>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                <span className="text-[10px] text-white/40 block">รหัสห้อง</span>
                <span className={cn('font-black text-2xl tracking-widest mt-0.5 block', theme.accentColor)}>
                  {roomCode || '...'}
                </span>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                <span className="text-[10px] text-white/40 block">ผู้เล่น</span>
                <span className="font-black text-2xl text-white mt-0.5 block">{players.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Players */}
        <div className={cn('rounded-2xl md:rounded-3xl p-4 md:p-6 flex flex-col overflow-hidden', theme.cardStyle)}>
          <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
            <h2 className="text-base md:text-lg font-bold flex items-center gap-2">
              <Users className={cn('w-5 h-5', theme.accentColor)} />
              Players Lobby
            </h2>
            <span className="text-[11px] text-white/40 bg-white/5 px-2.5 py-1 rounded-md font-mono">
              {players.length > 0 ? `${players.length} online` : 'รอผู้เล่น'}
            </span>
          </div>

          <div className="flex-1 flex flex-wrap justify-center content-start gap-3 overflow-y-auto py-2 pr-1 scrollbar-thin">
            {players.map((player) => (
              <div key={player.playerId} className="flex flex-col items-center gap-1.5 w-16 text-center" style={{ animation: 'bounceIn 0.5s cubic-bezier(0.175,0.885,0.32,1.275) both' }}>
                <div className="relative w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-3xl shadow-xl overflow-hidden transition-transform hover:scale-110">
                  {player.avatar?.startsWith('data:image/') ? (
                    <img src={player.avatar} className="w-full h-full object-cover rounded-full" alt="" />
                  ) : (
                    <span>{AVATAR_EMOJIS[player.avatar] || '🐱'}</span>
                  )}
                  <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-black/40" />
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/30 border border-white/10 font-bold max-w-full truncate text-white leading-tight">
                  {player.nickname}
                </span>
              </div>
            ))}

            {players.length === 0 && (
              <div className="w-full flex flex-col items-center justify-center text-center p-8 text-white/40 space-y-4 my-auto">
                <Tv className="w-12 h-12 text-white/10 animate-pulse" />
                <div>
                  <p className="font-semibold text-base text-white/60">รอผู้เล่นเข้าร่วม...</p>
                  <p className="text-sm text-white/30 max-w-xs mx-auto mt-1">แชร์รหัสห้องหรือ QR Code ให้ผู้เล่นสแกน</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Footer: Theme Selector ── */}
      <div className="flex items-center justify-between border-t border-white/5 pt-3 max-w-6xl w-full mx-auto relative z-10 gap-4 flex-wrap">
        <span className="text-xs text-white/40 flex items-center gap-1.5">
          <Tv className="w-4 h-4" /> แชร์หน้าจอนี้ให้ผู้เล่น
        </span>

        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Theme buttons */}
          <div className="flex items-center gap-1 bg-black/30 border border-white/10 rounded-xl p-1 text-[11px]">
            {(Object.keys(THEMES) as ThemeKey[]).map((key) => (
              <button
                key={key}
                onClick={() => { setLobbyTheme(key); if (key !== 'custom') setShowCustomPanel(false); else setShowCustomPanel(true); }}
                className={cn('px-2.5 py-1.5 rounded-lg transition-colors font-semibold whitespace-nowrap', lobbyTheme === key ? cn(THEMES[key].activeBtnBg, 'text-white') : 'text-white/50 hover:text-white')}
              >
                {THEMES[key].label}
              </button>
            ))}
          </div>

          {/* Custom panel */}
          {showCustomPanel && lobbyTheme === 'custom' && (
            <div className="flex items-center gap-2 bg-black/40 border border-white/15 rounded-xl p-2">
              <label className="text-[11px] text-white/50 shrink-0">สีพื้นหลัง</label>
              <input
                type="color"
                value={customBgColor}
                onChange={(e) => { setCustomBgColor(e.target.value); setCustomBgImage(''); }}
                className="w-7 h-7 rounded cursor-pointer border border-white/10 bg-transparent"
                title="เลือกสีพื้นหลัง"
              />
              <span className="text-white/20 text-xs">|</span>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 text-[11px] text-white/60 hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-white/10"
              >
                <ImagePlus className="w-3.5 h-3.5" />
                อัปโหลดรูป
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              {customBgImage && (
                <button onClick={() => setCustomBgImage('')} className="text-[11px] text-rose-400 hover:text-rose-300 px-1">ลบรูป</button>
              )}
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes bounceIn {
          0% { transform: scale(0); opacity: 0; }
          70% { transform: scale(1.15); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
