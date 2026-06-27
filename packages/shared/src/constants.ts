export const GAME_CONSTANTS = {
  BASE_SCORE: 1000,
  MIN_TIME_LIMIT: 5,
  MAX_TIME_LIMIT: 120,
  DEFAULT_TIME_LIMIT: 10,
  ROOM_CODE_LENGTH: 6,
  ROOM_CODE_CHARS: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
  ROOM_TTL_SECONDS: 7200, // 2 hours
  LEADERBOARD_TOP_N: 10,
  MAX_PLAYERS_PER_ROOM: 1000,
  STREAK_BONUS_THRESHOLD: 3,
  STREAK_BONUS_RATE: 0.1,
  MAX_STREAK_BONUS_MULTIPLIER: 5,
} as const;

export const API_ROUTES = {
  AUTH: '/auth',
  QUIZZES: '/quizzes',
  SESSIONS: '/sessions',
  PLAYERS: '/players',
  ANALYTICS: '/analytics',
  ADMIN: '/admin',
  UPLOAD: '/upload',
} as const;

export const REDIS_KEYS = {
  room: (code: string) => `room:${code}`,
  roomPlayers: (code: string) => `room:${code}:players`,
  roomLeaderboard: (code: string) => `room:${code}:leaderboard`,
  roomQuestion: (code: string) => `room:${code}:question`,
  roomAnswers: (code: string) => `room:${code}:answers`,
  roomTimer: (code: string) => `room:${code}:timer`,
  sessionState: (id: string) => `session:${id}:state`,
} as const;
