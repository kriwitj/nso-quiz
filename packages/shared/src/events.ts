// Socket.IO event names (shared between client and server)
export const SOCKET_EVENTS = {
  // Host → Server
  ROOM_CREATE: 'room:create',
  ROOM_START: 'room:start',
  ROOM_PAUSE: 'room:pause',
  ROOM_RESUME: 'room:resume',
  ROOM_END: 'room:end',
  QUESTION_NEXT: 'question:next',
  QUESTION_SKIP: 'question:skip',

  // Player → Server
  PLAYER_JOIN: 'player:join',
  PLAYER_LEAVE: 'player:leave',
  ANSWER_SUBMIT: 'answer:submit',

  // Server → Client (broadcast)
  ROOM_STATE: 'room:state',
  ROOM_PLAYERS: 'room:players',
  QUESTION_SHOW: 'question:show',
  QUESTION_TIMER: 'question:timer',
  QUESTION_END: 'question:end',
  ANSWER_RESULT: 'answer:result',
  LEADERBOARD_UPDATE: 'leaderboard:update',
  GAME_END: 'game:end',
  PLAYER_JOINED: 'player:joined',
  PLAYER_LEFT: 'player:left',
  ERROR: 'error',
} as const;

export type SocketEvent = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];
