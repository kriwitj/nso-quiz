import { GameState, QuestionType, UserRole, SessionStatus } from './enums';

export interface UserDto {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: UserRole;
  createdAt: Date;
}

export interface ChoiceDto {
  id: string;
  text: string;
  imageUrl?: string;
  isCorrect: boolean;
  order: number;
}

export interface QuestionDto {
  id: string;
  quizId: string;
  type: QuestionType;
  text: string;
  imageUrl?: string;
  timeLimit: number;
  points: number;
  order: number;
  choices: ChoiceDto[];
}

export interface QuizDto {
  id: string;
  title: string;
  description?: string;
  coverImage?: string;
  isPublic: boolean;
  hostId: string;
  questionCount: number;
  createdAt: Date;
  updatedAt: Date;
  questions?: QuestionDto[];
}

export interface RoomState {
  roomCode: string;
  sessionId: string;
  quizId: string;
  hostId: string;
  state: GameState;
  currentQuestionIndex: number;
  totalQuestions: number;
  startedAt?: string;
  playerCount: number;
  countdownDuration?: number;
  serverTimeRemainingMs?: number;
  answersCount?: number;
}

export interface PlayerInfo {
  id: string;
  sessionId: string;
  nickname: string;
  avatar: string;
  score: number;
  streak: number;
  rank: number;
}

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  nickname: string;
  avatar: string;
  score: number;
  streak: number;
  delta?: number;
}

export interface QuestionPayload {
  id: string;
  type: QuestionType;
  text: string;
  imageUrl?: string;
  timeLimit: number;
  points: number;
  questionIndex: number;
  totalQuestions: number;
  choices: Array<{ id: string; text: string; imageUrl?: string }>;
}

export interface AnswerResultPayload {
  correct: boolean;
  points: number;
  totalScore: number;
  streak: number;
  correctChoiceId: string;
  timeMs: number;
}

export interface GameEndPayload {
  leaderboard: LeaderboardEntry[];
  sessionId: string;
}

export interface RoomCreatePayload {
  quizId: string;
}

export interface PlayerJoinPayload {
  roomCode: string;
  nickname: string;
  avatar: string;
  playerId?: string;
}

export interface AnswerSubmitPayload {
  roomCode: string;
  questionId: string;
  choiceId: string;
  submittedAt: number;
}

export interface QuizAnalytics {
  quizId: string;
  totalSessions: number;
  totalParticipants: number;
  averageScore: number;
  averageCompletionRate: number;
  questionStats: QuestionStat[];
}

export interface QuestionStat {
  questionId: string;
  questionText: string;
  correctRate: number;
  averageResponseTimeMs: number;
  choiceDistribution: Record<string, number>;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SessionStatus_ {
  id: string;
  quizId: string;
  quizTitle: string;
  roomCode: string;
  status: SessionStatus;
  playerCount: number;
  startedAt?: Date;
  endedAt?: Date;
}
