'use client';

import type { AgentResponse } from '@/types';
import { motion } from 'framer-motion';

interface AgentLogProps {
  agent: AgentResponse;
  isActive: boolean;
  order?: number; // 발언 순서
}

const AGENT_CONFIG = {
  T: {
    name: 'T형',
    subtitle: '논리로 따져보는',
    color: '#3182F6',
    bgColor: '#E8F3FF',
    icon: '🧠',
  },
  F: {
    name: 'F형',
    subtitle: '마음으로 느끼는',
    color: '#FF6B9D',
    bgColor: '#FFE8F0',
    icon: '💗',
  },
  SAJU: {
    name: '사주',
    subtitle: '운으로 읽어보는',
    color: '#9B59B6',
    bgColor: '#F3E8FF',
    icon: '🔮',
  },
} as const;

export function AgentLog({ agent, isActive, order }: AgentLogProps) {
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
          className="w-10 h-10 rounded-full flex items-center justify-center text-xl relative"
          style={{ backgroundColor: config.bgColor }}
        >
          {config.icon}
          {/* 발언 순서 뱃지 */}
          {order !== undefined && agent.content && (
            <div 
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
              style={{ backgroundColor: config.color }}
            >
              {order}
            </div>
          )}
        </div>
        <div className="flex-1">
          <h3 
            className="font-semibold text-base"
            style={{ color: config.color }}
          >
            {config.name}
          </h3>
          <p className="text-xs text-[#8B95A1]">{config.subtitle}</p>
        </div>
        {agent.status === 'pending' && (
          <motion.div
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.2, repeat: Infinity }}
            className="px-3 py-1 rounded-full text-xs font-medium"
            style={{ backgroundColor: config.bgColor, color: config.color }}
          >
            생각 중...
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
