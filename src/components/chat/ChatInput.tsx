'use client';

import { motion } from 'framer-motion';
import { FormEvent, useState } from 'react';

interface ChatInputProps {
  onSubmit: (query: string) => void;
  isLoading: boolean;
}

export function ChatInput({ onSubmit, isLoading }: ChatInputProps) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim() && !isLoading) {
      onSubmit(query.trim());
      setQuery('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="relative overflow-hidden rounded-lg border-2 border-orange-500 bg-black/80">
        {/* 에반게리온 스타일 상단 바 */}
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-500 via-red-500 to-orange-500" />
        
        <div className="flex items-center gap-2 p-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="고민을 입력하세요..."
            disabled={isLoading}
            className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none font-mono"
          />
          
          <motion.button
            type="submit"
            disabled={!query.trim() || isLoading}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-6 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold rounded
                       disabled:opacity-50 disabled:cursor-not-allowed
                       shadow-lg shadow-orange-500/50"
          >
            {isLoading ? (
              <motion.span
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                분석 중...
              </motion.span>
            ) : (
              '심판 요청'
            )}
          </motion.button>
        </div>
      </div>
      
      {/* 스캔라인 효과 */}
      <motion.div
        animate={{ y: ['-100%', '100%'] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        className="absolute inset-0 bg-gradient-to-b from-transparent via-orange-500/5 to-transparent pointer-events-none"
      />
    </form>
  );
}
