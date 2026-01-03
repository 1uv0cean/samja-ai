import { GoogleGenerativeAI } from '@google/generative-ai';

// API 키 검증
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('❌ GEMINI_API_KEY 환경변수가 설정되지 않았습니다.');
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export const model = genAI?.getGenerativeModel({
  model: 'gemini-2.5-flash-lite',
}) ?? null;

export interface GenerateOptions {
  temperature?: number;
  maxOutputTokens?: number;
}

export class GeminiError extends Error {
  constructor(message: string, public readonly code: 'API_KEY_MISSING' | 'API_ERROR' | 'PARSE_ERROR') {
    super(message);
    this.name = 'GeminiError';
  }
}

export async function generateResponse(
  systemPrompt: string,
  userQuery: string,
  options: GenerateOptions = {}
): Promise<string> {
  if (!model) {
    throw new GeminiError(
      'AI 서비스가 설정되지 않았습니다. 관리자에게 문의해주세요.',
      'API_KEY_MISSING'
    );
  }

  const { temperature = 0.5, maxOutputTokens = 500 } = options;

  try {
    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [{ text: `${systemPrompt}\n\n사용자 질문: ${userQuery}` }],
        },
      ],
      generationConfig: {
        maxOutputTokens,
        temperature,
      },
    });

    const text = result.response.text();
    if (!text) {
      throw new GeminiError('AI 응답이 비어있습니다.', 'PARSE_ERROR');
    }

    return text;
  } catch (error) {
    if (error instanceof GeminiError) {
      throw error;
    }
    
    console.error('Gemini API 오류:', error);
    throw new GeminiError(
      'AI 응답 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      'API_ERROR'
    );
  }
}
