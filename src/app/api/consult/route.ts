import { F_AGENT_CONFIG } from '@/lib/agents/f';
import { SAJU_AGENT_CONFIG } from '@/lib/agents/saju';
import { T_AGENT_CONFIG } from '@/lib/agents/t';
import { GeminiError, generateResponse, model } from '@/lib/gemini';
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

// 현재 날짜 정보 생성
function getCurrentDateContext(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return `# 현재 날짜 정보
오늘: ${year}년 ${month}월 ${now.getDate()}일
상반기/하반기: ${month <= 6 ? '상반기' : '하반기'}
시점 참고: "올해"는 ${year}년, "내년"은 ${year + 1}년, "작년"은 ${year - 1}년을 의미해.`;
}

// 첫 발언 프롬프트
function getFirstTurnPrompt(basePrompt: string): string {
  return `${basePrompt}

${getCurrentDateContext()}

# 토론 시작
너는 이 질문에 대해 첫 번째로 의견을 말하게 됐어.

필수 요구사항:
1. 네 관점에서 명확한 입장을 밝혀 (찬성인지 반대인지, 왜 그런지)
2. 네 전문 영역의 근거를 반드시 1개 이상 제시
   - T형: 숫자/확률/논리
   - F형: 감정/마음/행복
   - 사주: 타이밍/운/시기 (구체적인 연도/월 언급)
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

${getCurrentDateContext()}

# 토론 마무리 단계
지금까지의 대화:
${debateHistory}
${previousStatementsWarning}

# 이제 결론을 내릴 시간!
${lastSpeaker}의 말을 듣고, 실용적인 합의안을 제시해.

⚠️ 주의: 억지로 동의하지 마!
- 네 관점을 버리지 않으면서 타협점을 찾아
- "모두 옳다"는 식의 애매한 결론 금지

필수 요구사항:
1. 다른 상담사 의견 중 인정할 부분 명확히 언급
2. 하지만 네 관점에서 꼭 지켜야 할 것 강조
3. 구체적인 행동 가이드 제시 (시기 + 조건 + 마음가짐)

2-3문장으로!`;
  }

  // 전반부 토론
  // 다른 에이전트들의 마지막 발언 추출
  const otherAgentsStatements = debateHistory
    .split('\n\n')
    .filter(s => !s.startsWith(`[${agentName}]:`))
    .slice(-2) // 최근 2개
    .join('\n');

  return `${basePrompt}

${getCurrentDateContext()}

# 입체적 토론 진행 중
지금까지의 대화:
${debateHistory}
${previousStatementsWarning}

# ${lastSpeaker}에게 반응하기

📌 ${lastSpeaker}가 방금 한 말의 핵심을 파악해:
${otherAgentsStatements ? `최근 다른 상담사들 발언:\n${otherAgentsStatements}` : ''}

# 입체적 반응 가이드
1. **직접 인용하며 반응**: "${lastSpeaker}가 '~'라고 했는데..."로 시작
2. **부분 동의 + 부분 반대**: 100% 찬성/반대보다 "그건 맞는데, 이 부분은..."
3. **네 관점에서 보완**: 상대가 놓친 부분을 네 전문 영역으로 채워줘
   - T형: 현실적 조건, 구체적 계획
   - F형: 감정적 측면, 장기적 행복  
   - 사주: 시기와 타이밍, 기운의 흐름

⚠️ 피해야 할 것:
- "좋은 의견이야" 같은 빈 칭찬
- 상대 말 반복하기
- 맥락 없이 새 주장 던지기

2-3문장으로!`;
}

// 합의 체크 프롬프트 - 최소 6턴 이후에만 합의 가능
const checkConsensusPrompt = (query: string, debateHistory: string, turnCount: number) => `너는 토론 분석가야. 

질문: ${query}
토론 횟수: ${turnCount}번

토론 내용:
${debateHistory}

분석:
1. 세 상담사가 각자 충분히 의견을 피력했는가? (최소 2번씩은 발언해야 함)
2. 서로의 의견에 대해 충분히 반박하고 토론했는가?
3. 아직 다루지 않은 중요한 관점이 있는가?

판정 기준:
- ${turnCount < 6 ? '⚠️ 아직 토론이 충분하지 않음! CONTINUE 필수!' : '토론이 어느 정도 진행됨'}
- CONSENSUS: ${turnCount >= 6 ? '충분히 토론했고 더 새로운 의견이 없을 것 같음' : '절대 선택 금지'}
- CONTINUE: 아직 더 깊은 토론 필요

${turnCount < 6 ? '반드시 CONTINUE를 선택하라!' : '신중하게 판단하라.'}

JSON만: {"status":"CONSENSUS|CONTINUE"}`;

// 최종 합의 요약 프롬프트
const FINAL_VERDICT_PROMPT = `# Role
너는 '삼자대면' 토론의 최종 정리자야.

# 핵심 원칙
⚠️ 중요: 억지 합의 금지!
- 세 상담사가 의견이 다르면 다르다고 솔직히 말해
- 공통점이 있는 부분만 "합의"로 정리
- 이견이 있는 부분은 각 관점의 차이로 명확히 구분

# Instruction
토론 내용을 분석해서:
1. 세 상담사가 공통으로 동의한 포인트는? (없으면 "명확한 합의 없음")
2. 가장 큰 이견은 무엇인가? (예: 타이밍, 방법론, 우선순위)
3. 각 상담사의 최종 입장을 한 문장으로 요약
4. 사용자가 자신에게 맞는 관점을 선택할 수 있도록 안내

# Output (JSON)
주의: 각 조언에 "T형:", "F형:", "사주:" 같은 이름 prefix 붙이지 마!

{
  "consensus": "세 상담사가 공통으로 동의한 부분 1문장 (없으면 '세 관점이 서로 다른 방향을 제시합니다')",
  "disagreement": "가장 큰 이견 1문장 (예: '타이밍에 대한 의견이 가장 달랐습니다')",
  "keyPoints": [
    "T형 최종 입장: 구체적인 조언 1문장",
    "F형 최종 입장: 구체적인 조언 1문장", 
    "사주 최종 입장: 구체적인 조언 1문장"
  ],
  "recommendation": "사용자에게 맞는 선택을 위한 가이드 2문장 (예: 'A가 중요하면 T형 조언을, B가 중요하면 F형 조언을 참고하세요')"
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

  // AI 모델 사용 가능 여부 확인
  if (!model) {
    return new Response(JSON.stringify({ 
      error: 'AI 서비스가 현재 사용 불가합니다. 관리자에게 문의해주세요.' 
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 사주 컨텍스트
  let sajuContext: string | undefined;
  if (birthInfo && sajuData) {
    sajuContext = formatSajuForAgent(birthInfo, sajuData);
  }

  // 질문 적합성 검증
  const validationPrompt = `너는 상담 질문 검증 AI야. 
사용자의 질문이 "삼자대면" 상담(T형/F형/사주 관점에서 토론)에 적합한지 판단해.

적합한 질문 예시:
- 고민 상담: "이직해도 될까요?", "연애를 시작해도 될까?"
- 선택/결정: "A와 B 중 뭘 선택해야 할까?", "창업 vs 취업"
- 인생 조언: "요즘 무기력해요", "새로운 도전을 해볼까?"

부적절한 질문:
- 단순 정보 요청: "오늘 날씨 어때?", "파이썬 문법 알려줘"
- 의미없는 문장: "ㅋㅋㅋ", "테스트", "안녕"
- 불법/유해 내용
- 너무 짧거나 구체적이지 않은 질문: "ㅇㅇ", "어떻게 해"

사용자 질문: "${query}"

JSON으로만 응답:
{
  "isValid": true 또는 false,
  "reason": "부적절한 경우에만 이유 설명",
  "suggestion": "부적절한 경우 예시 질문 제안"
}`;

  try {
    const validationResult = await model!.generateContent({
      contents: [{ role: 'user', parts: [{ text: validationPrompt }] }],
      generationConfig: { maxOutputTokens: 150, temperature: 0.1 },
    });

    const validationText = validationResult.response.text();
    const validationMatch = validationText.match(/\{[\s\S]*\}/);
    
    if (validationMatch) {
      try {
        const validation = JSON.parse(validationMatch[0]);
        if (!validation.isValid) {
          return new Response(JSON.stringify({ 
            error: 'invalid_query',
            message: validation.reason || '상담에 적합한 질문을 입력해주세요.',
            suggestion: validation.suggestion || '예: "이직을 해도 될까요?", "새로운 시작을 해볼까요?"',
          }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      } catch {
        // 파싱 실패시 일단 통과
      }
    }
  } catch (error) {
    console.error('Validation error:', error);
    // 검증 실패시 일단 통과 (사용자 경험 우선)
  }

  // 최대 발언 횟수 (첫 3턴 + 추가 5턴 = 8턴으로 충분한 토론)
  const MAX_TURNS = 8;

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
          const consensusResult = await model!.generateContent({
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

          // 다음 발언자 선택 (초기 랜덤 순서 유지하면서 순환)
          const nextAgent = initialOrder[turnCount % 3];

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

        const verdictResult = await model!.generateContent({
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
              disagreement: parsed.disagreement || undefined,
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
        
        let errorMessage = '오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
        let errorCode = 'UNKNOWN_ERROR';
        
        if (error instanceof GeminiError) {
          errorMessage = error.message;
          errorCode = error.code;
        } else if (error instanceof Error) {
          // 네트워크 오류 등
          if (error.message.includes('fetch')) {
            errorMessage = '네트워크 연결에 문제가 있습니다.';
            errorCode = 'NETWORK_ERROR';
          }
        }
        
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'error',
          message: errorMessage,
          code: errorCode,
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
