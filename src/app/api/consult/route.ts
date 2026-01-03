import { invokeInstinctAgent } from '@/lib/agents/instinct';
import { invokeLogicAgent } from '@/lib/agents/logic';
import { invokeRealityAgent } from '@/lib/agents/reality';
import { model } from '@/lib/gemini';
import { formatSajuForAgent, type BirthInfo, type SajuData } from '@/lib/saju/engine';
import type { AgentResponse, ConsultResponse, FinalVerdict } from '@/types';
import { NextRequest, NextResponse } from 'next/server';

// 최종 판결자 (The Judge) 프롬프트
const VERDICT_PROMPT = `# Role
너는 '삼자대면' 회의의 의장이다. 위 3명의 에이전트(논리, 본능, 현실)가 나눈 대화 로그를 보고 최종 결론을 내려야 한다.

# Instruction
1. 3명의 의견 중 다수결 혹은 가장 설득력 있는 의견을 채택하라.
2. 최종 판정은 [승인(GRANTED)], [기각(DENIED)], [보류(HOLD)] 중 하나로 결정하라.
3. 한 줄 요약평을 남겨라.
4. winner 필드에는 가장 설득력 있던 조언자를 한글로 적어라 (논리/본능/현실)

# Output Format (반드시 JSON만 출력)
{
  "decision": "GRANTED" | "DENIED" | "HOLD",
  "winner": "논리" | "본능" | "현실",
  "reason": "판결 요약 (1-2문장)"
}`;

export async function POST(request: NextRequest) {
  try {
    const { query, birthInfo, sajuData } = await request.json() as {
      query: string;
      birthInfo?: BirthInfo;
      sajuData?: SajuData;
    };

    if (!query) {
      return NextResponse.json(
        { error: '질문을 입력해주세요.' },
        { status: 400 }
      );
    }

    // 사주 컨텍스트 생성 (본능 에이전트용)
    let sajuContext: string | undefined;
    if (birthInfo && sajuData) {
      sajuContext = formatSajuForAgent(birthInfo, sajuData);
    }

    // 3개의 에이전트 병렬 호출
    const [logicContent, instinctContent, realityContent] = await Promise.all([
      invokeLogicAgent(query),
      invokeInstinctAgent(query, sajuContext),
      invokeRealityAgent(query),
    ]);

    const agentResponses: AgentResponse[] = [
      { agent: 'LOGIC', content: logicContent, status: 'completed' },
      { agent: 'INSTINCT', content: instinctContent, status: 'completed' },
      { agent: 'REALITY', content: realityContent, status: 'completed' },
    ];

    // 최종 판결 생성
    const verdictPrompt = `${VERDICT_PROMPT}

사용자 질문: ${query}

[논리]의 조언:
${logicContent}

[본능]의 조언:
${instinctContent}

[현실]의 조언:
${realityContent}

위 조언들을 종합하여 JSON 형식으로 최종 판결을 내려주세요. JSON만 출력하고 다른 텍스트는 출력하지 마세요.`;

    const verdictResult = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: verdictPrompt }] }],
      generationConfig: {
        maxOutputTokens: 300,
        temperature: 0.3,
      },
    });

    const verdictText = verdictResult.response.text();

    // JSON 파싱 (코드블록 제거)
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
        console.error('Failed to parse verdict JSON:', verdictText);
      }
    }

    const response: ConsultResponse = {
      agents: agentResponses,
      verdict,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Consult API Error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
