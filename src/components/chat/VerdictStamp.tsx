'use client';

import type { FinalVerdict } from '@/types';
import { motion } from 'framer-motion';

interface VerdictStampProps {
  verdict: FinalVerdict;
}

const AGENT_COLORS = {
  T: { color: '#3182F6', bgColor: '#E8F3FF', icon: '🧠', name: 'T형' },
  F: { color: '#FF6B9D', bgColor: '#FFE8F0', icon: '💗', name: 'F형' },
  SAJU: { color: '#9B59B6', bgColor: '#F3E8FF', icon: '🔮', name: '사주' },
} as const;

export function VerdictStamp({ verdict }: VerdictStampProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: 'spring',
        stiffness: 200,
        damping: 20,
        delay: 0.3,
      }}
      className="w-full max-w-md bg-white rounded-3xl p-6 shadow-lg"
    >
      {/* 헤더 */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.5 }}
        className="flex items-center justify-center gap-2 mb-5"
      >
        <span className="text-2xl">🤝</span>
        <h2 className="text-xl font-bold text-[#191F28]">합의 도달</h2>
      </motion.div>

      {/* 핵심 합의 내용 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="bg-gradient-to-r from-[#3182F6] to-[#6366F1] text-white rounded-2xl p-4 mb-5"
      >
        <p className="text-sm font-medium opacity-80 mb-1">💡 핵심 합의</p>
        <p className="text-base leading-relaxed font-medium">
          {verdict.consensus}
        </p>
      </motion.div>

      {/* 각 상담사 핵심 조언 */}
      {verdict.keyPoints && verdict.keyPoints.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="space-y-2 mb-5"
        >
          {verdict.keyPoints.map((point, index) => {
            const agentKey = index === 0 ? 'T' : index === 1 ? 'F' : 'SAJU';
            const agent = AGENT_COLORS[agentKey];
            return (
              <div 
                key={index}
                className="flex items-start gap-3 p-3 rounded-xl"
                style={{ backgroundColor: agent.bgColor }}
              >
                <span className="text-lg">{agent.icon}</span>
                <div className="flex-1">
                  <span 
                    className="text-xs font-semibold"
                    style={{ color: agent.color }}
                  >
                    {agent.name}
                  </span>
                  <p className="text-sm text-[#191F28] leading-relaxed">
                    {point}
                  </p>
                </div>
              </div>
            );
          })}
        </motion.div>
      )}

      {/* 종합 추천 */}
      {verdict.recommendation && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="bg-[#F4F4F5] rounded-2xl p-4"
        >
          <p className="text-xs font-medium text-[#6B7684] mb-2">📋 행동 가이드</p>
          <p className="text-sm text-[#191F28] leading-relaxed">
            {verdict.recommendation}
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}
