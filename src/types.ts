export type Gender = 'male' | 'female';

export type ConnectionType =
  | 'Someone to Talk To'
  | 'New Friend'
  | 'Someone Who Understands'
  | 'Someone to Listen'
  | 'Someone Funny'
  | 'Deep Conversation'
  | 'Just Company'
  | 'Play Together';

export type MoodType =
  | 'Happy'
  | 'Calm'
  | 'Lonely'
  | 'Bored'
  | 'Emotional'
  | 'Energetic'
  | 'Curious'
  | 'Tired';

export interface UserPreferences {
  gender: Gender;
  lookingFor: Gender;
  connectionType: ConnectionType;
  mood: MoodType;
  interests: string[];
  conversationStyle: 'casual' | 'deep' | 'playful' | 'quiet';
  availability: 'now' | 'evening' | 'late_night';
}

export interface UserProfile {
  id: string;
  preferences: UserPreferences;
  createdAt: number;
  blockedUserIds: string[];
}

export interface MatchSession {
  sessionId: string;
  userAId: string;
  userBId: string;
  userAPrefs: {
    connectionType: ConnectionType;
    mood: MoodType;
  };
  userBPrefs: {
    connectionType: ConnectionType;
    mood: MoodType;
  };
  startTime: number;
  isJustStay: boolean;
  role?: 'A' | 'B';
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderRole: 'A' | 'B';
  text: string;
  timestamp: number;
  read?: boolean;
}

export type MiniGameType =
  | 'rapid_fire'
  | 'would_you_rather'
  | 'five_second_challenge'
  | 'two_truths_and_a_lie'
  | 'guess_my_word'
  | 'quick_draw'
  | 'word_chain'
  | 'dont_laugh'
  | 'rapid_questions'
  | 'quick_quiz'
  | 'one_word_story'
  | 'draw_and_guess'
  | 'secret_question'
  | 'guess_their_answer'
  | 'make_laugh'
  | 'describe_badly'
  | 'hum_tune';

export interface KobutorQuest {
  id: string;
  titleBangla: string;
  titleEnglish?: string;
  descBangla: string;
  descEnglish?: string;
  rewardFeathers: number;
  rewardXp: number;
  status: 'active' | 'completed' | 'dismissed';
  completedBy?: { [role: string]: boolean };
  timerSeconds?: number;
  startedAt: number;
}

export type SurpriseActivityType =
  | 'ten_sec'
  | 'make_laugh'
  | 'secret_question'
  | 'guess_answer'
  | 'describe_badly'
  | 'one_word_story'
  | 'hum_tune'
  | 'rapid_fire';

export interface SurpriseState {
  activity: SurpriseActivityType;
  title: string;
  titleBangla: string;
  prompt: string;
  promptBangla?: string;
  startedAt: number;
  completed?: boolean;
}

export interface SecretQuestionState {
  question: string;
  questionBangla: string;
  answers: { [role: string]: string };
  revealed: boolean;
}

export interface GuessAnswerState {
  targetRole: 'A' | 'B';
  question: string;
  questionBangla: string;
  targetAnswer?: string;
  guesserGuess?: string;
  revealed: boolean;
  score?: number;
  round: number;
}

export interface RapidFireState {
  currentRound: number;
  totalRounds: number;
  answers: { [round: number]: { [role: string]: string } };
  completed: boolean;
}

export interface GameState {
  type: MiniGameType;
  prompt: string;
  promptBangla?: string;
  options?: string[];
  optionsBangla?: string[];
  currentTurn?: 'A' | 'B';
  status?: 'waiting_ready' | 'in_progress' | 'round_result' | 'game_over';
  readyRoles?: { [role: string]: boolean };
  round?: number;
  totalRounds?: number;
  scores?: { [role: string]: number };
  timeLeft?: number;
  timerExpiresAt?: number;
  answers?: { [key: string]: string };
  action?: string;
  choice?: string;
  // Game specific state:
  storyWords?: string[];
  drawingData?: string;
  drawingPrompt?: string;
  wordChain?: string[];
  twoTruthsStatements?: { id: number; text: string; isLie?: boolean }[];
  guessedLieId?: number;
  revealedLie?: boolean;
  secretWord?: string;
  secretCategory?: string;
  guesses?: { by: 'A' | 'B'; word: string; isCorrect: boolean }[];
  laughedRoles?: { [role: string]: boolean };
  rapidQuestionsList?: { bangla: string; english: string }[];
  surprise?: SurpriseState;
  secretQuestion?: SecretQuestionState;
  guessAnswer?: GuessAnswerState;
  rapidFire?: RapidFireState;
}

export interface KobutorMemory {
  durationSeconds: number;
  reactionsCount: number;
  gamesPlayedCount: number;
  messagesCount: number;
  milestonesUnlocked: string[];
}

export interface HumanWeatherAggregate {
  happyCount: number;
  calmCount: number;
  lonelyCount: number;
  boredCount: number;
  emotionalCount: number;
  energeticCount: number;
  curiousCount: number;
  tiredCount: number;
  wantToTalkCount: number;
  wantCompanyCount: number;
  wantToLaughCount: number;
  totalActive: number;
  updatedAt: number;
}
