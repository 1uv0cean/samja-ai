'use client';

import type { FinalVerdict } from '@/types';
import { motion } from 'framer-motion';

interface VerdictStampProps {
  verdict: FinalVerdict;
}

const VERDICT_CONFIG = {
  GRANTED: {
    text: '승인',
    color: 'text-green-500',
    borderColor: 'border-green-500',
    shadowColor: 'shadow-green-500/50',
    bgColor: 'bg-green-500/10',
  },
  DENIED: {
    text: '기각',
    color: 'text-red-500',
    borderColor: 'border-red-500',
    shadowColor: 'shadow-red-500/50',
    bgColor: 'bg-red-500/10',
  },
  HOLD: {
    text: '보류',
    color: 'text-yellow-500',
    borderColor: 'border-yellow-500',
    shadowColor: 'shadow-yellow-500/50',
    bgColor: 'bg-yellow-500/10',
  },
} as const;

export function VerdictStamp({ verdict }: VerdictStampProps) {
  const config = VERDICT_CONFIG[verdict.decision];

  return (
    <motion.div
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{
        type: 'spring',
        stiffness: 200,
        damping: 15,
        delay: 0.5,
      }}
      className="flex flex-col items-center gap-4"
    >
      {/* 도장 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className={`relative w-32 h-32 rounded-full border-4 ${config.borderColor} ${config.bgColor}
                    flex items-center justify-center shadow-2xl ${config.shadowColor}`}
      >
        {/* 인장 효과 */}
        <div className="absolute inset-2 rounded-full border-2 border-current opacity-30" />
        <span className={`text-4xl font-black ${config.color}`}>
          {config.text}
        </span>
        
        {/* 도장 찍는 효과 */}
        <motion.div
          initial={{ opacity: 0.8 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="absolute inset-0 bg-white rounded-full"
        />
      </motion.div>

      {/* 이유 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="text-center max-w-md"
      >
        <p className="text-gray-300 font-mono text-sm mb-2">{verdict.reason}</p>
        {verdict.winner && (
          <p className={`${config.color} font-bold`}>
            결정권자: {verdict.winner}
          </p>
        )}
      </motion.div>
    </motion.div>
  );
}
