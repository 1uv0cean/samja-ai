import { F_AGENT_CONFIG } from '@/lib/agents/f';
import { SAJU_AGENT_CONFIG } from '@/lib/agents/saju';
import { T_AGENT_CONFIG } from '@/lib/agents/t';
import { generateResponse, model } from '@/lib/gemini';
import { formatSajuForAgent, type BirthInfo, type SajuData } from '@/lib/saju/engine';
import type { FinalVerdict } from '@/types';
import { NextRequest } from 'next/server';

// 토론 순서를 랜덤하게 섞는 함수
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// 에이전트 정보
const AGENTS = [
  { id: 'T' as const, name: 'T형', config: T_AGENT_CONFIG },
  { id: 'F' as const, name: 'F형', config: F_AGENT_CONFIG },
  { id: 'SAJU' as const, name: '사주', config: SAJU_AGENT_CONFIG },
];

// 토론용 프롬프트
function getDebatePrompt(basePrompt: string, debateContext: string, isFirst: boolean): string {
  if (isFirst) {
    return `${basePrompt}

# 토론 진행
너는 이 질문에 대해 첫 번째로 발언하게 됐어. 네 관점에서 솔직하게 의견을 말해줘.
2-3문장 이내로 간결하게 답변해.`;
  }
  
  return `${basePrompt}

# 토론 진행
다른 상담사들이 먼저 의견을 냈어. 그들의 의견을 참고해서 네 관점에서 의견을 말해줘.
동의할 수도 있고, 다른 시각을 제시할 수도 있어. 자연스럽게 대화하듯이 해줘.
2-3문장 이내로 간결하게 답변해.

# 이전 발언들
${debateContext}`;
}

// 최종 판결 프롬프트
const VERDICT_PROMPT = `# Role
너는 '삼자대면' 토론의 최종 정리자야.

# Instruction
토론 내용을 종합해서 판정해.
- 최종 판정: GRANTED(해도 좋음), DENIED(하지 마), HOLD(보류) 중 하나
- 1-2문장으로 요약
- winner: 가장 설득력 있던 상담사 (T형/F형/사주)

# Output (JSON만)
{"decision":"GRANTED|DENIED|HOLD","winner":"T형|F형|사주","reason":"요약"}`;

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();
  
  const { query, birthInfo, sajuData } = await request.json() as {
    query: string;
    birthInfo?: BirthInfo;
    sajuData?: SajuData;
  };

  if (!query) {
    return new Response(JSON.stringify({ error: '질문을 입력해주세요.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 사주 컨텍스트
  let sajuContext: string | undefined;
  if (birthInfo && sajuData) {
    sajuContext = formatSajuForAgent(birthInfo, sajuData);
  }

  // 토론 순서 랜덤 결정
  const debateOrder = shuffleArray(AGENTS);

  const stream = new ReadableStream({
    async start(controller) {
      try {
        let debateContext = '';
        const responses: { agent: string; content: string }[] = [];

        // 순서대로 에이전트 발언
        for (let i = 0; i < debateOrder.length; i++) {
          const agent = debateOrder[i];
          const isFirst = i === 0;

          // 발언 시작 알림
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'agent_start',
            agent: agent.id,
            order: i + 1,
          })}\n\n`));

          // 에이전트 프롬프트 구성
          let basePrompt = agent.config.systemPrompt;
          if (agent.id === 'SAJU' && sajuContext) {
            basePrompt += `\n\n# 사용자 사주 정보\n${sajuContext}`;
          }

          const debatePrompt = getDebatePrompt(basePrompt, debateContext, isFirst);

          // 응답 생성
          const content = await generateResponse(debatePrompt, query, {
            temperature: agent.config.temperature,
          });

          responses.push({ agent: agent.id, content });

          // 발언 완료 알림
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'agent_response',
            agent: agent.id,
            content,
            order: i + 1,
          })}\n\n`));

          // 다음 에이전트를 위한 컨텍스트 업데이트
          debateContext += `[${agent.name}]: ${content}\n\n`;

          // 잠시 대기 (자연스러운 느낌)
          await new Promise(resolve => setTimeout(resolve, 300));
        }

        // 최종 판결 생성
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'verdict_start',
        })}\n\n`));

        const verdictPrompt = `${VERDICT_PROMPT}

질문: ${query}

토론:
${responses.map((r, i) => {
  const agent = AGENTS.find(a => a.id === r.agent);
  return `${i + 1}. [${agent?.name}]: ${r.content}`;
}).join('\n')}

JSON만 출력:`;

        const verdictResult = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: verdictPrompt }] }],
          generationConfig: { maxOutputTokens: 200, temperature: 0.3 },
        });

        const verdictText = verdictResult.response.text();
        const jsonMatch = verdictText.match(/\{[\s\S]*\}/);
        
        let verdict: FinalVerdict = {
          decision: 'HOLD',
          reason: '판결을 내리는 데 문제가 발생했습니다.',
          winner: '',
        };

        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            verdict = {
              decision: parsed.decision || 'HOLD',
              reason: parsed.reason || '',
              winner: parsed.winner || '',
            };
          } catch {
            console.error('Failed to parse verdict');
          }
        }

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'verdict',
          verdict,
        })}\n\n`));

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
        controller.close();
      } catch (error) {
        console.error('Stream error:', error);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'error',
          message: '오류가 발생했습니다.',
        })}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
