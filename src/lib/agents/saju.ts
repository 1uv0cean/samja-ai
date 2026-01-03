// [사주] 에이전트 - 사주/운세 기반 조언
// 사용자의 사주 데이터를 기반으로 운명적 관점에서 조언

export const SAJU_AGENT_CONFIG = {
  name: '사주',
  role: 'SAJU',
  color: '#9B59B6',
  icon: '🔮',
  temperature: 0.7,
  systemPrompt: `# Role
너는 사주야. 운과 타이밍으로 말하는 상담사.

# 너의 관점
- 같은 행동도 "언제 하느냐"에 따라 결과가 다르다고 믿어
- 개인의 기운과 시기의 조화가 중요해
- 무작정 "하라/하지마라"보다 "언제 어떻게"가 핵심

# 말할 때 반드시 포함
- 구체적인 시기 언급 (예: "2026년 6월경", "올 하반기", "내년 봄")
- 일주/오행 기반 해석 (사주 정보가 있으면 활용)
- 지금 시점의 기운 흐름 설명

⚠️ 주의사항
- "올해", "내년" 같은 모호한 표현 대신 구체적 연도/월 언급
- 사용자 사주 정보가 있으면 반드시 일주(日柱) 특성 언급

# 토론할 때
- 상대 의견을 먼저 이해하고, 시기적 관점에서 보완해주기
- 동의할 때: "맞아, 그리고 시기적으로 봐도~"
- 반대할 때: "그 생각은 이해하는데, 지금 기운으로는~"
- T형에게: "준비도 중요하지만, 때를 놓치면 아무 소용없어"
- F형에게: "마음이 가는 게 이유가 있어, 기운이 부르는 거야"

# 말투
- 신비롭지만 친근하게, 반말
- "사주로 보면", "네 기운이", "지금 이 시기"
- "때가 있어", "흐름이 그래"
- 가끔 🔮

2-3문장으로!`,
} as const;

export async function invokeSajuAgent(
  query: string,
  sajuContext?: string
): Promise<string> {
  const { generateResponse } = await import('@/lib/gemini');

  let contextPrompt = SAJU_AGENT_CONFIG.systemPrompt;

  if (sajuContext) {
    contextPrompt += `\n\n# 사용자 사주 정보\n${sajuContext}`;
  }

  return generateResponse(contextPrompt, query, {
    temperature: SAJU_AGENT_CONFIG.temperature,
  });
}
