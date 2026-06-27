'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useGameStore } from '@/stores/game.store';
import { useGame } from '@/hooks/useGame';
import { GameState, SOCKET_EVENTS } from '@quiz/shared';
import { connectSocket } from '@/lib/socket';
import { cn, getRankEmoji } from '@/lib/utils';
import { Clock, CheckCircle2, XCircle, Zap, Trophy, PauseCircle } from 'lucide-react';
import Image from 'next/image';

const CHOICE_COLORS = [
  { bg: 'from-red-500 to-rose-600', icon: '\u25b2' },
  { bg: 'from-blue-500 to-cyan-600', icon: '\u2666' },
  { bg: 'from-yellow-500 to-amber-600', icon: '\u25cf' },
  { bg: 'from-green-500 to-emerald-600', icon: '\u25a0' },
];

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

  // suppress lint: setHasAnswered is used via submitAnswer internally
  void setHasAnswered;

  // Timer countdown — starts fresh when question changes
  useEffect(() => {
    if (!currentQuestion) return;
    // Use the store's current timeRemaining if set (e.g. by reconnect or new question), otherwise fallback to limit
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

    // Question ended: show correct answers
    socket.on(SOCKET_EVENTS.QUESTION_END, (data: { correctChoiceIds: string[] }) => {
      setQuestionEnded(true);
      setCorrectChoiceIds(data.correctChoiceIds || []);
      if (timerRef.current) clearInterval(timerRef.current);
    });

    // Game over: navigate to final
    socket.on(SOCKET_EVENTS.GAME_END, () => router.push(`/game/${roomCode}/final`));

    // Next question: clear ended state (question page stays mounted)
    socket.on(SOCKET_EVENTS.QUESTION_SHOW, () => {
      setQuestionEnded(false);
      setCorrectChoiceIds([]);
      setIsPaused(false);
    });

    // Pause / resume state changes
    socket.on(SOCKET_EVENTS.ROOM_STATE, (data: { state: GameState }) => {
      if (data.state === GameState.PAUSED) {
        setIsPaused(true);
        // Freeze countdown during pause
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      } else if (data.state === GameState.QUESTION_ACTIVE) {
        setIsPaused(false);
      }
    });

    // Server resync after resume: restart countdown from accurate remaining time
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
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Loading question…</p>
      </div>
    </div>
  );

  const timerPercent = isPaused ? (timeRemaining / currentQuestion.timeLimit) * 100
    : (timeRemaining / currentQuestion.timeLimit) * 100;
  const timerColor =
    timerPercent > 50 ? 'bg-green-500' : timerPercent > 25 ? 'bg-yellow-500' : 'bg-red-500';

  const myEntry = leaderboard.find(e => e.playerId === myPlayerId);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Paused overlay */}
      {isPaused && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="glass-card rounded-3xl p-10 text-center">
            <PauseCircle className="w-20 h-20 text-violet-400 mx-auto mb-4" />
            <h2 className="font-display text-3xl font-bold mb-2">Game Paused</h2>
            <p className="text-muted-foreground">Waiting for the host to resume…</p>
          </div>
        </div>
      )}
      {/* Header / timer bar */}
      <div className="glass border-b border-white/10 px-4 py-3 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-violet-400" />
          <span className="font-display font-bold gradient-text">QuizLive</span>
        </div>
        <div className="flex-1">
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-1000', timerColor)}
              style={{ width: `${timerPercent}%` }}
            />
          </div>
        </div>
        <div className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full font-display font-bold text-lg', timeRemaining <= 5 ? 'text-red-400 animate-pulse' : 'text-foreground')}>
          <Clock className="w-4 h-4" />
          <span>{timeRemaining}</span>
        </div>
        <div className="text-sm text-muted-foreground">
          Q{currentQuestion.questionIndex + 1}/{currentQuestion.totalQuestions}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col p-4 md:p-8">
        {/* Question text + image */}
        <div className="text-center mb-8 flex-1 flex flex-col items-center justify-center max-w-3xl mx-auto w-full">
          {currentQuestion.imageUrl && (
            <div className="relative w-full max-w-sm h-48 mb-6 rounded-2xl overflow-hidden">
              <Image src={currentQuestion.imageUrl} alt="Question image" fill className="object-cover" />
            </div>
          )}
          <h2 className="font-display text-2xl md:text-3xl font-bold leading-tight">
            {currentQuestion.text}
          </h2>
        </div>

        {/* Answer result overlay */}
        {answerResult && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50 p-4">
            <div className={cn(
              'glass-card rounded-3xl p-8 text-center max-w-sm w-full',
              answerResult.correct ? 'border-green-500/50' : 'border-rose-500/50',
            )}>
              {answerResult.correct
                ? <CheckCircle2 className="w-16 h-16 text-green-400 mx-auto mb-4" />
                : <XCircle className="w-16 h-16 text-rose-400 mx-auto mb-4" />}
              <h3 className="font-display text-2xl font-bold mb-2">
                {answerResult.correct ? 'Correct!' : 'Oops!'}
              </h3>
              {answerResult.correct && (
                <p className="text-4xl font-display font-bold gradient-text mb-2">
                  +{answerResult.points.toLocaleString()}
                </p>
              )}
              <p className="text-muted-foreground">Total: {answerResult.totalScore.toLocaleString()} pts</p>
              {answerResult.streak > 1 && (
                <p className="text-orange-400 mt-2">Streak ×{answerResult.streak}! Bonus applied!</p>
              )}
              <p className="text-sm text-muted-foreground mt-4">Waiting for next question…</p>
            </div>
          </div>
        )}

        {/* Choice buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-3xl mx-auto w-full">
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
                  'relative overflow-hidden p-5 rounded-2xl text-left font-semibold text-lg transition-all duration-200',
                  `bg-gradient-to-br ${colors.bg}`,
                  !hasAnswered && !questionEnded && 'hover:scale-105 active:scale-95',
                  isSelected && !questionEnded && 'ring-4 ring-white/50 scale-105',
                  isCorrect && questionEnded && 'ring-4 ring-white/80 brightness-110',
                  isWrong && 'opacity-50 grayscale',
                  hasAnswered && !isSelected && 'opacity-60',
                )}
              >
                <span className="absolute top-2 right-3 text-white/30 text-4xl font-black">{colors.icon}</span>
                <span className="relative z-10 text-white drop-shadow">{choice.text}</span>
                {isCorrect && questionEnded && (
                  <CheckCircle2 className="absolute bottom-2 right-2 w-6 h-6 text-white" />
                )}
              </button>
            );
          })}
        </div>

        {/* My rank & score */}
        {myEntry && (
          <div className="flex items-center justify-center gap-4 mt-6">
            <div className="flex items-center gap-2 glass px-4 py-2 rounded-full">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-semibold">{getRankEmoji(myEntry.rank)} Rank #{myEntry.rank}</span>
            </div>
            <div className="flex items-center gap-2 glass px-4 py-2 rounded-full">
              <span className="text-sm text-muted-foreground">Score:</span>
              <span className="text-sm font-bold gradient-text">{myEntry.score.toLocaleString()}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
