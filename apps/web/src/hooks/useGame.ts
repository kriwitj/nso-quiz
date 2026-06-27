'use client';

import { useCallback, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { SOCKET_EVENTS, GameState } from '@quiz/shared';
import type {
  AnswerResultPayload,
  LeaderboardEntry,
  QuestionPayload,
  RoomState,
} from '@quiz/shared';
import { useGameStore } from '@/stores/game.store';
import { connectSocket, getSocket } from '@/lib/socket';
import toast from 'react-hot-toast';

interface PlayerJoinEvent {
  playerId: string;
  nickname: string;
  avatar: string;
  roomCode: string;
  roomState?: RoomState;
  currentQuestion?: QuestionPayload | null;
  leaderboard?: LeaderboardEntry[];
  hasAnswered?: boolean;
  selectedChoiceId?: string | null;
  answerResult?: AnswerResultPayload | null;
  waitingPlayers?: any[];
}

export function useGame(roomCode: string) {
  const router = useRouter();
  const pathname = usePathname();
  const {
    myPlayerId,
    setAnswerResult,
    setCurrentQuestion,
    setGameState,
    setHasAnswered,
    setLeaderboard,
    setPlayerInfo,
    setRoomState,
    setSelectedChoice,
    setWaitingPlayers,
    updateRoomState,
    setTimeRemaining,
  } = useGameStore();

  useEffect(() => {
    const socket = connectSocket();
    const nickname = sessionStorage.getItem('quiz_nickname');
    const avatar = sessionStorage.getItem('quiz_avatar') || 'cat';
    const storedPlayerId = sessionStorage.getItem(`quiz_player_${roomCode}`) || undefined;

    if (nickname) {
      socket.emit(SOCKET_EVENTS.PLAYER_JOIN, {
        roomCode,
        nickname,
        avatar,
        playerId: storedPlayerId,
      });
    }

    socket.on(SOCKET_EVENTS.PLAYER_JOINED, (data: PlayerJoinEvent) => {
      sessionStorage.setItem(`quiz_player_${roomCode}`, data.playerId);
      setPlayerInfo(data.playerId, data.nickname, data.avatar);

      if (data.roomState) {
        setRoomState(data.roomState);
        setGameState(data.roomState.state);
      }
      if (data.currentQuestion) {
        setCurrentQuestion(data.currentQuestion);
      }
      if (Array.isArray(data.leaderboard)) {
        setLeaderboard(data.leaderboard);
      }
      if (Array.isArray(data.waitingPlayers)) {
        setWaitingPlayers(data.waitingPlayers);
      }
      if (typeof data.hasAnswered === 'boolean') {
        setHasAnswered(data.hasAnswered);
      }

      setSelectedChoice(data.selectedChoiceId ?? null);
      setAnswerResult(data.answerResult ?? null);

      if (typeof (data as any).serverTimeRemainingMs === 'number') {
        setTimeRemaining(Math.ceil((data as any).serverTimeRemainingMs / 1000));
      }

      const nextPath = getRouteForState(roomCode, data.roomState?.state);
      if (nextPath && pathname !== nextPath) {
        router.replace(nextPath);
      }
    });

    socket.on(SOCKET_EVENTS.ROOM_STATE, (data: RoomState) => {
      setGameState(data.state);
      setRoomState(data);
      updateRoomState({
        state: data.state,
        currentQuestionIndex: data.currentQuestionIndex,
        playerCount: data.playerCount,
      });
    });

    socket.on(SOCKET_EVENTS.QUESTION_SHOW, (question: QuestionPayload) => {
      setCurrentQuestion(question);
      setHasAnswered(false);
      setSelectedChoice(null);
      setAnswerResult(null);
      setGameState(GameState.QUESTION_ACTIVE);
      setTimeRemaining(question.timeLimit);
      router.replace(`/game/${roomCode}/question`);
    });

    socket.on(SOCKET_EVENTS.QUESTION_END, () => {
      setGameState(GameState.QUESTION_ENDED);
      setTimeRemaining(0);
      router.replace(`/game/${roomCode}/result`);
    });

    socket.on(SOCKET_EVENTS.ANSWER_RESULT, (result: AnswerResultPayload) => {
      setAnswerResult(result);
    });

    socket.on(SOCKET_EVENTS.LEADERBOARD_UPDATE, (data: { leaderboard: LeaderboardEntry[] }) => {
      setLeaderboard(data.leaderboard);
    });

    socket.on(SOCKET_EVENTS.GAME_END, (data: { leaderboard: LeaderboardEntry[] }) => {
      setLeaderboard(data.leaderboard);
      setGameState(GameState.ENDED);
      router.replace(`/game/${roomCode}/final`);
    });

    socket.on(SOCKET_EVENTS.ROOM_PLAYERS, (data: { players: any[]; count: number }) => {
      setWaitingPlayers(data.players);
      updateRoomState({ playerCount: data.count });
    });

    socket.on(SOCKET_EVENTS.ERROR, (data: { message: string }) => {
      toast.error(data.message);
    });

    return () => {
      socket.off(SOCKET_EVENTS.PLAYER_JOINED);
      socket.off(SOCKET_EVENTS.ROOM_STATE);
      socket.off(SOCKET_EVENTS.QUESTION_SHOW);
      socket.off(SOCKET_EVENTS.QUESTION_END);
      socket.off(SOCKET_EVENTS.ANSWER_RESULT);
      socket.off(SOCKET_EVENTS.LEADERBOARD_UPDATE);
      socket.off(SOCKET_EVENTS.GAME_END);
      socket.off(SOCKET_EVENTS.ROOM_PLAYERS);
      socket.off(SOCKET_EVENTS.ERROR);
    };
  }, [
    pathname,
    roomCode,
    router,
    setAnswerResult,
    setCurrentQuestion,
    setGameState,
    setHasAnswered,
    setLeaderboard,
    setPlayerInfo,
    setRoomState,
    setSelectedChoice,
    setWaitingPlayers,
    updateRoomState,
  ]);

  const submitAnswer = useCallback(
    (questionId: string, choiceId: string) => {
      const socket = getSocket();
      socket.emit(SOCKET_EVENTS.ANSWER_SUBMIT, {
        roomCode,
        questionId,
        choiceId,
        playerId: myPlayerId,
        submittedAt: Date.now(),
      });
      setHasAnswered(true);
      setSelectedChoice(choiceId);
    },
    [myPlayerId, roomCode, setHasAnswered, setSelectedChoice],
  );

  return { submitAnswer };
}

function getRouteForState(roomCode: string, state?: GameState) {
  switch (state) {
    case GameState.QUESTION_ACTIVE:
      return `/game/${roomCode}/question`;
    case GameState.QUESTION_ENDED:
      return `/game/${roomCode}/result`;
    case GameState.ENDED:
      return `/game/${roomCode}/final`;
    case GameState.WAITING:
    case GameState.ACTIVE:
    case GameState.PAUSED:
    case GameState.STARTING:
      return `/game/${roomCode}/waiting`;
    default:
      return null;
  }
}

