import { create } from 'zustand';
import { GameState } from '@quiz/shared';
import type {
  RoomState,
  QuestionPayload,
  LeaderboardEntry,
  AnswerResultPayload,
  PlayerInfo,
} from '@quiz/shared';

interface GameStore {
  roomState: RoomState | null;
  setRoomState: (state: RoomState) => void;
  updateRoomState: (partial: Partial<RoomState>) => void;
  currentQuestion: QuestionPayload | null;
  setCurrentQuestion: (q: QuestionPayload | null) => void;
  selectedChoiceId: string | null;
  setSelectedChoice: (id: string | null) => void;
  answerResult: AnswerResultPayload | null;
  setAnswerResult: (result: AnswerResultPayload | null) => void;
  hasAnswered: boolean;
  setHasAnswered: (v: boolean) => void;
  leaderboard: LeaderboardEntry[];
  setLeaderboard: (entries: LeaderboardEntry[]) => void;
  myPlayerId: string | null;
  myNickname: string | null;
  myAvatar: string | null;
  setPlayerInfo: (id: string, nickname: string, avatar: string) => void;
  waitingPlayers: PlayerInfo[];
  setWaitingPlayers: (players: PlayerInfo[]) => void;
  timeRemaining: number;
  setTimeRemaining: (t: number | ((prev: number) => number)) => void;
  gameState: GameState;
  setGameState: (s: GameState) => void;
  reset: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  roomState: null,
  setRoomState: (roomState) => set({ roomState }),
  updateRoomState: (partial) =>
    set((state) => ({ roomState: state.roomState ? { ...state.roomState, ...partial } : null })),
  currentQuestion: null,
  setCurrentQuestion: (currentQuestion) => set({ currentQuestion }),
  selectedChoiceId: null,
  setSelectedChoice: (selectedChoiceId) => set({ selectedChoiceId }),
  answerResult: null,
  setAnswerResult: (answerResult) => set({ answerResult }),
  hasAnswered: false,
  setHasAnswered: (hasAnswered) => set({ hasAnswered }),
  leaderboard: [],
  setLeaderboard: (leaderboard) => set({ leaderboard }),
  myPlayerId: null,
  myNickname: null,
  myAvatar: null,
  setPlayerInfo: (myPlayerId, myNickname, myAvatar) => set({ myPlayerId, myNickname, myAvatar }),
  waitingPlayers: [],
  setWaitingPlayers: (waitingPlayers) => set({ waitingPlayers }),
  timeRemaining: 0,
  setTimeRemaining: (timeRemaining) =>
    set((state) => ({
      timeRemaining:
        typeof timeRemaining === 'function' ? timeRemaining(state.timeRemaining) : timeRemaining,
    })),
  gameState: GameState.WAITING,
  setGameState: (gameState) => set({ gameState }),
  reset: () =>
    set({
      roomState: null,
      currentQuestion: null,
      selectedChoiceId: null,
      answerResult: null,
      hasAnswered: false,
      leaderboard: [],
      myPlayerId: null,
      myNickname: null,
      myAvatar: null,
      waitingPlayers: [],
      timeRemaining: 0,
      gameState: GameState.WAITING,
    }),
}));

