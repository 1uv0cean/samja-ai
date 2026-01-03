'use client';

import type { AgentResponse } from '@/types';
import { motion } from 'framer-motion';

interface AgentLogProps {
  agent: AgentResponse;
  isActive: boolean;
}

const AGENT_CONFIG = {
  LOGIC: {
    name: '논리',
    color: 'from-blue-500 to-blue-700',
    borderColor: 'border-blue-500',
    icon: '🧠',
  },
  INSTINCT: {
    name: '본능',
    color: 'from-red-500 to-red-700',
    borderColor: 'border-red-500',
    icon: '🔥',
  },
  REALITY: {
    name: '현실',
    color: 'from-green-500 to-green-700',
    borderColor: 'border-green-500',
    icon: '💼',
  },
} as const;

export function AgentLog({ agent, isActive }: AgentLogProps) {
  const config = AGENT_CONFIG[agent.agent];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-lg border-2 ${config.borderColor} bg-black/80 p-4`}
    >
      {/* 에반게리온 스타일 헤더 */}
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${config.color}`} />
      
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">{config.icon}</span>
        <h3 className={`font-bold text-lg bg-gradient-to-r ${config.color} bg-clip-text text-transparent`}>
          {config.name}
        </h3>
        {agent.status === 'pending' && (
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="ml-auto text-xs text-gray-400"
          >
            분석 중...
          </motion.div>
        )}
      </div>

      {/* 타이핑 효과가 적용될 컨텐츠 영역 */}
      <div className="font-mono text-sm text-gray-200 min-h-[60px]">
        {agent.content || (
          <motion.span
            animate={{ opacity: [0, 1] }}
            transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse' }}
          >
            ▊
          </motion.span>
        )}
      </div>
    </motion.div>
  );
}
