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
function getFirstTurnPrompt(basePrompt: string, query: string): string {
  return `${basePrompt}

${getCurrentDateContext()}

[고민]
"${query}"

이 고민에 대해 네 관점에서 먼저 조언해. 다른 상담사들과 토론할 거니까 네 입장을 명확히 해!
3~4문장으로 짧게!`;
}

// 토론 이어가기 프롬프트
function getContinuedDebatePrompt(basePrompt: string, debateHistory: string, turnCount: number, agentName: string, query: string): string {
  // 발언 목록 추출
  const statements = debateHistory.split('\n\n').filter(s => s.trim().length > 0);
  
  // 해당 에이전트의 이전 발언들 추출
  const myPreviousStatements = statements
    .filter(s => s.startsWith(`[${agentName}]:`))
    .map(s => s.replace(`[${agentName}]:`, '').trim());
  
  // 이전 발언에서 핵심 키워드/문구 추출
  const extractKeyPhrases = (text: string): string[] => {
    const phrases: string[] = [];
    const firstSentence = text.split(/[.!?]/)[0];
    if (firstSentence) phrases.push(firstSentence.slice(0, 30));
    const numberMatches = text.match(/\d+[년개월%원만천억]+/g);
    if (numberMatches) phrases.push(...numberMatches.slice(0, 3));
    const keyExpressions = text.match(/(때가|운명|마음이|현실적으로|허허|감정|논리)/g);
    if (keyExpressions) phrases.push(...keyExpressions);
    return [...new Set(phrases)];
  };
  
  const usedKeyPhrases = myPreviousStatements.flatMap(extractKeyPhrases);
  
  // 마지막 발언자 추출
  const lastStatement = statements[statements.length - 1] || '';
  const lastSpeakerMatch = lastStatement.match(/\[([^\]]+)\]:/);
  const lastSpeaker = lastSpeakerMatch ? lastSpeakerMatch[1] : '';
  const lastContent = lastStatement.replace(/\[[^\]]+\]:/, '').trim();
  
  // 역할별 토론 지시
  let roleDebateInstruction = '';
  if (agentName === 'T형') {
    if (lastSpeaker === 'F형') {
      roleDebateInstruction = '⚔️ F형이 감정적으로 말했어. "감정으로 결정하면 망해", "숫자로 보면"으로 냉정하게 반박해!';
    } else if (lastSpeaker === '사주') {
      roleDebateInstruction = '⚔️ 사주가 운세 얘기했어. "운? 통계가 더 정확해", "데이터로 보면"으로 논리적으로 반박해!';
    }
  } else if (agentName === 'F형') {
    if (lastSpeaker === 'T형') {
      roleDebateInstruction = '⚔️ T형이 너무 차갑게 말했어. "야, 너무 차가워! 마음도 봐줘야지"라고 따뜻하게 반박해!';
    } else if (lastSpeaker === '사주') {
      roleDebateInstruction = '⚔️ 사주가 기다리라고 했어. "기다리는 것도 좋지만 마음이 원할 때가 진짜 때야"라고 감성적으로 반박해!';
    }
  } else if (agentName === '사주') {
    if (lastSpeaker === 'T형' || lastSpeaker === 'F형') {
      roleDebateInstruction = '⚔️ T형과 F형이 싸우고 있어. "허허, 다 부질없는 소리다"라며 제3의 운명론적 시각을 제시해!';
    }
  }
  
  // 다른 에이전트들의 최근 발언 (전체 내용 표시)
  const otherStatements = statements
    .filter(s => !s.startsWith(`[${agentName}]:`))
    .slice(-2)
    .map(s => {
      const match = s.match(/\[([^\]]+)\]:([\s\S]*)/);
      if (match) return `${match[1]}: "${match[2].trim()}"`;
      return s;
    })
    .join('\n');
  
  // 강화된 반복 방지 경고
  let repeatWarning = '';
  if (myPreviousStatements.length > 0) {
    repeatWarning = `

🚫 [반복 금지!]
네가 이미 한 말: "${myPreviousStatements[myPreviousStatements.length - 1].slice(0, 80)}..."
금지 표현: ${usedKeyPhrases.slice(0, 4).map(p => `"${p}"`).join(', ')}
→ 완전히 다른 논점이나 예시로 말할 것!`;
  }

  const turnInstruction = turnCount >= 5 
    ? '\n💡 토론 막바지! 핵심만 짧게!'
    : '';

  return `${basePrompt}

${getCurrentDateContext()}

[사용자 고민]
"${query}"

[이전 토론 - 반드시 읽고 반응할 것]
${otherStatements}

${roleDebateInstruction}
${repeatWarning}
${turnInstruction}

위 발언에 직접 반응하며 네 입장을 밝혀! 3~4문장!`;
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
const FINAL_VERDICT_PROMPT = `너는 '삼자대면' 토론 정리자야. 토론 내용을 분석해서 JSON으로 정리해.

# 분석 방법
1. 세 상담사(T형, F형, 사주)가 공통으로 동의한 부분 찾기
2. 가장 큰 의견 차이 파악
3. 각자의 핵심 조언 1문장씩 정리 (반드시 3개만!)
4. 사용자를 위한 실용적 가이드 제시

# 출력 규칙
- 반드시 유효한 JSON만 출력
- keyPoints는 반드시 정확히 3개! (T형, F형, 사주 순서)
- 각 keyPoints에 에이전트 이름 붙이지 마 (예: "T형:"❌)
- 모든 필드 반드시 채우기

{
  "consensus": "세 상담사가 동의한 핵심 포인트 1문장",
  "disagreement": "가장 큰 의견 차이 1문장",
  "keyPoints": [
    "T형의 핵심 조언 1문장 (논리/숫자 기반)",
    "F형의 핵심 조언 1문장 (감정/마음 기반)",
    "사주의 핵심 조언 1문장 (시기/운세 기반)"
  ],
  "recommendation": "어떤 관점을 따를지 사용자가 선택하도록 안내하는 2문장"
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
      // @ts-expect-error - thinkingConfig for gemini-2.5-flash
      generationConfig: { temperature: 0.1, thinkingConfig: { thinkingBudget: 0 } },
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
          getFirstTurnPrompt(basePrompt, query), 
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

        await new Promise(resolve => setTimeout(resolve, 1200));

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
            getContinuedDebatePrompt(agentBasePrompt, debateHistory, turnCount, agent.name, query),
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

          await new Promise(resolve => setTimeout(resolve, 1200));
        }

        // 합의 체크 후 추가 토론
        while (!consensusReached && turnCount < MAX_TURNS) {
          // 합의 여부 체크
          const consensusResult = await model!.generateContent({
            contents: [{ role: 'user', parts: [{ text: checkConsensusPrompt(query, debateHistory, turnCount) }] }],
            // @ts-expect-error - thinkingConfig for gemini-2.5-flash
            generationConfig: { temperature: 0.1, thinkingConfig: { thinkingBudget: 0 } },
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
            getContinuedDebatePrompt(nextBasePrompt, debateHistory, turnCount, nextAgent.name, query),
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

          await new Promise(resolve => setTimeout(resolve, 1200));
        }

        // 최종 판결
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'verdict_start',
        })}\n\n`));

        const verdictPrompt = `${FINAL_VERDICT_PROMPT}

질문: ${query}

토론 전체 내용:
${debateHistory}

위 토론 내용을 분석해서 반드시 유효한 JSON만 출력해. 다른 텍스트 없이 JSON만!`;

        const verdictResult = await model!.generateContent({
          contents: [{ role: 'user', parts: [{ text: verdictPrompt }] }],
          // @ts-expect-error - thinkingConfig for gemini-2.5-flash
          generationConfig: { temperature: 0.2, thinkingConfig: { thinkingBudget: 0 } },
        });

        const verdictText = verdictResult.response.text();
        console.log('Verdict raw response:', verdictText); // 디버깅용 로그
        
        const jsonMatch = verdictText.match(/\{[\s\S]*\}/);
        
        let verdict: FinalVerdict = {
          consensus: '세 상담사의 의견을 종합했습니다.',
          keyPoints: [],
          recommendation: '각 관점을 참고해 본인에게 맞는 선택을 해보세요.',
        };

        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            verdict = {
              consensus: parsed.consensus || '세 상담사가 각자의 관점에서 조언했습니다.',
              disagreement: parsed.disagreement || undefined,
              keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints.slice(0, 3) : [],
              recommendation: parsed.recommendation || '본인의 상황에 맞는 조언을 선택하세요.',
            };
          } catch (e) {
            console.error('Failed to parse verdict JSON:', e);
            console.error('JSON match was:', jsonMatch[0]);
            // 파싱 실패해도 기본값 사용
          }
        } else {
          console.error('No JSON found in verdict response');
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
