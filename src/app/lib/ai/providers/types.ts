export interface ChatMessage {
  role: "user" | "model";
  content: string;
}

export interface StreamCallbacks {
  onToken: (token: string) => void;
  onDone: (fullContent: string) => void;
  onError: (error: Error) => void;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
}

export interface QuizResult {
  questions: QuizQuestion[];
  totalQuestions: number;
}

export interface Flashcard {
  front: string;
  back: string;
}

export interface FlashcardResult {
  cards: Flashcard[];
  totalCards: number;
}

export interface SummaryResult {
  summary: string;
  keyPoints: string[];
}

export interface CodeExplanationResult {
  language: string;
  explanation: string;
  complexity: string;
  suggestions: string[];
}

export interface AIProviderConfig {
  apiKey: string;
  model: string;
}

export interface AIProvider {
  chat(history: ChatMessage[], message: string): Promise<string>;
  chatStream(
    history: ChatMessage[],
    message: string,
    callbacks: StreamCallbacks,
  ): Promise<void>;
  generateQuiz(content: string, numQuestions: number): Promise<QuizResult>;
  generateFlashcards(content: string, numCards: number): Promise<FlashcardResult>;
  summarizeContent(content: string): Promise<SummaryResult>;
  explainCode(code: string, language?: string): Promise<CodeExplanationResult>;
}
