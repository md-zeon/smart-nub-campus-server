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
import {
  buildJobDetailsPrompt,
  buildJobDetailsRepairPrompt,
  EMPTY_JOB_DETAILS,
  JOB_DETAILS_REPAIR_ERROR,
  parseJobDetailsJson,
} from "../job-details";

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
    const result = await this.model.generateContent({
      contents: [{ role: "user", parts: [{ text: buildJobDetailsPrompt(content) }] }],
      generationConfig: { temperature: 0 },
    });
    const parsed = parseJobDetailsJson(result.response.text());
    if (parsed) return parsed;

    const repair = await this.model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            { text: buildJobDetailsRepairPrompt(content, JOB_DETAILS_REPAIR_ERROR) },
          ],
        },
      ],
      generationConfig: { temperature: 0 },
    });
    return parseJobDetailsJson(repair.response.text()) ?? EMPTY_JOB_DETAILS;
  }
}
