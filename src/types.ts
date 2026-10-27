// ========================================================
// مسابقة نور البيان 1448 - 1449 هـ
// تعريفات ونماذج بيانات النظام الشامل (TypeScript Types & Interfaces)
// ========================================================

export type UserRole = "supervisor" | "teacher" | "presenter" | "student";

export interface Participant {
  id: string;
  name: string;
  normalizedName: string;
  role: UserRole;
  school: string;
  grade: string;
  totalScore: number;
  loginCount?: number;
  firstLoginAt?: string;
  lastLoginAt?: string;
  createdAt?: number;
}

export interface Question {
  id?: string;
  type: "oral" | "mcq" | "ordering" | "matching";
  font: "quran" | "uthmani" | "amiri" | "normal";
  text: string;
  targetOral?: string;
  points: number;
  options?: string[];
  correct?: number;
  items?: string[];
  pairs?: [string, string][];
  sectionName?: string;
}

export interface QuizSection {
  sectionName: string;
  questions: Question[];
}

export interface Quiz {
  id: string;
  title: string;
  targetGrade: string;
  allowPractice: boolean;
  updatedAt: number;
  sections: QuizSection[];
}

export interface TournamentTeamMember {
  id: string;
  name: string;
  school?: string;
  grade?: string;
}

export interface TournamentTeam {
  id: string;
  name: string;
  color: string;
  members: TournamentTeamMember[];
  score: number;
  eliminated?: boolean;
}

export interface AnswerLogRecord {
  answerId: string;
  questionIdx: number;
  isCorrect: boolean;
  isTimeout: boolean;
  basePoints: number;
  cardBonus: number;
  penalty: number;
  scoreDelta: number;
  chosenChoiceIdx?: number | null;
  answeredBy: string;
  timestamp: number;
}

export interface TacticalCardEffect {
  timeDeltaPerQuestion?: number;
  timeDelta?: number;
  pointsBonus?: number;
  minTimeRequired?: number;
  fullMarksOnCorrect?: number;
  penaltyOnWrong?: number;
  immunity?: boolean;
  doublePoints?: boolean;
  balanceAccuracyAndSpeed?: boolean;
  speedBonusUnder5s?: number;
  [key: string]: any;
}

export interface TacticalCard {
  id: number;
  title: string;
  desc: string;
  icon: string;
  type: "buff" | "risk";
  scope: "instant" | "cycle" | "permanent" | "match";
  applicableTo: "all" | "mcq" | "oral" | "matching" | "ordering" | "timer" | "final";
  effect: TacticalCardEffect;
  mechanicsText: string;
}

export interface ActiveCardEffect {
  cardId: number;
  title: string;
  effect: TacticalCardEffect;
  activatedAtQuestionIdx: number;
  activatedBy: string;
  scope: "instant" | "cycle" | "permanent" | "match";
  expiresAtQuestionIdx?: number;
}

export interface ConnectedUser {
  uid?: string;
  name: string;
  role: string;
  lastSeen?: number;
}

export interface LiveRoom {
  id: string;
  code: string;
  title: string;
  quizId?: string;
  type: "individual" | "tournament";
  status: "lobby" | "student_select" | "question_draw" | "active" | "finished";
  hostName: string;
  leaderName: string;
  connectedUsers: ConnectedUser[];
  contestantId?: string;
  contestantName?: string;
  contestantSchool?: string;
  contestantGrade?: string;
  contestantInitialBaseScore?: number;
  contestantScore?: number;
  highestLockedScore?: number;
  questions?: Question[];
  currentQuestionIdx?: number;
  answeredQuestionsLog?: Record<string, AnswerLogRecord>;
  activeEffects?: ActiveCardEffect[];
  timerSeconds?: number;
  initialTimerSeconds?: number;
  isTimerPaused?: boolean;
  solverRole?: string;
  oralScores?: Record<string, number>;
  teams?: TournamentTeam[];
  currentTeamIdx?: number;
  currentStudentIdxInTeam?: Record<string, number>;
  tournamentRound?: number;
  totalRounds?: number;
  lastAnswerEvent?: any;
  lastLeaderNote?: string;
}

export interface TournamentArchiveItem {
  id: string;
  roomTitle: string;
  supervisorName: string;
  archivedAt: string;
  winnerTeam: {
    name: string;
    score: number;
    members?: string[];
  };
  runnerUpTeam?: {
    name: string;
    score: number;
    members?: string[];
  };
  standings: {
    rank: number;
    name: string;
    score: number;
  }[];
  mvpStudent?: {
    name: string;
    score: number;
  };
  teamsCount: number;
  roundsCount: number;
}
