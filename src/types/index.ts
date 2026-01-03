import type { BirthInfo, SajuData } from '@/lib/saju/engine';

export interface AgentResponse {
  agent: 'T' | 'F' | 'SAJU';
  content: string;
  status: 'pending' | 'completed';
}

export interface FinalVerdict {
  consensus: string;        // 합의한 핵심 조언
  keyPoints: string[];      // 각 상담사의 핵심 조언 [T형, F형, 사주]
  recommendation: string;   // 종합적인 행동 가이드
}

export interface ConsultRequest {
  query: string;
  birthInfo?: BirthInfo;
  sajuData?: SajuData;
}

export interface ConsultResponse {
  agents: AgentResponse[];
  verdict: FinalVerdict;
}

// Re-export saju types for convenience
export type { BirthInfo, SajuData } from '@/lib/saju/engine';
