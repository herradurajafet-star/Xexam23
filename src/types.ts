export interface RobloxUser {
  id: string; // "roblox:123456"
  username: string; // e.g. "Builderman"
  displayName: string; // e.g. "Builder"
  avatarUrl: string; // Roblox avatar URL
}

export type QuestionType = "multiple_choice" | "text" | "checkbox";

export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  options?: string[]; // Used for multiple_choice and checkbox
  correctAnswer?: string; // Correct answer option index or exact text (optional, for auto-evaluation)
  points: number; // Question weight (e.g. 10 points)
}

export interface Exam {
  id: string; // Unique alphanumeric code (e.g. "KRF79X")
  title: string;
  description: string;
  creatorId: string;
  creatorUsername: string;
  creatorDisplayName?: string;
  questions: Question[];
  createdAt: string; // ISO date string
  isActive: boolean;
  wallpaperUrl?: string; // Wallpaper image URL or base64 data
}

export interface SubmissionAnswer {
  questionId: string;
  answerText: string; // Selected option, typed text, or comma-separated options
}

export interface Submission {
  id: string;
  examId: string;
  userId: string;
  username: string;
  displayName?: string;
  answers: SubmissionAnswer[];
  score?: number; // Calculated grade/points if graded
  totalPoints: number; // Max score of exam
  status: "submitted" | "graded";
  feedback?: string; // Comments from creator
  submittedAt: string; // ISO date string
  avatarUrl?: string; // Cache the avatar URL
  questionScores?: { [questionId: string]: number }; // Optional manual scores per question
}
