import {
  GoogleGenerativeAI,
  type GenerativeModel,
  type Content,
} from "@google/generative-ai";
import type {
  AIProvider,
  AIProviderConfig,
  ChatMessage,
  StreamCallbacks,
  QuizResult,
  FlashcardResult,
  SummaryResult,
  CodeExplanationResult,
  JobDetailsResult,
} from "./types";

const SYSTEM_PROMPT = `You are a helpful study assistant of Smart Nub Campus platform of Northern University of Bangladesh developed by Zeanur Rahaman Zeon. You will assist users in generating quizzes, flashcards, summaries, solving doubts, and code explanations based on the content they provide.

When asked to create flashcards, output them as a JSON code block (\`\`\`json) with this exact structure:
{
  "cards": [
    { "front": "Question or term", "back": "Answer or definition" }
  ]
}

When asked to create a quiz, output questions as a JSON code block (\`\`\`json) with this exact structure:
{
  "questions": [
    {
      "question": "Question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "Correct option as written"
    }
  ]
}

When asked to summarize content, output a JSON code block (\`\`\`json) with this exact structure:
{
  "summary": "A concise summary",
  "keyPoints": ["Key point 1", "Key point 2"]
}

For all other responses, use regular markdown.`;

export class GeminiProvider implements AIProvider {
  private model: GenerativeModel;
  private config: AIProviderConfig;

  constructor(config: AIProviderConfig) {
    this.config = config;
    const genAI = new GoogleGenerativeAI(config.apiKey);
    this.model = genAI.getGenerativeModel({ model: config.model });
  }

  private toGeminiHistory(history: ChatMessage[]): Content[] {
    return history.map((msg) => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    }));
  }

  async chat(history: ChatMessage[], message: string): Promise<string> {
    const chat = this.model.startChat({
      history: this.toGeminiHistory(history),
      systemInstruction: SYSTEM_PROMPT,
    });

    const result = await chat.sendMessage(message);
    return result.response.text();
  }

  async chatStream(
    history: ChatMessage[],
    message: string,
    callbacks: StreamCallbacks,
  ): Promise<void> {
    const chat = this.model.startChat({
      history: this.toGeminiHistory(history),
      systemInstruction: SYSTEM_PROMPT,
    });

    try {
      const result = await chat.sendMessageStream(message);
      let fullContent = "";

      for await (const chunk of result.stream) {
        const text = chunk.text();
        fullContent += text;
        callbacks.onToken(text);
      }

      callbacks.onDone(fullContent);
    } catch (error) {
      callbacks.onError(
        error instanceof Error ? error : new Error("Stream failed"),
      );
    }
  }

  async generateQuiz(
    content: string,
    numQuestions: number,
  ): Promise<QuizResult> {
    const prompt = `You are an academic quiz generator. Based on the following content, generate ${numQuestions} multiple-choice questions. Each question must have exactly 4 options and one correct answer.

Return ONLY a valid JSON array (no markdown, no code fences) with this structure:
[
  {
    "question": "Question text here",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": "The correct option exactly as written"
  }
]

Content:
${content}`;

    const result = await this.model.generateContent(prompt);
    const text = result.response.text();
    const cleaned = text.replace(/```(?:json)?\s*/gi, "").trim();
    const questions = JSON.parse(cleaned);

    return { questions, totalQuestions: questions.length };
  }

  async generateFlashcards(
    content: string,
    numCards: number,
  ): Promise<FlashcardResult> {
    const prompt = `You are a flashcard generator. Based on the following content, create ${numCards} flashcards. Each card has a front (question/term) and back (answer/definition).

Return ONLY a valid JSON array (no markdown, no code fences) with this structure:
[
  {
    "front": "Term or question",
    "back": "Definition or answer"
  }
]

Content:
${content}`;

    const result = await this.model.generateContent(prompt);
    const text = result.response.text();
    const cleaned = text.replace(/```(?:json)?\s*/gi, "").trim();
    const cards = JSON.parse(cleaned);

    return { cards, totalCards: cards.length };
  }

  async summarizeContent(content: string): Promise<SummaryResult> {
    const prompt = `Summarize the following content and extract key points.

Return ONLY a valid JSON object (no markdown, no code fences) with this structure:
{
  "summary": "A concise summary of the content",
  "keyPoints": ["Key point 1", "Key point 2", "Key point 3"]
}

Content:
${content}`;

    const result = await this.model.generateContent(prompt);
    const text = result.response.text();
    const cleaned = text.replace(/```(?:json)?\s*/gi, "").trim();
    return JSON.parse(cleaned);
  }

  async explainCode(
    code: string,
    language?: string,
  ): Promise<CodeExplanationResult> {
    const lang = language || "auto-detected";
    const prompt = `Explain the following ${lang} code. Analyze its purpose, complexity, and suggest improvements.

Return ONLY a valid JSON object (no markdown, no code fences) with this structure:
{
  "language": "${lang}",
  "explanation": "Detailed explanation of what the code does",
  "complexity": "Time and space complexity analysis",
  "suggestions": ["Improvement suggestion 1", "Improvement suggestion 2"]
}

Code:
${code}`;

    const result = await this.model.generateContent(prompt);
    const text = result.response.text();
    const cleaned = text.replace(/```(?:json)?\s*/gi, "").trim();
    return JSON.parse(cleaned);
  }

  async extractJobDetails(content: string): Promise<JobDetailsResult> {
    const prompt = `You are a job listing parser. Extract structured job details from the text below (it may be a pasted job description or text scraped from a job board such as LinkedIn, Facebook, BdJobs, Indeed, Glassdoor, or a company career page).

Return ONLY a valid JSON object (no markdown, no code fences) with this exact structure:
{
  "title": "Job title, or empty string if unknown",
  "company": "Company or organization name, or empty string if unknown",
  "description": "The cleaned job description (responsibilities, requirements, how to apply). Preserve the original text as faithfully as possible; strip unrelated ads, navigation text and boilerplate. Empty string if the source text contains no real description.",
  "employmentType": "One of: FULL_TIME, PART_TIME, CONTRACT, INTERNSHIP, REMOTE. Empty string if unknown or not clearly stated.",
  "location": "Work location (city/country or 'Remote'), or empty string if unknown",
  "salaryRange": "Salary or compensation as written (e.g. '৳30,000 - ৳50,000'), or empty string if unknown",
  "department": "One of: CSE, ECSE, EEE, EEEE, BBA, MBA, ENGLISH, MAE, BANGLA, MAB, LLB, MPH, BPH, ME, CIVIL, BTX, EBTX. Empty string if it does not clearly belong to a university department.",
  "deadline": "Application deadline as an ISO date string (YYYY-MM-DD), or empty string if unknown",
  "applicationUrl": "URL where candidates should apply, or empty string if not present in the text"
}

Rules:
- Use empty strings for fields you cannot determine — never invent values.
- "employmentType" must be exactly one of the listed enum values or empty.
- "department" must be exactly one of the listed enum values or empty (only relevant for roles tied to a specific academic department, e.g. university teaching positions).

Source text:
${content}`;

    const result = await this.model.generateContent(prompt);
    const text = result.response.text();
    const cleaned = text.replace(/```(?:json)?\s*/gi, "").trim();
    return JSON.parse(cleaned);
  }
}
