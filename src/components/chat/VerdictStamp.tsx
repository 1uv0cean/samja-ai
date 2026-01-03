'use client';

import type { FinalVerdict } from '@/types';
import { motion } from 'framer-motion';

interface VerdictStampProps {
  verdict: FinalVerdict;
}

const VERDICT_CONFIG = {
  GRANTED: {
    text: '승인',
    emoji: '✅',
    color: '#00C851',
    bgColor: '#E8FFF0',
    description: '해도 좋습니다',
  },
  DENIED: {
    text: '기각',
    emoji: '❌',
    color: '#FF5252',
    bgColor: '#FFEBEE',
    description: '하지 마세요',
  },
  HOLD: {
    text: '보류',
    emoji: '⏸️',
    color: '#FFB300',
    bgColor: '#FFF8E1',
    description: '조금 더 고민해보세요',
  },
} as const;

export function VerdictStamp({ verdict }: VerdictStampProps) {
  const config = VERDICT_CONFIG[verdict.decision];

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
      className="w-full max-w-md bg-white rounded-3xl p-8 shadow-lg text-center"
    >
      {/* 결과 아이콘 & 텍스트 */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.5 }}
        className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-4xl"
        style={{ backgroundColor: config.bgColor }}
      >
        {config.emoji}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
      >
        <h2 
          className="text-3xl font-bold mb-1"
          style={{ color: config.color }}
        >
          {config.text}
        </h2>
        <p className="text-[#8B95A1] text-sm mb-6">{config.description}</p>
      </motion.div>

      {/* 이유 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className="bg-[#F4F4F5] rounded-2xl p-5"
      >
        <p className="text-[#191F28] text-sm leading-relaxed">
          {verdict.reason}
        </p>
        {verdict.winner && (
          <p 
            className="mt-3 text-sm font-medium"
            style={{ color: config.color }}
          >
            결정권자: {verdict.winner}
          </p>
        )}
      </motion.div>
    </motion.div>
  );
}
