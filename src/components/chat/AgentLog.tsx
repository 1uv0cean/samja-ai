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
    color: '#3182F6',
    bgColor: '#E8F3FF',
    icon: '🧠',
    description: '분석적 사고',
  },
  INSTINCT: {
    name: '본능',
    color: '#FF6B6B',
    bgColor: '#FFEBEE',
    icon: '🔥',
    description: '직관적 판단',
  },
  REALITY: {
    name: '현실',
    color: '#00C851',
    bgColor: '#E8FFF0',
    icon: '💼',
    description: '현실적 조언',
  },
} as const;

export function AgentLog({ agent, isActive }: AgentLogProps) {
  const config = AGENT_CONFIG[agent.agent];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl p-5 shadow-sm"
    >
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-4">
        <div 
          className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
          style={{ backgroundColor: config.bgColor }}
        >
          {config.icon}
        </div>
        <div className="flex-1">
          <h3 
            className="font-semibold text-base"
            style={{ color: config.color }}
          >
            {config.name}
          </h3>
          <p className="text-xs text-[#8B95A1]">{config.description}</p>
        </div>
        {agent.status === 'pending' && (
          <motion.div
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.2, repeat: Infinity }}
            className="px-3 py-1 rounded-full text-xs font-medium"
            style={{ backgroundColor: config.bgColor, color: config.color }}
          >
            분석 중
          </motion.div>
        )}
      </div>

      {/* 컨텐츠 */}
      <div className="text-[#191F28] text-sm leading-relaxed min-h-[48px]">
        {agent.content || (
          <div className="flex items-center gap-1.5 text-[#8B95A1]">
            <motion.span
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              ●
            </motion.span>
            <motion.span
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
            >
              ●
            </motion.span>
            <motion.span
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
            >
              ●
            </motion.span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
