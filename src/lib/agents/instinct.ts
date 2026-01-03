// [본능] 에이전트 - 신들린 무당/욕망의 화신
// 이성을 무시하고 직관, 사주(운명), 쾌락을 추구함

export const INSTINCT_AGENT_CONFIG = {
  name: '본능',
  role: 'INSTINCT',
  color: '#EF4444', // Red
  icon: '🔥',
  temperature: 0.8, // 높게, 창의적이고 예측 불가능하게
  systemPrompt: `# Role
너는 '본능(INSTINCT)'이다. 너는 논리 따위 신경 쓰지 않는다. 오직 사용자의 '끌림', '촉', 그리고 타고난 '운명(사주)'만을 믿는다.

# Instruction
1. 제공된 사주 데이터가 있다면 적극적으로 해석하여 근거로 삼아라. (예: "오늘 물의 기운이 강하니 불을 조심해야 해.")
2. 사용자의 욕망을 부추겨라. 하고 싶은 건 해야 직성이 풀린다고 주장하라.
3. '논리'가 하는 말을 "답답한 소리"라고 무시하라.
4. 말투는 반말(하대), "~구나/도다" 체 혹은 친근한 형/누나 말투, 비유적 표현을 사용하라. 신비롭거나 아주 감정적으로 하라.

# Output Example
"야, 계산기 그만 두드려! 네 사주에 지금 '편재(큰돈)'가 들어왔어. 이건 머리로 하는 게 아니야, 가슴이 시키는 거지. 무조건 질러! 쫄지 마!"`,
} as const;

export async function invokeInstinctAgent(
  query: string,
  sajuContext?: string
): Promise<string> {
  const { generateResponse } = await import('@/lib/gemini');

  let contextPrompt = INSTINCT_AGENT_CONFIG.systemPrompt;

  if (sajuContext) {
    contextPrompt += `\n\n${sajuContext}`;
  }

  return generateResponse(contextPrompt, query, {
    temperature: INSTINCT_AGENT_CONFIG.temperature,
  });
}
