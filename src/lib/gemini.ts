import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const model = genAI.getGenerativeModel({
  model: 'gemini-2.5-flash-lite',
});

export interface GenerateOptions {
  temperature?: number;
  maxOutputTokens?: number;
}

export async function generateResponse(
  systemPrompt: string,
  userQuery: string,
  options: GenerateOptions = {}
): Promise<string> {
  const { temperature = 0.5, maxOutputTokens = 500 } = options;

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

  return result.response.text();
}
