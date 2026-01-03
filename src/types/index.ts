import type { BirthInfo, SajuData } from '@/lib/saju/engine';

export interface AgentResponse {
  agent: 'T' | 'F' | 'SAJU';
  content: string;
  status: 'pending' | 'completed';
}

export interface FinalVerdict {
  consensus: string;        // 공통으로 동의한 부분
  disagreement?: string;    // 가장 큰 이견 (새로 추가)
  keyPoints: string[];      // 각 상담사의 최종 입장 [T형, F형, 사주]
  recommendation: string;   // 사용자 선택 가이드
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
