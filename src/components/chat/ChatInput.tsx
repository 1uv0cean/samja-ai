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
      <div className="flex items-center gap-3 bg-[#F4F4F5] rounded-2xl p-2 pl-5">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="고민을 말해주세요..."
          disabled={isLoading}
          className="flex-1 bg-transparent text-[#191F28] placeholder-[#8B95A1] outline-none text-base py-2"
        />
        
        <motion.button
          type="submit"
          disabled={!query.trim() || isLoading}
          whileTap={{ scale: 0.95 }}
          className="px-5 py-3 bg-[#3182F6] text-white font-semibold rounded-xl
                     disabled:bg-[#E5E8EB] disabled:text-[#8B95A1] disabled:cursor-not-allowed
                     hover:bg-[#1B64DA] transition-colors"
        >
          {isLoading ? (
            <motion.span
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="flex items-center gap-2"
            >
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="31.4 31.4" />
              </svg>
              토론 중
            </motion.span>
          ) : (
            '조언 받기'
          )}
        </motion.button>
      </div>
    </form>
  );
}
