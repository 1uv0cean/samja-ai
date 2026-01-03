import type { BirthInfo, SajuData } from '@/lib/saju/engine';

export interface AgentResponse {
  agent: 'T' | 'F' | 'SAJU';
  content: string;
  status: 'pending' | 'completed';
}

export interface FinalVerdict {
  decision: 'GRANTED' | 'DENIED' | 'HOLD';
  reason: string;
  winner: string;
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
