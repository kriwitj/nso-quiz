'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useGameStore } from '@/stores/game.store';
import { useGame } from '@/hooks/useGame';
import { GameState, SOCKET_EVENTS } from '@quiz/shared';
import { connectSocket } from '@/lib/socket';
import { cn, getRankEmoji } from '@/lib/utils';
import { Clock, CheckCircle2, XCircle, Zap, Trophy, PauseCircle, Volume2, VolumeX } from 'lucide-react';
import Image from 'next/image';

const CHOICE_COLORS = [
  { bg: 'from-red-500 to-rose-600',       icon: '▲', shadow: 'shadow-red-500/40' },
  { bg: 'from-blue-500 to-cyan-600',       icon: '◆', shadow: 'shadow-blue-500/40' },
  { bg: 'from-yellow-500 to-amber-600',    icon: '●', shadow: 'shadow-amber-500/40' },
  { bg: 'from-green-500 to-emerald-600',   icon: '■', shadow: 'shadow-green-500/40' },
];

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export default function QuestionPage() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const router = useRouter();
  const {
    currentQuestion,
    hasAnswered,
    setHasAnswered,
    selectedChoiceId,
    setSelectedChoice,
    answerResult,
    timeRemaining,
    setTimeRemaining,
    leaderboard,
    myPlayerId,
  } = useGameStore();
  const { submitAnswer } = useGame(roomCode);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [questionEnded, setQuestionEnded] = useState(false);
  const [correctChoiceIds, setCorrectChoiceIds] = useState<string[]>([]);
  const [isPaused, setIsPaused] = useState(false);

  // Audio refs
  const bgMusicRef = useRef<HTMLAudioElement | null>(null);
  const yayRef = useRef<HTMLAudioElement | null>(null);
  // Default ON — read from localStorage so preference persists across question changes
  const [soundEnabled, setSoundEnabled] = useState(() =>
    typeof window !== 'undefined' ? localStorage.getItem('quiz-sound') !== 'off' : true
  );

  void setHasAnswered;

  // Init audio elements
  useEffect(() => {
    bgMusicRef.current = new Audio(`${BASE_PATH}/sounds/game-music.mp3`);
    bgMusicRef.current.loop = true;
    bgMusicRef.current.volume = 0.35;

    yayRef.current = new Audio(`${BASE_PATH}/sounds/yay.mp3`);
    yayRef.current.volume = 0.7;

    // Attempt to play if preference is ON
    if (localStorage.getItem('quiz-sound') !== 'off') {
      bgMusicRef.current.play()
        .then(() => setSoundEnabled(true))
        .catch(() => setSoundEnabled(false)); // blocked — show 🔇, user taps to enable
    }

    return () => {
      bgMusicRef.current?.pause();
      bgMusicRef.current = null;
      yayRef.current = null;
    };
  }, []);

  // Toggle sound button handler (called within user gesture — safe to play)
  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('quiz-sound', next ? 'on' : 'off');
    if (next) {
      bgMusicRef.current?.play().catch(() => null);
      // Unlock yay within user gesture so it can play later from useEffect
      if (yayRef.current) {
        yayRef.current.play().then(() => {
          yayRef.current!.pause();
          yayRef.current!.currentTime = 0;
        }).catch(() => null);
      }
    } else {
      bgMusicRef.current?.pause();
    }
  };

  // Play yay when correct answer result arrives
  useEffect(() => {
    if (answerResult?.correct && soundEnabled && yayRef.current) {
      yayRef.current.currentTime = 0;
      yayRef.current.play().catch(() => null);
    }
  }, [answerResult, soundEnabled]);

  useEffect(() => {
    if (!currentQuestion) return;
    const initialTime = timeRemaining > 0 ? timeRemaining : currentQuestion.timeLimit;
    setTimeRemaining(initialTime);
    setQuestionEnded(false);
    setCorrectChoiceIds([]);
    setIsPaused(false);
    timerRef.current = setInterval(() => {
      setTimeRemaining((t: number) => {
        if (t <= 1) { clearInterval(timerRef.current!); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestion?.id]);

  useEffect(() => {
    const socket = connectSocket();

    socket.on(SOCKET_EVENTS.QUESTION_END, (data: { correctChoiceIds: string[] }) => {
      setQuestionEnded(true);
      setCorrectChoiceIds(data.correctChoiceIds || []);
      if (timerRef.current) clearInterval(timerRef.current);
    });

    socket.on(SOCKET_EVENTS.GAME_END, () => router.push(`/game/${roomCode}/final`));

    socket.on(SOCKET_EVENTS.QUESTION_SHOW, () => {
      setQuestionEnded(false);
      setCorrectChoiceIds([]);
      setIsPaused(false);
    });

    socket.on(SOCKET_EVENTS.ROOM_STATE, (data: { state: GameState }) => {
      if (data.state === GameState.PAUSED) {
        setIsPaused(true);
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      } else if (data.state === GameState.QUESTION_ACTIVE) {
        setIsPaused(false);
      }
    });

    socket.on('timer:sync', (data: { expiryTimestamp: number }) => {
      const remainingSec = Math.max(0, Math.ceil((data.expiryTimestamp - Date.now()) / 1000));
      setTimeRemaining(remainingSec);
      setIsPaused(false);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimeRemaining((t: number) => {
          if (t <= 1) { clearInterval(timerRef.current!); return 0; }
          return t - 1;
        });
      }, 1000);
    });

    return () => {
      socket.off(SOCKET_EVENTS.QUESTION_END);
      socket.off(SOCKET_EVENTS.GAME_END);
      socket.off(SOCKET_EVENTS.QUESTION_SHOW);
      socket.off(SOCKET_EVENTS.ROOM_STATE);
      socket.off('timer:sync');
    };
  }, [roomCode, router]);

  const handleAnswer = (choiceId: string) => {
    if (hasAnswered || questionEnded || !currentQuestion) return;
    setSelectedChoice(choiceId);
    submitAnswer(currentQuestion.id, choiceId);
  };

  if (!currentQuestion) return (
    <div className="h-dvh flex items-center justify-center bg-[#f5f6fa]">
      <div className="text-center">
        <div className="w-14 h-14 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground text-sm">กำลังโหลดคำถาม…</p>
      </div>
    </div>
  );

  const timerPercent = (timeRemaining / currentQuestion.timeLimit) * 100;
  const timerColor =
    timerPercent > 50 ? 'bg-green-500' : timerPercent > 25 ? 'bg-yellow-400' : 'bg-red-500';

  const myEntry = leaderboard.find(e => e.playerId === myPlayerId);

  return (
    // h-dvh = accounts for mobile browser address bar collapse
    <div className="h-dvh flex flex-col overflow-hidden bg-[#f5f6fa]">

      {/* Paused overlay */}
      {isPaused && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-6">
          <div className="bg-white rounded-3xl p-10 text-center shadow-2xl max-w-xs w-full">
            <PauseCircle className="w-16 h-16 text-violet-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2 text-foreground">หยุดชั่วคราว</h2>
            <p className="text-muted-foreground text-sm">รอ Host กลับมาดำเนินต่อ…</p>
          </div>
        </div>
      )}

      {/* Answer result overlay */}
      {answerResult && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50 p-6">
          <div className={cn(
            'bg-white rounded-3xl p-8 text-center max-w-sm w-full shadow-2xl border-2',
            answerResult.correct ? 'border-green-400' : 'border-rose-400',
          )}>
            {answerResult.correct
              ? <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-3" />
              : <XCircle className="w-14 h-14 text-rose-500 mx-auto mb-3" />}
            <h3 className="text-2xl font-bold mb-2 text-foreground">
              {answerResult.correct ? 'ถูกต้อง! 🎉' : 'ผิด!'}
            </h3>
            {answerResult.correct && (
              <p className="text-4xl font-black text-violet-600 mb-1">
                +{answerResult.points.toLocaleString()}
              </p>
            )}
            <p className="text-muted-foreground text-sm">รวม {answerResult.totalScore.toLocaleString()} คะแนน</p>
            {answerResult.streak > 1 && (
              <p className="text-orange-500 font-semibold mt-2 text-sm">🔥 Streak ×{answerResult.streak}! โบนัสพิเศษ</p>
            )}
            <p className="text-xs text-muted-foreground mt-4">รอคำถามถัดไป…</p>
          </div>
        </div>
      )}

      {/* ── Header: brand + timer bar + clock + Q index ── */}
      <header className="flex-none bg-white border-b border-gray-200 px-4 py-2.5 flex items-center gap-3">
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Zap className="w-5 h-5 text-violet-500" />
          <span className="font-black text-violet-600 text-base tracking-tight">QuizLive</span>
        </div>

        {/* Timer bar */}
        <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-1000', timerColor)}
            style={{ width: `${timerPercent}%` }}
          />
        </div>

        {/* Countdown number */}
        <div className={cn(
          'flex items-center gap-1 font-black text-lg tabular-nums flex-shrink-0 min-w-[2.5rem] justify-center',
          timeRemaining <= 5 ? 'text-red-500 animate-pulse' : 'text-foreground',
        )}>
          <Clock className="w-4 h-4" />
          {timeRemaining}
        </div>

        {/* Question index */}
        <span className="text-xs font-semibold text-muted-foreground flex-shrink-0">
          Q{currentQuestion.questionIndex + 1}/{currentQuestion.totalQuestions}
        </span>

        {/* Sound toggle */}
        <button
          onClick={toggleSound}
          className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
          title={soundEnabled ? 'ปิดเสียง' : 'เปิดเสียง'}
        >
          {soundEnabled
            ? <Volume2 className="w-4 h-4 text-violet-500" />
            : <VolumeX className="w-4 h-4 text-gray-400" />}
        </button>
      </header>

      {/* ── Question area: flex-[2] — takes ~35% of remaining height ── */}
      <div className="flex-[2] min-h-0 flex flex-col items-center justify-center px-5 py-3">
        {currentQuestion.imageUrl && (
          <div className="relative w-full max-w-xs h-36 mb-3 rounded-2xl overflow-hidden flex-shrink-0">
            <Image src={currentQuestion.imageUrl} alt="Question" fill className="object-cover" />
          </div>
        )}
        <h2 className="text-xl md:text-2xl font-bold text-center leading-snug text-foreground max-w-lg">
          {currentQuestion.text}
        </h2>
      </div>

      {/* ── Choices: flex-[3] — takes ~50% of remaining height, always 2-col grid ── */}
      <div className="flex-[3] min-h-0 grid grid-cols-2 gap-2.5 px-3 pb-2">
        {currentQuestion.choices.map((choice, i) => {
          const colors = CHOICE_COLORS[i % CHOICE_COLORS.length];
          const isSelected = selectedChoiceId === choice.id;
          const isCorrect = correctChoiceIds.includes(choice.id);
          const isWrong = questionEnded && isSelected && !isCorrect;

          return (
            <button
              key={choice.id}
              onClick={() => handleAnswer(choice.id)}
              disabled={hasAnswered || questionEnded}
              className={cn(
                'relative overflow-hidden rounded-2xl text-left font-bold text-sm md:text-base',
                'flex flex-col justify-between p-3.5 md:p-5',
                `bg-gradient-to-br ${colors.bg}`,
                `shadow-lg ${colors.shadow}`,
                'transition-all duration-200 active:scale-95',
                !hasAnswered && !questionEnded && 'hover:scale-[1.02] hover:shadow-xl',
                isSelected && !questionEnded && 'ring-4 ring-white/70 scale-[1.02]',
                isCorrect && questionEnded && 'ring-4 ring-white brightness-110',
                isWrong && 'opacity-40 grayscale scale-95',
                hasAnswered && !isSelected && !questionEnded && 'opacity-60',
              )}
            >
              {/* Shape icon — top-right */}
              <span className="self-end text-white/25 text-3xl font-black leading-none">{colors.icon}</span>

              {/* Choice text */}
              <span className="text-white drop-shadow-sm leading-snug mt-auto">
                {choice.text}
              </span>

              {/* Correct checkmark */}
              {isCorrect && questionEnded && (
                <CheckCircle2 className="absolute top-2 left-2 w-5 h-5 text-white drop-shadow" />
              )}
            </button>
          );
        })}
      </div>

      {/* ── My rank bar: fixed bottom strip ── */}
      {myEntry ? (
        <div className="flex-none bg-white border-t border-gray-200 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-bold text-foreground">
              {getRankEmoji(myEntry.rank)} อันดับ #{myEntry.rank}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">คะแนน</span>
            <span className="text-sm font-black text-violet-600">{myEntry.score.toLocaleString()}</span>
          </div>
        </div>
      ) : (
        <div className="flex-none h-safe-bottom" />
      )}
    </div>
  );
}
