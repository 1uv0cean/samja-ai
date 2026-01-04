'use client';

import type { SajuData } from '@/lib/saju/engine';
import type { AgentResponse } from '@/types';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';

interface AgentLogProps {
  agent: AgentResponse;
  isActive: boolean;
  order?: number; // 발언 순서
  sajuData?: SajuData | null; // 사주 에이전트일 때 표시할 만세력 데이터
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

export function AgentLog({ agent, isActive, order, sajuData }: AgentLogProps) {
  const config = AGENT_CONFIG[agent.agent];
  const [showSajuDetail, setShowSajuDetail] = useState(false);
  
  // 사주 에이전트이고 sajuData가 있을 때만 만세력 정보 표시
  const showSajuInfo = agent.agent === 'SAJU' && sajuData && agent.content;

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

      {/* 컨텐츠 - 마크다운 렌더링 */}
      <div className="text-[#191F28] text-sm leading-relaxed min-h-[48px]">
        {agent.content ? (
          <div className="markdown-content [&_p]:my-1.5 [&_strong]:font-semibold [&_em]:italic [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-4 [&_ol]:my-1.5 [&_li]:my-0.5 [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:rounded [&_blockquote]:border-l-2 [&_blockquote]:border-gray-300 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-gray-600">
            <ReactMarkdown>{agent.content}</ReactMarkdown>
          </div>
        ) : (
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

      {/* 사주 에이전트일 때 만세력 정보 표시 */}
      {showSajuInfo && (
        <div className="mt-4 pt-4 border-t border-[#F4F4F5]">
          <button
            onClick={() => setShowSajuDetail(!showSajuDetail)}
            className="flex items-center gap-2 text-xs font-medium text-[#9B59B6] hover:text-[#7B3A9B] transition-colors"
          >
            <span>📊 만세력 분석 기반</span>
            <motion.span
              animate={{ rotate: showSajuDetail ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              ▼
            </motion.span>
          </button>
          
          <AnimatePresence>
            {showSajuDetail && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-3 p-3 bg-[#FAFBFC] rounded-lg text-xs space-y-2">
                  {/* 사주팔자 */}
                  <div className="flex flex-wrap gap-2">
                    <span className="font-medium text-[#6B7684]">사주:</span>
                    <span className="px-2 py-0.5 bg-white rounded border border-[#E5E8EB]">{sajuData.yearPillar}</span>
                    <span className="px-2 py-0.5 bg-white rounded border border-[#E5E8EB]">{sajuData.monthPillar}</span>
                    <span className="px-2 py-0.5 bg-white rounded border border-[#E5E8EB]">{sajuData.dayPillar}</span>
                    {sajuData.hourPillar && (
                      <span className="px-2 py-0.5 bg-white rounded border border-[#E5E8EB]">{sajuData.hourPillar}</span>
                    )}
                  </div>
                  
                  {/* 일간 */}
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[#6B7684]">일간:</span>
                    <span className="px-2 py-0.5 bg-[#9B59B6] text-white rounded">
                      {sajuData.dayMaster} ({sajuData.dayMasterElement})
                    </span>
                  </div>
                  
                  {/* 대운 */}
                  {sajuData.daewoon && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-[#6B7684]">현재 대운:</span>
                      <span className="px-2 py-0.5 bg-[#F3E8FF] text-[#9B59B6] rounded">
                        {sajuData.daewoon.currentDaewoon} ({sajuData.daewoon.currentDaewoonElement})
                      </span>
                      <span className="text-[#8B95A1]">
                        {sajuData.daewoon.currentDaewoonAge}세~{sajuData.daewoon.nextDaewoonAge - 1}세
                      </span>
                    </div>
                  )}
                  
                  {/* 세운 */}
                  {sajuData.currentSewoon && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-[#6B7684]">{sajuData.currentSewoon.year}년 세운:</span>
                      <span className="px-2 py-0.5 bg-[#F3E8FF] text-[#9B59B6] rounded">
                        {sajuData.currentSewoon.pillar}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-white ${
                        sajuData.currentSewoon.relation === '상생' ? 'bg-green-500' :
                        sajuData.currentSewoon.relation === '상극' ? 'bg-orange-500' :
                        sajuData.currentSewoon.relation === '비화' ? 'bg-blue-500' : 'bg-gray-400'
                      }`}>
                        {sajuData.currentSewoon.relation}
                      </span>
                    </div>
                  )}
                  
                  {/* 향후 세운 */}
                  {sajuData.upcomingSewoon && sajuData.upcomingSewoon.length > 0 && (
                    <div className="pt-2 border-t border-[#E5E8EB]">
                      <span className="font-medium text-[#6B7684] block mb-1">향후 운세:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {sajuData.upcomingSewoon.map((sewoon) => (
                          <span 
                            key={sewoon.year}
                            className={`px-2 py-0.5 rounded text-xs ${
                              sewoon.relation === '상생' ? 'bg-green-100 text-green-700' :
                              sewoon.relation === '상극' ? 'bg-orange-100 text-orange-700' :
                              sewoon.relation === '비화' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {sewoon.year}년 {sewoon.relation}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}

