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

// 첫 발언 프롬프트
function getFirstTurnPrompt(basePrompt: string): string {
  return `${basePrompt}

# 토론 시작
너는 이 질문에 대해 첫 번째로 의견을 말하게 됐어.

필수 요구사항:
1. 네 관점에서 명확한 입장을 밝혀 (찬성인지 반대인지, 왜 그런지)
2. 네 전문 영역의 근거를 반드시 1개 이상 제시
   - T형: 숫자/확률/논리
   - F형: 감정/마음/행복
   - 사주: 타이밍/운/시기
3. 2-3문장으로 답변해`;
}

// 토론 이어가기 프롬프트
function getContinuedDebatePrompt(basePrompt: string, debateHistory: string, turnCount: number, agentName: string): string {
  // 마지막 발언자 추출
  const lastSpeaker = debateHistory.match(/\[([^\]]+)\]:[^\[]*$/)?.[1] || '';
  
  // 해당 에이전트의 이전 발언들 추출
  const myPreviousStatements = debateHistory
    .split('\n\n')
    .filter(s => s.startsWith(`[${agentName}]:`))
    .map(s => s.replace(`[${agentName}]:`, '').trim());
  
  const previousStatementsWarning = myPreviousStatements.length > 0 
    ? `
⚠️ 네가 이미 한 말들 (반복 금지!):
${myPreviousStatements.map((s, i) => `${i + 1}. "${s.slice(0, 60)}..."`).join('\n')}
` : '';

  // 후반부 토론 (5턴 이후)
  if (turnCount >= 5) {
    return `${basePrompt}

# 토론 마무리 단계
지금까지의 대화:
${debateHistory}
${previousStatementsWarning}

# 결론을 향해!
${lastSpeaker}의 말을 듣고, 이제 합의점을 찾아야 해.

필수 요구사항:
1. 다른 상담사들 의견 중 동의하는 부분 인정
2. 네 관점에서 타협 가능한 결론 제시
3. 구체적인 행동 제안 (예: "6개월 준비 후", "일단 부업으로 테스트")

2-3문장으로, 명확한 결론과 함께!`;
  }

  // 전반부 토론
  return `${basePrompt}

# 토론 진행 중
지금까지의 대화:
${debateHistory}
${previousStatementsWarning}

# ${lastSpeaker}에게 반응해!

필수 요구사항:
1. ${lastSpeaker}의 말에 동의 또는 반대 표명 (애매하게 X)
2. 네 전문 영역의 근거로 주장 강화
   - T형: 숫자/확률/논리
   - F형: 감정/마음/행복  
   - 사주: 타이밍/운/시기
3. 새로운 관점이나 질문 던지기

2-3문장으로, 네 주장을 명확히!`;
}

// 합의 체크 프롬프트
const checkConsensusPrompt = (query: string, debateHistory: string, turnCount: number) => `너는 토론 분석가야. 

질문: ${query}
토론 횟수: ${turnCount}번

토론 내용:
${debateHistory}

분석:
1. 세 상담사가 공통으로 동의하는 부분이 있는가?
2. 결론을 향해 수렴하고 있는가?
3. ${turnCount}번이나 토론했으니 이제 결론을 내릴 때인가?

판정:
- CONSENSUS: 더 토론해도 새로운 의견 없을 것 같음, 결론 가능
- CONTINUE: 아직 중요한 쟁점이 남아있음 (단, 최대 2턴 더만 허용)

JSON만: {"status":"CONSENSUS|CONTINUE"}`;

// 최종 합의 요약 프롬프트
const FINAL_VERDICT_PROMPT = `# Role
너는 '삼자대면' 토론의 최종 정리자야.

# 핵심 원칙
- "해라/하지마라" 같은 단순 판정이 아니라
- 세 상담사가 토론을 통해 도달한 합의점을 정리해서 알려줘
- 실질적이고 구체적인 조언을 담아야 해

# Instruction
토론 내용을 분석해서:
1. 세 상담사가 공통으로 동의한 핵심 포인트는 무엇인가?
2. 각자 다른 관점에서 제시한 조언 중 조화시킬 수 있는 것은?
3. 결론적으로 사용자가 어떻게 하면 좋을지 구체적인 행동 가이드

# Output (JSON만)
{
  "consensus": "세 상담사가 합의한 핵심 조언 1-2문장",
  "keyPoints": ["T형의 핵심 조언", "F형의 핵심 조언", "사주의 핵심 조언"],
  "recommendation": "종합적인 행동 가이드 2-3문장"
}`;

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

  // 최대 발언 횟수 (첫 3턴 + 추가 3턴 = 6턴이면 충분)
  const MAX_TURNS = 6;

  const stream = new ReadableStream({
    async start(controller) {
      try {
        let debateHistory = '';
        let turnCount = 0;
        let consensusReached = false;

        // 첫 발언 순서 랜덤
        const initialOrder = shuffleArray(AGENTS);

        // 첫 번째 에이전트 발언
        const firstAgent = initialOrder[0];
        
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'agent_start',
          agent: firstAgent.id,
        })}\n\n`));

        let basePrompt = firstAgent.config.systemPrompt;
        if (firstAgent.id === 'SAJU' && sajuContext) {
          basePrompt += `\n\n# 사용자 사주 정보\n${sajuContext}`;
        }

        const firstResponse = await generateResponse(
          getFirstTurnPrompt(basePrompt), 
          query, 
          { temperature: firstAgent.config.temperature }
        );

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'agent_response',
          agent: firstAgent.id,
          content: firstResponse,
        })}\n\n`));

        debateHistory += `[${firstAgent.name}]: ${firstResponse}\n\n`;
        turnCount++;

        await new Promise(resolve => setTimeout(resolve, 300));

        // 두 번째, 세 번째 에이전트 초기 발언
        for (let i = 1; i < initialOrder.length; i++) {
          const agent = initialOrder[i];

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'agent_start',
            agent: agent.id,
          })}\n\n`));

          let agentBasePrompt = agent.config.systemPrompt;
          if (agent.id === 'SAJU' && sajuContext) {
            agentBasePrompt += `\n\n# 사용자 사주 정보\n${sajuContext}`;
          }

          const response = await generateResponse(
            getContinuedDebatePrompt(agentBasePrompt, debateHistory, turnCount, agent.name),
            query,
            { temperature: agent.config.temperature }
          );

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'agent_response',
            agent: agent.id,
            content: response,
          })}\n\n`));

          debateHistory += `[${agent.name}]: ${response}\n\n`;
          turnCount++;

          await new Promise(resolve => setTimeout(resolve, 300));
        }

        // 합의 체크 후 추가 토론
        while (!consensusReached && turnCount < MAX_TURNS) {
          // 합의 여부 체크
          const consensusResult = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: checkConsensusPrompt(query, debateHistory, turnCount) }] }],
            generationConfig: { maxOutputTokens: 50, temperature: 0.1 },
          });

          const consensusText = consensusResult.response.text();
          const match = consensusText.match(/\{[\s\S]*\}/);
          
          if (match) {
            try {
              const parsed = JSON.parse(match[0]);
              if (parsed.status === 'CONSENSUS') {
                consensusReached = true;
                break;
              }
            } catch {
              // 파싱 실패시 계속 진행
            }
          }

          // 다음 발언자 선택 (순환)
          const nextAgent = AGENTS[turnCount % 3];

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'agent_start',
            agent: nextAgent.id,
          })}\n\n`));

          let nextBasePrompt = nextAgent.config.systemPrompt;
          if (nextAgent.id === 'SAJU' && sajuContext) {
            nextBasePrompt += `\n\n# 사용자 사주 정보\n${sajuContext}`;
          }

          const response = await generateResponse(
            getContinuedDebatePrompt(nextBasePrompt, debateHistory, turnCount, nextAgent.name),
            query,
            { temperature: Math.max(0.2, nextAgent.config.temperature - 0.1 * Math.floor(turnCount / 3)) }
          );

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'agent_response',
            agent: nextAgent.id,
            content: response,
          })}\n\n`));

          debateHistory += `[${nextAgent.name}]: ${response}\n\n`;
          turnCount++;

          await new Promise(resolve => setTimeout(resolve, 300));
        }

        // 최종 판결
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'verdict_start',
        })}\n\n`));

        const verdictPrompt = `${FINAL_VERDICT_PROMPT}

질문: ${query}

토론 전체 내용:
${debateHistory}

JSON만 출력:`;

        const verdictResult = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: verdictPrompt }] }],
          generationConfig: { maxOutputTokens: 300, temperature: 0.3 },
        });

        const verdictText = verdictResult.response.text();
        const jsonMatch = verdictText.match(/\{[\s\S]*\}/);
        
        let verdict: FinalVerdict = {
          consensus: '합의 내용을 정리하는 데 문제가 발생했습니다.',
          keyPoints: [],
          recommendation: '다시 시도해주세요.',
        };

        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            verdict = {
              consensus: parsed.consensus || '세 상담사의 의견을 종합했습니다.',
              keyPoints: parsed.keyPoints || [],
              recommendation: parsed.recommendation || '',
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
