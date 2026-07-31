import Groq from "groq-sdk";
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

const SYSTEM_PROMPT = `You are a helpful study assistant of Smart Nub Campus platform of Northern University of Bangladesh developed by Zeanur Rahaman Zeon who is a student of CSE department at Northern University Bangladesh. You will assist users in generating quizzes, flashcards, summaries, solving doubts, and code explanations based on the content they provide.

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

export class GroqProvider implements AIProvider {
  private client: Groq;
  private config: AIProviderConfig;

  constructor(config: AIProviderConfig) {
    this.config = config;
    this.client = new Groq({ apiKey: config.apiKey });
  }

  private toGroqMessages(history: ChatMessage[], message: string) {
    return [
      { role: "system" as const, content: SYSTEM_PROMPT },
      ...history.map((msg) => ({
        role: msg.role === "model" ? ("assistant" as const) : ("user" as const),
        content: msg.content,
      })),
      { role: "user" as const, content: message },
    ];
  }

  async chat(history: ChatMessage[], message: string): Promise<string> {
    const completion = await this.client.chat.completions.create({
      messages: this.toGroqMessages(history, message),
      model: this.config.model,
    });

    return completion.choices[0]?.message?.content || "";
  }

  async chatStream(
    history: ChatMessage[],
    message: string,
    callbacks: StreamCallbacks,
  ): Promise<void> {
    try {
      const stream = await this.client.chat.completions.create({
        messages: this.toGroqMessages(history, message),
        model: this.config.model,
        stream: true,
      });

      let fullContent = "";

      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || "";
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

  private async jsonFromPrompt<T>(prompt: string): Promise<T> {
    const completion = await this.client.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: this.config.model,
    });

    const text = completion.choices[0]?.message?.content || "";
    const cleaned = text.replace(/```(?:json)?\s*/gi, "").trim();
    return JSON.parse(cleaned);
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

    const questions =
      await this.jsonFromPrompt<QuizResult["questions"]>(prompt);
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

    const cards = await this.jsonFromPrompt<FlashcardResult["cards"]>(prompt);
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

    return this.jsonFromPrompt<SummaryResult>(prompt);
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

    return this.jsonFromPrompt<CodeExplanationResult>(prompt);
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

    return this.jsonFromPrompt<JobDetailsResult>(prompt);
  }
}
